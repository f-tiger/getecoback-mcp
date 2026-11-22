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
  ...[
    ["WV 2 Plus Multi Edition","2.633-112.0","komplette_saugduese"],
    ["WV 3 Comfort Precision+ Black","2.633-605.0","komplette_saugduese"],
    ["WV 8 Signature Line","2.633-532.0","komplette_saugduese"],
    ["WV 6 Plus","2.633-512.0","komplette_saugduese"],
    ["WV 8 Signature Line","2.633-112.0","komplette_saugduese"],
    ["unbekannt","2.633-532.0","komplette_saugduese"],
    ["WV 8 Signature Line","unbekannt","nur_abziehlippe"],
  ].map(([geraet, teilenummer, angebotsart]) => ["fenstersauger_170mm_saugduese_geraetezuordnung", { geraet, teilenummer, angebotsart }]),
  ...[
    ["EP2220/10", "AquaClean"], ["EP2231/40", "TCZ7003"],
    ["TIE20301", "TCZ7033"], ["ECAM22.110.B", "DLSC002"],
    ["anderes_modell", "AquaClean"], ["EP2220", "AquaClean"],
    ["EP2220/10", "CA6903/10"], ["EP2231/40", "CA6903/10"], ["TIE20301", "CA6903/10"],
  ].map(([modell, filter]) => ["kaffeevollautomat_intenza_aquaclean_filterfamilie_modellpruefung", { modell, filter }]),
  ...[
    {},
    { temperatur_c: 20, luftfeuchte_prozent: 60 },
    { temperatur_c: 10, luftfeuchte_prozent: 60 },
    { temperatur_c: 4.99 },
    { modell: "abweichend_oder_offen" },
    { luftfeuchte_prozent: 101 },
  ].map(changes => ["trotec_ttk75_eco_pruefpunkt", {
    modell: "ttk_75_eco", temperatur_c: 30, luftfeuchte_prozent: 80, ...changes,
  }]),
  ...[
    { groesse_a: "schalldruck", groesse_b: "schallleistung" },
    { groesse_a: "schallleistung", groesse_b: "schallleistung" },
    { groesse_a: "schalldruck", groesse_b: "schalldruck", gleiche_bedingungen: false },
    { groesse_a: "unbekannt", groesse_b: "unbekannt" },
  ].map(changes => ["klimaanlage_geraeusch_vergleich", {
    pegel_a_dba: 52, pegel_b_dba: 64, gleiche_bedingungen: true, ...changes,
  }]),
  ...[
    { spalt_min_mm: 4, spalt_max_mm: 4 },
    { spalt_min_mm: 3, spalt_max_mm: 3.5 },
    { dichtungsart: "nutdichtung", spalt_min_mm: 4, spalt_max_mm: 4 },
    { dichtungsart: "zusatzdichtung", spalt_min_mm: 4, spalt_max_mm: 4 },
    { spalt_min_mm: 0, spalt_max_mm: 4 },
    { spalt_min_mm: 5, spalt_max_mm: 2 },
  ].map(changes => ["tesamoll_fensterdichtung_profil_pruefen", {
    dichtungsart: "tesamoll_klebeprofil", ...changes,
  }]),
  ...[
    { falzbreite_mm: 60, falzhoehe_mm: 0 },
    { falzbreite_mm: 45, falzhoehe_mm: 20 },
    { messbezug: "dichtung_oder_unklar" },
    { angebot_ean: 0 },
    { fenster: "anders_oder_offen" },
    { angebot_ean: 123456789012 },
  ].map(changes => ["midea_portasplit_fensterfalz_pruefen", {
    angebot_ean: 4048164116478, halterung: "original_standard", fenster: "nach_innen_oeffnend",
    messbezug: "falz_nach_zeichnung", falzbreite_mm: 35, falzhoehe_mm: 25, ...changes,
  }]),
  ["pac_n90_ean_abgleichen", { ean: 8004399512351, modell: "PAC N90 ECO Silent" }],
  ["pac_n90_ean_abgleichen", { ean: 8004399512351, modell: "abweichend" }],
  ["pac_n90_ean_abgleichen", { ean: 8004399512351, modell: "unbekannt" }],
  ["pac_n90_ean_abgleichen", { ean: 8004399512352, modell: "PAC N90 ECO Silent" }],
  ["pac_n90_ean_abgleichen", { ean: 0, modell: "PAC N90 ECO Silent" }],
  ["pac_n90_ean_abgleichen", { ean: 8004399512351.5, modell: "PAC N90 ECO Silent" }],
  ["heizdecke_stromkosten_nennleistung", { nennleistung_w: 110, laufzeit_h: 2, arbeitspreis_kwh: 0.35, nutzungstage: 30 }],
  ["heizdecke_stromkosten_nennleistung", { nennleistung_w: 110, laufzeit_h: 2 }],
  ["heizdecke_stromkosten_nennleistung", { nennleistung_w: 110, laufzeit_h: 2, arbeitspreis_kwh: 0.35, nutzungstage: 4.5 }],
  ["hygrometer_messbereiche", { reading_a_pct: 55, accuracy_a_pp: 3, reading_b_pct: 60, accuracy_b_pp: 3 }],
  ["hygrometer_messbereiche", { reading_a_pct: 55.1, accuracy_a_pp: 2.5, reading_b_pct: 60.2, accuracy_b_pp: 2.6 }],
  ["hygrometer_messbereiche", { reading_a_pct: 60.2, accuracy_a_pp: 2.6, reading_b_pct: 55.1, accuracy_b_pp: 2.5 }],
  ["hygrometer_messbereiche", { reading_a_pct: 55, accuracy_a_pp: 3, reading_b_pct: 60 }],
  ["luftreiniger_ersatzfilter_zuordnung", { model: "beurer-lr401" }],
  ["luftreiniger_ersatzfilter_zuordnung", { model: "levoit-core-300s" }],
  ["luftreiniger_ersatzfilter_zuordnung", { model: "levoit-core-300s-p" }],
  ["philips_verdunsterfilter_zuordnung", { model: "HU4803/01", candidate: "FY2401/30" }],
  ["philips_verdunsterfilter_zuordnung", { model: "HU2716/10", candidate: "FY2401/30" }],
  ["philips_verdunsterfilter_zuordnung", { model: "unknown", candidate: "FY2401/30" }],
  ["keller_lueften_taupunkt_messwerte", { aussen_c: 10, aussen_rh_prozent: 80, innen_c: 17, innen_rh_prozent: 65, wand_c: 7 }],
  ["keller_lueften_taupunkt_messwerte", { aussen_c: 10, aussen_rh_prozent: 80, innen_c: 17, innen_rh_prozent: 65, wand_c: 15 }],
  ["keller_lueften_taupunkt_messwerte", { aussen_c: 10, aussen_rh_prozent: 80, innen_c: 17, wand_c: 15 }],
  ["luftentfeuchter_waesche_einzelkosten", { method: "estimate", watts: 200, hours: 6, price: 0.35 }],
  ["luftentfeuchter_waesche_einzelkosten", { method: "estimate", watts: 200, hours: 6, dehum: 1.8, price: 0.35 }],
  ["fritz_302_danfoss_adapter", { artikelnummer: "20003120", ventil: "danfoss-ravl" }],
  ["fritz_302_danfoss_adapter", { artikelnummer: "andere_oder_unbekannt", ventil: "danfoss-ra" }],
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
    {drain: "level_or_uphill", model: "meaco-two-12", moisture: "normal"},
    {drain: "level_or_uphill", model: "stadler-lukas"},
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

