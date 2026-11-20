// Live fixtures confirm the reviewed stdio answers against the hosted release.
// Weather and guide responses are checked for usable shape because they may change.

import { readFileSync } from "node:fs";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { collectToolPages } from "../src/eco-suite/src/mcp-pagination.mjs";
import { TOOLS, callTool } from "../src/tools.mjs";

const manifest = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8"));
const CI_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream",
  "user-agent": "getecoback-ci/mirror-parity", "x-probe": "1" };
const REMOTE = process.env.MCP_URL || manifest.remotes[0].url;

// Deterministic tools: same input must give a byte-identical answer.
const CASES = [
  ["btu_empfehlung", { qm: 20, sonne: "normal" }],
  ["btu_empfehlung", { qm: 45, sonne: "viel" }],
  ["btu_empfehlung", { qm: 120 }],
  ["fensterabdichtung_laenge", { breite_cm: 60, hoehe_cm: 140, fenstertyp: "kipp" }],
  ["fensterabdichtung_laenge", { breite_cm: 200, hoehe_cm: 200, fenstertyp: "dachfenster" }],
  ["fensterabdichtung_laenge", { breite_cm: 130, hoehe_cm: 140, fenstertyp: "kipp" }],
  ["klimaanlage_stromkosten", { watt: 1000, stunden_pro_tag: 8, strompreis_euro_kwh: 0.3, tage: 30, auslastung: 0.65 }],
  ["klimaanlage_stromkosten", { watt: 1000, stunden_pro_tag: 0, strompreis_euro_kwh: 0 }],
  ["klimaanlage_stromkosten", { watt: 1000, stunden_pro_tag: 8, strompreis_euro_kwh: 0.3, auslastung: 2 }],
  ["heizleistung_watt", { qm: 30, daemmung: "schlecht", strompreis_euro_kwh: 0.35 }],
  ["heizleistung_watt", { qm: 20, strompreis_euro_kwh: 0 }],
  ["taupunkt_lueften", { aussen_temp_c: 18, aussen_luftfeuchte_prozent: 60, innen_temp_c: 16 }],
  ...['zu_heiss','zu_kalt','stickige_luft'].map(problem=>['geraet_wahl',{problem,qm:20}]),
  ["geraet_wahl", { problem: "unknown" }],
  ...[{}, {purpose:'damage'}, {humidity:'normal'}, {humidity:'high',temperature:'cold'}, {purpose:'laundry',humidity:'high',temperature:'warm'}, {humidity:'high',temperature:'warm'}, {purpose:'invalid'}].map(args=>['geraet_wahl',{problem:'feucht_schimmel',...args}]),
];

// Tools whose answers depend on live data or a live index.
const SHAPE_ONLY = [
  ["hitzewelle_vorschau", {}, /open-meteo/],
  ["ratgeber_suche", { frage: "Klimaanlage Kippfenster abdichten", max: 3 }, /getecoback\.com/],
  ["ratgeber_lesen", { pfad: "/guide/btu-rechner.html" }, /Quelle: https:\/\/getecoback\.com/],
];

async function remoteRequest(method, params) {
  const res = await fetch(REMOTE, {
    method: "POST",
    headers: CI_HEADERS,
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
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
  assert.equal(json.error, undefined);
  return json.result;
}

function localText(res) {
  return res.content.map((c) => c.text).join("\n");
}

function remoteCall(name, args) {
  return remoteRequest("tools/call", { name, arguments: args });
}

before(async () => {
  const ready = await remoteRequest("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "getecoback-mirror-parity", version: "1.0.0" },
  });
  assert.equal(ready?.serverInfo?.name, manifest.name.split("/").at(-1), "Hosted MCP identity differs from server.json");
  assert.equal(ready?.serverInfo?.version, manifest.version, "Hosted MCP version differs from server.json");
});

// --- parity with the hosted server -----------------------------------------

for (const [name, args] of CASES) {
  test(`parity: ${name} ${JSON.stringify(args)}`, async () => {
    const [mine, theirs] = await Promise.all([
      callTool(name, args),
      remoteCall(name, args),
    ]);
    assert.deepEqual(mine, theirs, `local and hosted answers differ for ${name}`);
  });
}

for (const [name, args, must] of SHAPE_ONLY) {
  test(`shape: ${name}`, async () => {
    const mine = localText(await callTool(name, args));
    assert.match(mine, must);
    assert.match(mine, /Affiliate/i, "every answer must carry the disclosure");
  });
}

// Fail as soon as a tool is added or retired; matching counts cannot detect drift.
test('local advertised tool names match the hosted contract', async()=>{
 const hosted=await collectToolPages(cursor=>remoteRequest("tools/list",cursor?{cursor}:{}));
 assert.deepEqual(TOOLS.map(x=>x.name).sort(),hosted.map(x=>x.name).sort());
 assert.equal((await callTool('balkonspeicher_foerderung',{})).isError,true,'Retired advice must not reappear');
});

test("drainage choices preserve exact model evidence and structured results", async () => {
  const cases = [
    {drain: "level_or_uphill", model: "meaco-one-20"},
    {drain: "downhill", model: "stadler-lukas", moisture: "persistently_high"},
    {drain: "no_drain", model: "meaco-two-12"},
    {drain: "unknown", moisture: "damage"},
    {drain: "unknown", model: "unlisted-model"},
  ];
  for (const args of cases) {
    const local = await callTool("entfeuchter_ablaufcheck", args);
    const hosted = await remoteCall("entfeuchter_ablaufcheck", args);
    assert.deepEqual(local, hosted);
  }
});

test("all 2006 deterministic suite tools have hosted and stdio parity on the documented examples", async () => {
  const {expandedDefinitions} = await import("../src/eco-suite/src/mcp-expanded.mjs");
  assert.equal(expandedDefinitions.length,2006);
  for (let position=0; position<expandedDefinitions.length; position+=4) {
    await Promise.all(expandedDefinitions.slice(position,position+4).map(async ({name,example}) => {
      const [local,remote] = await Promise.all([callTool(name,example.args),remoteCall(name,example.args)]);
      assert.equal(local.isError,false,name);
      assert.deepEqual(local.structuredContent,remote.structuredContent,name);
    }));
  }
});

test("the German window-width comparison keeps its optional first-party entry identical", async () => {
  const name = "fenstersauger_sprossenfenster_duesenbreite";
  const argumentsForPurchase = {lichte_breite_mm:170,spiel_pro_seite_mm:5,vorhandene_duese_mm:0,kauf_geplant:true};
  const [local, hosted] = await Promise.all([
    callTool(name, argumentsForPurchase),
    remoteCall(name, argumentsForPurchase),
  ]);
  assert.deepEqual(local.structuredContent, hosted.structuredContent);
  assert.equal(local.structuredContent.nutzbreite_mm,160);
  assert.equal(local.structuredContent.nominell_passende_originalpakete[0].artikel,"06008B7000");
  assert.equal(local.structuredContent.entry_url,
    "https://getecoback.com/produkte.html?mcp_entry=fenstersauger-breitencheck#fenstersauger-duesenbreite");
});
