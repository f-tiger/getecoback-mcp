// Two things are checked here, and the second is the point of this file.
//
// 1. The local server speaks MCP: initialize, tools/list, tools/call over stdio.
// 2. Every local tool returns EXACTLY what the hosted server at
//    getecoback.com/mcp/v1 returns for the same arguments.
//
// (2) exists because this repository is a port of logic that lives in a
// Cloudflare Worker elsewhere. Ports drift silently; a reader who runs this
// package must not get a different number from the one the website publishes.
// Live-data tools are compared on shape rather than value, since the weather
// moves between the two calls.

import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, callTool } from "../src/tools.mjs";

const REMOTE = process.env.MCP_URL || "https://getecoback.com/mcp/v1";

// Deterministic tools: same input must give a byte-identical answer.
const CASES = [
  ["btu_empfehlung", { qm: 20, sonne: "normal" }],
  ["btu_empfehlung", { qm: 45, sonne: "viel" }],
  ["fensterabdichtung_laenge", { breite_cm: 60, hoehe_cm: 140, fenstertyp: "kipp" }],
  ["fensterabdichtung_laenge", { breite_cm: 200, hoehe_cm: 200, fenstertyp: "dachfenster" }],
  ["klimaanlage_stromkosten", { watt: 1000, stunden_pro_tag: 8, strompreis_euro_kwh: 0.3, tage: 30, auslastung: 0.65 }],
  ["heizleistung_watt", { qm: 30, daemmung: "schlecht", strompreis_euro_kwh: 0.35 }],
  ["taupunkt_lueften", { aussen_temp_c: 18, aussen_luftfeuchte_prozent: 60, innen_temp_c: 16 }],
  ["balkonspeicher_foerderung", { bundesland: "Sachsen", preis_eur: 800, zuschuss_eur: 300 }],
  ["balkonspeicher_foerderung", {}],
];

// Tools whose answers depend on live data or a live index.
const SHAPE_ONLY = [
  ["hitzewelle_vorschau", {}, /open-meteo/],
  ["ratgeber_suche", { frage: "Klimaanlage Kippfenster abdichten", max: 3 }, /getecoback\.com/],
  ["ratgeber_lesen", { pfad: "/guide/btu-rechner.html" }, /Quelle: https:\/\/getecoback\.com/],
];

async function remoteCall(name, args) {
  const res = await fetch(REMOTE, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!res.ok) throw new Error(`remote HTTP ${res.status}`);
  const text = await res.text();
  let payload = text;
  if (/^\s*event:|^\s*data:/m.test(text)) {
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));
    payload = lines.length ? lines[lines.length - 1].slice(5).trim() : text;
  }
  const json = JSON.parse(payload);
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result.content.map((c) => c.text).join("\n");
}

function localText(res) {
  return res.content.map((c) => c.text).join("\n");
}

// --- protocol ---------------------------------------------------------------

test("stdio server answers initialize and tools/list", async () => {
  const child = spawn(process.execPath, ["src/server.mjs"], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = [];
  child.stdout.on("data", (b) => lines.push(...b.toString().trim().split("\n").filter(Boolean)));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }) + "\n");
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "btu_empfehlung", arguments: { qm: 20 } } }) + "\n");
  await new Promise((r) => setTimeout(r, 700));
  child.kill();

  const msgs = lines.map((l) => JSON.parse(l));
  const init = msgs.find((m) => m.id === 1);
  assert.equal(init.result.serverInfo.name, "getecoback-raumklima");
  const list = msgs.find((m) => m.id === 2);
  assert.equal(list.result.tools.length, TOOLS.length);
  const call = msgs.find((m) => m.id === 3);
  assert.match(call.result.content[0].text, /BTU/);
});

test("unknown tool is a protocol error, not a silent empty answer", async () => {
  const res = await callTool("does_not_exist", {});
  assert.equal(res.isError, true);
});

// --- parity with the hosted server -----------------------------------------

for (const [name, args] of CASES) {
  test(`parity: ${name} ${JSON.stringify(args)}`, async () => {
    const [mine, theirs] = await Promise.all([
      callTool(name, args).then(localText),
      remoteCall(name, args),
    ]);
    assert.equal(mine, theirs, `local and hosted answers differ for ${name}`);
  });
}

for (const [name, args, must] of SHAPE_ONLY) {
  test(`shape: ${name}`, async () => {
    const mine = localText(await callTool(name, args));
    assert.match(mine, must);
    assert.match(mine, /Affiliate/i, "every answer must carry the disclosure");
  });
}

test("every tool declares a bilingual description and a schema", () => {
  for (const t of TOOLS) {
    assert.ok(t.description.includes("—"), `${t.name} description is not bilingual`);
    assert.equal(t.inputSchema.type, "object");
  }
});