test("all 2019 deterministic suite tools have hosted and stdio parity on the documented examples", async () => {
  const {expandedDefinitions} = await import("../src/eco-suite/src/mcp-expanded.mjs");
  assert.equal(expandedDefinitions.length,2019);
  for (let position=0; position<expandedDefinitions.length; position+=4) {
    await Promise.all(expandedDefinitions.slice(position,position+4).map(async ({name,example}) => {
      const [local,remote] = await Promise.all([callTool(name,example.args),remoteCall(name,example.args)]);
      assert.equal(local.isError,false,name);
      assert.deepEqual(local.structuredContent,remote.structuredContent,name);
    }));
  }
});

test('the German PAC N90 label and full-run electricity measurement agree between hosted and stdio', async () => {
  const name = 'pac_n90_energielabel_zu_stromkosten';
  const input = {ean:8004399512351,modell:'PAC N90 ECO Silent',arbeitspreis_eur_kwh:0.30,
    messung_vollstaendig:true,messenergie_kwh:1.2,messdauer_min:90};
  for (const change of [{}, {ean:0}, {ean:8004399512352}, {modell:'abweichend'}, {modell:'unbekannt'},
    {arbeitspreis_eur_kwh:-1}, {arbeitspreis_eur_kwh:-0.5}, {messung_vollstaendig:false},
    {messdauer_min:0}, {messdauer_min:90.5}, {messenergie_kwh:0}]) {
    const args = {...input,...change};
    const [local, hosted] = await Promise.all([callTool(name,args),remoteCall(name,args)]);
    assert.deepEqual(local,hosted);
  }
});

