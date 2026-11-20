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
import {once} from "node:events";
import {createInterface} from "node:readline";
import { test } from "node:test";
import assert from "node:assert/strict";
import {MCP_PAGE_SIZE,collectToolPages} from '../src/eco-suite/src/mcp-pagination.mjs';
import { TOOLS, callTool } from "../src/tools.mjs";

const CI_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream", "user-agent": "getecoback-ci/mirror-parity" };
const REMOTE = process.env.MCP_URL || "https://getecoback.com/mcp/v1";

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

async function remoteCall(name, args) {
  const res = await fetch(REMOTE, {
    method: "POST",
    headers: CI_HEADERS,
    signal: AbortSignal.timeout(20000),
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
  assert.equal(json.error, undefined);
  return json.result;
}

function localText(res) {
  return res.content.map((c) => c.text).join("\n");
}

// --- protocol ---------------------------------------------------------------

test("stdio server answers initialize and tools/list", {timeout: 10000}, async () => {
  const child = spawn(process.execPath, ["src/server.mjs"], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = [];
  const reader = createInterface({input:child.stdout});
  reader.on("line", line => lines.push(line));
  const exited = once(child,"close");
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }) + "\n");
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "btu_empfehlung", arguments: { qm: 20 } } }) + "\n");
  const pageOffsets = Array.from({length:Math.ceil(TOOLS.length/MCP_PAGE_SIZE)},(_,i)=>i*MCP_PAGE_SIZE);
  const pageIds = [2];
  for (const offset of pageOffsets.slice(1)) {
    const id = 3 + offset/MCP_PAGE_SIZE;
    pageIds.push(id);
    child.stdin.write(JSON.stringify({jsonrpc:"2.0",id,method:"tools/list",params:{cursor:"1.14.0:"+offset}})+"\n");
  }
  child.stdin.end();
  const [status] = await exited;
  assert.equal(status,0);

  const msgs = lines.map((l) => JSON.parse(l));
  const init = msgs.find((m) => m.id === 1);
  assert.equal(init.result.serverInfo.name, "getecoback-raumklima");
  const catalogue = await collectToolPages(async cursor => {
    const index = cursor === undefined ? 0 : pageOffsets.indexOf(Number(cursor.split(':').at(-1)));
    assert.ok(index >= 0);
    return msgs.find(item=>item.id===pageIds[index]).result;
  });
  assert.equal(catalogue.length,1580);
  assert.deepEqual(catalogue.map(t=>t.name),TOOLS.map(t=>t.name));
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

test("every tool declares a bilingual description and a schema", () => {
  for (const t of TOOLS) {
    assert.ok(t.description.includes("—"), `${t.name} description is not bilingual`);
    assert.equal(t.inputSchema.type, "object");
  }
});

// Fail as soon as a tool is added or retired; matching counts cannot detect drift.
test('local advertised tool names match the hosted contract', async()=>{
 const hosted=await collectToolPages(async cursor=>{
   const res=await fetch(REMOTE,{method:'POST',headers:CI_HEADERS,signal:AbortSignal.timeout(20000),
     body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:cursor?{cursor}:{}})});
   assert.equal(res.status,200);
   const data=await res.json();
   assert.equal(data.error,undefined);
   return data.result;
 });
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

test("all 1570 deterministic suite tools have hosted and stdio parity on the documented examples", async () => {
  const {expandedDefinitions} = await import("../src/eco-suite/src/mcp-expanded.mjs");
  assert.equal(expandedDefinitions.length,1570);
  for (let position=0; position<expandedDefinitions.length; position+=4) {
    await Promise.all(expandedDefinitions.slice(position,position+4).map(async ({name,example}) => {
      const [local,remote] = await Promise.all([callTool(name,example.args),remoteCall(name,example.args)]);
      assert.equal(local.isError,false,name);
      assert.deepEqual(local.structuredContent,remote.structuredContent,name);
    }));
  }
});