test('the German tado X Oventrop adapter check agrees with the hosted source', async () => {
  const name = 'tado_x_oventrop_ventiladapter_pruefen';
  const input = {ventilmodell:'unidh',gewinde:'m30_1_0',ventilzustand:'thermostatisch_unauffaellig'};
  for (const change of [{}, {ventilmodell:'unil'}, {ventilmodell:'vindo_th',gewinde:'m30_1_5'},
    {gewinde:'m30_1_5'}, {gewinde:'unbekannt'}, {ventilmodell:'anders_oder_unbekannt'},
    {ventilzustand:'manuell'}, {ventilzustand:'beschaedigt_oder_undicht'}, {ventilzustand:'unbekannt'}]) {
    const args = {...input,...change};
    const [local, hosted] = await Promise.all([callTool(name,args),remoteCall(name,args)]);
    assert.deepEqual(local, hosted);
  }
});

test('the German mixed laundry inputs and decisions agree between hosted and stdio', async () => {
  const name = 'waesche_trocknungswechsel_kaufschwelle';
  const input = {ladungen_saison:100,ladungen_ersetzbar:60,trockner_kwh:1.4,entfeuchter_kwh:0.6,
    tarif_eur_kwh:0.35,anschaffung_eur:100,ladungen_vergleichbar:true,zusatzstrom_erfasst:true};
  for (const changes of [{}, {zusatzstrom_erfasst:false}, {entfeuchter_kwh:2}, {anschaffung_eur:0}, {ladungen_ersetzbar:101}]) {
    const args = {...input, ...changes};
    const [local, hosted] = await Promise.all([callTool(name, args),remoteCall(name, args)]);
    assert.deepEqual(local, hosted);
  }
});

test('the exact cellar conditions and manufacturer evidence agree between hosted and stdio', async () => {
  const name = 'kellerentfeuchter_pruefpunkt_abgleichen';
  const input = {modell:'meaco-one-20',temperatur_c:10,relative_feuchte_pct:60,wiederholt_gemessen:true,befund:'feuchte_auffaellig'};
  for (const change of [{}, {temperatur_c:20}, {temperatur_c:15}, {relative_feuchte_pct:59}, {modell:'comfee-mddf20'},
    {wiederholt_gemessen:false}, {befund:'unauffaellig'}, {befund:'wassereintritt_oder_schaden'}]) {
    const args = {...input,...change};
    const [local, hosted] = await Promise.all([callTool(name,args),remoteCall(name,args)]);
    assert.deepEqual(local, hosted);
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
