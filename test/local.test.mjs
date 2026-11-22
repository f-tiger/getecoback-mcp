import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { expandedDefinitions } from '../src/eco-suite/src/mcp-expanded.mjs';
import { collectToolPages, MCP_PAGE_SIZE, pageTools } from '../src/eco-suite/src/mcp-pagination.mjs';
import { callTool, TOOLS } from '../src/tools.mjs';
import { findTools, runReviewedExample } from '../src/find-tools.mjs';
import { findCatalogueTools, indexCatalogue } from '../src/eco-suite/site/assets/mcp-catalog-search.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const server = fileURLToPath(new URL('../src/server.mjs', import.meta.url));
const finder = fileURLToPath(new URL('../src/find-tools.mjs', import.meta.url));
const cellarUri = 'ecoback://evidence/de/kellerentfeuchter';
const bracketTool = 'midea_portasplit_fensterhalterung_pruefen';
const bracketCitation = 'https://getecoback.com/guide/midea-portasplit-ausverkauft-alternativen.html';
const bracketGuide = bracketCitation + '#kaufpruefung';
const bracketEntry = bracketCitation + '?mcp_entry=portasplit-fensterhalterung#kaufpruefung';
const laundryTool = 'waesche_trocknungswechsel_kaufschwelle';
const laundryCitation = 'https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html';
const roofWithoutBracket = {
  angebot_ean:4048164116478,
  fenster:'dachfenster',
  standardhalterung:'im_angebot',
  universalhalterung:'fehlt',
};

test('offline lookup preserves every exact name and input schema', () => {
  for (const {name, inputSchema} of TOOLS) {
    const result = findTools(name);
    assert.equal(result.totalMatches, 1, name);
    assert.equal(result.tools[0].name, name);
    assert.deepEqual(result.tools[0].inputSchema, inputSchema, name);
  }
});

test('both stdio profiles find and evaluate the exact German N90 label offline', () => {
  const name = 'pac_n90_energielabel_zu_stromkosten';
  const cite = 'https://getecoback.com/guide/delonghi-pac-n90-test.html';
  const query = 'DeLonghi PAC N90 ECO Silent Energielabel Stromkosten 8004399512351';
  const input = {ean:8004399512351,modell:'PAC N90 ECO Silent',arbeitspreis_eur_kwh:0.30,
    messung_vollstaendig:true,messenergie_kwh:1.2,messdauer_min:90};
  const run = (flags, requests) => {
    const payload = requests.map((request,index) => JSON.stringify({jsonrpc:'2.0',id:index+1,...request})).join('\n')+'\n';
    const result = runLocalCommand(server,flags,payload);
    assert.equal(result.status,0,result.stderr);
    return result.stdout.trim().split('\n').map(line => JSON.parse(line).result);
  };
  const [full] = run([], [{method:'tools/call',params:{name,arguments:input}}]);
  const [found, compact] = run(['--compact'],[
    {method:'tools/call',params:{name:'ecoback_werkzeug_finden',arguments:{frage:query}}},
    {method:'tools/call',params:{name:'ecoback_werkzeug_ausfuehren',arguments:{name,eingaben:input}}},
  ]);
  assert.equal(found.structuredContent.tools[0].name,name);
  assert.equal(full.isError,false);
  assert.deepEqual(full,compact);
  const output = full.structuredContent;
  assert.equal(output.citation_url,cite);
  assert.equal(output.guide_url,cite+'#n90-energielabel');
  assert.equal(output.label_eu_kwh_je_60_min,0.9);
  assert.equal(output.label_kuehlleistung_kw,2.5);
  assert.equal(output.label_referenz_eur_je_60_min,0.27);
  assert.equal(output.messzeitraum_eur,0.36);
  assert.equal(output.messwert_eur_je_stunde,0.24);
  assert.match(output.energielabel_url,/assetId=209150&download=true$/);
  assert.doesNotMatch(JSON.stringify(output),/https:\/\/[^"]*amazon\.|[?&]tag=/i);
});

test('offline finder and adapter check keep exact tado X valve evidence', async () => {
  const name = 'tado_x_oventrop_ventiladapter_pruefen';
  const guide = 'https://getecoback.com/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
  const found = findTools('tado X Oventrop UniDH M30 adapter 1011445').tools[0];
  assert.equal(found.name, name);
  assert.equal(found.citation_url, guide);
  assert.equal(found.guide_url, guide + '#tado-x-oventrop');

  const result = (...values) => callTool(name, Object.fromEntries(
    ['ventilmodell','gewinde','ventilzustand'].map((key,index) => [key, values[index]])
  ));
  const okay = 'thermostatisch_unauffaellig';
  for (const model of ['unidh','unil']) {
    const {structuredContent: data} = await result(model,'m30_1_0',okay);
    assert.equal(data.status,'separater_adapter_erforderlich');
    assert.equal(data.adapter_artikelnummer,'1011445');
    assert.equal(data.adapter_ean,'4026755228717');
    assert.equal(data.adapter_im_x_lieferumfang,false);
    assert.match(data.quellen_url,/compatibility_Links\.pdf#page=7$/);
  }
  const direct = (await result('vindo_th','m30_1_5',okay)).structuredContent;
  assert.equal(direct.status,'direktmontage_dokumentiert');
  assert.equal(direct.adapter_artikelnummer,null);
  assert.match(direct.quellen_url,/compatibility_Links\.pdf#page=6$/);

  for (const [input, status] of [
    [['unidh','m30_1_5',okay],'modell_gewinde_widerspruch'],
    [['unidh','unbekannt',okay],'ventilbeleg_fehlend'],
    [['anders_oder_unbekannt','m30_1_0',okay],'ventilbeleg_fehlend'],
    [['unidh','m30_1_0','manuell'],'manuelles_ventil_nicht_kompatibel'],
    [['unidh','m30_1_0','beschaedigt_oder_undicht'],'zustand_klaeren'],
    [['unidh','m30_1_0','unbekannt'],'ventilbeleg_fehlend'],
  ]) {
    const {structuredContent: data} = await result(...input);
    assert.equal(data.status,status);
    assert.equal(data.adapter_artikelnummer,null);
    assert.equal(data.adapter_ean,null);
    assert.equal(data.adapter_im_x_lieferumfang,null);
    assert.equal(data.citation_url,guide);
    assert.doesNotMatch(JSON.stringify(data),/https:\/\/[^"]*amazon\.|[?&]tag=/i);
  }
});

test('German questions find tools beyond the first page and keep reviewed examples', async () => {
  const drainage = findTools('Kann ich den Abflussschlauch nach oben führen?').tools[0];
  assert.equal(drainage.name, 'entfeuchter_ablaufcheck');
  assert.deepEqual(drainage.example_arguments, {drain:'level_or_uphill', model:'meaco-one-20'});
  const proof = (await callTool(drainage.name, drainage.example_arguments)).structuredContent;
  assert.equal(proof.outcome, 'pump_check');
  assert.equal(drainage.citation_url, proof.citation_url);
  assert.equal(drainage.guide_url, proof.guide_url);
  assert.equal(drainage.guide_url, drainage.citation_url + '?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf');

  const shower = findTools('Wie lange darf ich mit 72 Litern duschen?').tools[0];
  assert.equal(shower.name, 'dusche_zeit_bei_wasserbudget');
  assert.match(shower.citation_url, /^https:\/\/getecoback\.com\//);
  assert(shower.example_arguments);

  const filter = findTools('Auf dem Tisch liegt der iRobot-Filterpack 4785887. Mein Roomba j7+ hat keinen Combo-Zusatz. Nennt die deutsche Packliste mein Modell?');
  assert.equal(filter.tools[0].name, 'roboter_ersatzfilter_exakte_de_zuordnung');
  assert(TOOLS.findIndex(tool => tool.name === filter.tools[0].name) >= MCP_PAGE_SIZE);

  const holder = findTools('Midea PortaSplit Dachfenster Halterung').tools[0];
  assert.equal(holder.name, bracketTool);
  assert.equal(holder.category, 'Quellen & Kaufprüfung');
  assert.equal(holder.citation_url, bracketCitation);
  assert.deepEqual(holder.example_arguments, roofWithoutBracket);
  assert.deepEqual(holder.inputSchema.required, Object.keys(roofWithoutBracket));

  const toaster = 'Bosch TAT8613 Krümelschublade';
  assert.deepEqual(findTools(toaster.normalize('NFD')), findTools(toaster));
  assert.deepEqual(findTools('Bosch TAT8613 Kruemelschublade'), findTools(toaster));
  assert(findTools(toaster).tools.some(tool => tool.name === 'bosch_tat8613_kruemelschublade_vor_betrieb_vorhanden'));

  const broad = findTools('Fenster');
  assert(broad.totalMatches > 5);
  assert.equal(broad.tools.length, 5);
  for (const query of ['  ', 'wie kann ich', 'qzxunknownzqp']) {
    assert.deepEqual(findTools(query), {totalMatches: 0, tools: []});
  }
});

test('German window vacuum questions find the same five reviewed tasks in local and compact search', () => {
  const queries = [
    ['Kann ich mit dem Kärcher WV 2 Plus Multi Edition 30 ml aufsaugen, obwohl der Tank größer ist?', 'fenstersauger_kaercher_fluessigkeitsgrenze_und_tank'],
    ['Was bedeutet es beim Kärcher WV 8, wenn alle LEDs zweimal kurz blinken und der Motor aus ist?', 'fenstersauger_wv3_wv8_led_muster_einordnen'],
    ['Kann ich beim WV 3 Comfort Precision+ Black einen zweiten Akku während des Fensterputzens einsetzen?', 'fenstersauger_wv3_wv8_akkuwechsel_service_oder_reserve'],
    ['Darf ich beim Kärcher WV 8 Schaumreiniger statt Glasreiniger nehmen?', 'fenstersauger_kaercher_glasreiniger_schaum_spiritus'],
    ['Brauche ich eine Probe mit dem Mikrofaserbezug, bevor ich mit dem Kärcher WV 3 eine Hochglanzfläche reinige?', 'fenstersauger_wv3_wv8_hochglanz_glas_temperatur_probe'],
  ];
  const replies = compactReplies(queries.map(([frage]) => toolCall(compactFind, {frage})));
  for (const [i, [query, expected]] of queries.entries()) {
    const first = findTools(query).tools[0];
    assert.equal(first?.name, expected, query);
    const section = expected === 'fenstersauger_wv3_wv8_led_muster_einordnen' ?
      'kaercher-fenstersauger-einsatz-und-hinweise' : 'fenstersauger-belege';
    assert.equal(first.guide_url, 'https://getecoback.com/produkte.html#' + section);
    assert.deepEqual(replies[i].result.structuredContent.tools[0], first, query);
  }
});

test('the same two-flash question distinguishes the WV 3 and WV 8 articles', async () => {
  const [signal] = findTools('Beim Kärcher WV 3 blinken alle LEDs zweimal kurz und der Motor ist aus. Was bedeutet das?').tools;
  assert.equal(signal?.name, 'fenstersauger_wv3_wv8_led_muster_einordnen');
  const observed = {sicherheitsblatt_bestaetigt:true, muster:'alle_leds_zweimal_kurz_dann_lange_pause', zustand:'motor_aus'};
  const wv3 = await callTool(signal.name, {...observed, artikel:'1.633-698.0'});
  const wv8 = await callTool(signal.name, {...observed, artikel:'1.633-785.0'});
  assert.equal(wv3.structuredContent.tabellenbedeutung, null);
  assert.equal(wv8.structuredContent.tabellenbedeutung, 'akkutemperatur_zu_hoch_oder_zu_tief');
});

test('a named window vacuum model keeps a replacement blade and battery on their own tasks', () => {
  const blade = 'fenstersauger_170mm_abziehlippe_geraetefamilie';
  const battery = 'fenstersauger_wv3_wv8_akkuwechsel_service_oder_reserve';
  const cases = [
    ['Passt die 170-mm-Abziehlippe 2.633-104.0 an meinen Kärcher WV 8 Signature Line?', blade],
    ['Passt die 170-mm-Abziehlippe 2.633-104.0 an meinen Kärcher WV 3 Comfort Precision+ Black?', blade],
    ['Lässt sich der Akku beim WV 8 Signature Line austauschen?', battery],
    ['Lässt sich der Akku beim WV 3 Comfort Precision+ Black austauschen?', battery],
  ];
  const replies = compactReplies(cases.map(([frage]) => toolCall(compactFind, {frage})));
  for (const [i, [query, expected]] of cases.entries()) {
    assert.equal(findTools(query).tools[0]?.name, expected, query);
    assert.equal(replies[i].result.structuredContent.tools[0]?.name, expected, query);
  }
});

test('offline finder emits JSON and handles an omitted query', () => {
  const found = runLocalCommand(finder, ['Midea PortaSplit Dachfenster Halterung']);
  assert.equal(found.status, 0, found.stderr);
  assert.equal(JSON.parse(found.stdout).tools[0].name, bracketTool);
  const missing = runLocalCommand(finder, []);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /Usage:/);
});

test('German per-load cost comparisons find the existing measured laundry tool', () => {
  const queries = [
    'Wäschetrockner oder Luftentfeuchter – was kostet das Trocknen pro Ladung?',
    'Was kostet mich das Trocknen pro Waschladung mit dem Trockner oder Entfeuchter?',
    'Trockner oder Luftentfeuchter: Wie viel Stromgeld kostet mich eine gleich trockene Ladung Wäsche?',
    'Waeschetrockner gegen Luftentfeuchter: Welcher Trocknungsweg kostet bei gleicher Ladung weniger Euro?',
    'Ich habe die kWh für den Trockner und den Entfeuchter gemessen. Was kostet eine Ladung Wäsche jeweils?',
  ];
  const name = 'waesche_trocknungskosten';
  const measurements = {dryer:2,dehum:1,price:0.3,comparable:false};
  for (const query of queries) assert.equal(findTools(query).tools[0]?.name, name, query);

  const [lookup, example, comparable] = compactReplies([
    toolCall(compactFind, {frage:queries[0]}),
    toolCall(compactRun, {name, eingaben:measurements}),
    toolCall(compactRun, {name, eingaben:{...measurements, comparable:true}}),
  ]);
  const first = lookup.result.structuredContent.tools[0];
  assert.equal(first.name, name);
  assert.deepEqual(first.example_arguments, measurements);
  assert.deepEqual(example.result, runReviewedExample(name).result);
  assert.equal(first.citation_url, 'https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html');
  assert.equal(example.result.structuredContent.dryer_eur_per_load, 0.6);
  assert.equal(example.result.structuredContent.dehumidifier_eur_per_load, 0.3);
  assert.equal(example.result.structuredContent.lower_cost, 'unconfirmed');
  assert.equal(comparable.result.structuredContent.lower_cost, 'dehum');

  const index = indexCatalogue([{name, category:'Strom & Haushalt', description:'Messwerte für zwei Trocknungswege vergleichen'}]);
  assert.equal(findCatalogueTools(index, {query:queries[0], category:'Strom & Haushalt', name})[0]?.name, name);
  assert.deepEqual(findCatalogueTools(index, {query:queries[0], category:'Feuchte'}), []);
  assert.deepEqual(findCatalogueTools(index, {query:queries[0], name:'geraetewechsel_rechnen'}), []);

  for (const [query, previousFirst] of [
    ['Was kostet eine Ladung nur im Wäschetrockner bei meinem Stromtarif?',undefined],
    ['Wäschetrockner oder Luftentfeuchter: Nach wie vielen Wintern rechnet sich der Kaufpreis?',
      TOOLS.some(tool => tool.name === 'waesche_trocknungswechsel_kaufschwelle') ? 'waesche_trocknungswechsel_kaufschwelle' : undefined],
    ['Was kostet eine Ladung Wäsche, wenn Trockner und Luftentfeuchter gleichzeitig laufen?','waesche_wochenbedarf_leine_und_trockner'],
    ['Was kostet es pro Ladung, wenn ich nur den Trockner nutze und den Luftentfeuchter ausgeschaltet lasse?','wasch_trockner_zweiladung_uebergabestau'],
    ['Trockner oder Luftentfeuchter: Welche Methode trocknet meine Wäsche schneller?','waesche_wochenbedarf_leine_und_trockner'],
    ['Wie haenge ich die Waesche auf dem Waeschestaender auf, damit sie ohne Trockner schneller trocknet?','waesche_wochenbedarf_leine_und_trockner'],
    ['Luftentfeuchter','entfeuchter_ablaufcheck'],
    ['Wäschetrockner','pflegeetikett_naturweg_bei_trocknerverbot'],
    ['Trocknen','saugwischer_dock_laden_trocknen_ablauf'],
    ['Ladung','spuelmaschine_ladung_entnahme_stationen'],
    ['Waschladung','waschtrockner_waschladung_aufteilen'],
  ]) assert.equal(findTools(query).tools[0]?.name, previousFirst, query);
});

test('offline CLI examples run exact reviewed inputs and reject incomplete or live-only requests', () => {
  const example = (...args) => runLocalCommand(finder, ['--example', ...args]);
  const drainage = example('entfeuchter_ablaufcheck');
  assert.equal(drainage.status, 0, drainage.stderr);
  const drain = JSON.parse(drainage.stdout);
  assert.equal(drain.name, 'entfeuchter_ablaufcheck');
  assert.deepEqual(drain.example_arguments, {drain:'level_or_uphill', model:'meaco-one-20'});
  assert.equal(drain.result.structuredContent.outcome, 'pump_check');
  assert.match(drain.result.structuredContent.guide_url, /keller-ablauf#ablauf-vor-kauf$/);

  const shower = example('dusche_zeit_bei_wasserbudget');
  assert.equal(shower.status, 0, shower.stderr);
  assert.deepEqual(JSON.parse(shower.stdout), runReviewedExample('dusche_zeit_bei_wasserbudget'));

  for (const invalid of [[], ['hitzewelle_vorschau'], ['ratgeber_suche'], ['ratgeber_lesen'],
    ['entfeuchter_ablaufcheck', 'unknown'], ['Kann der Schlauch nach oben?'], ['__proto__']]) {
    const receipt = example(...invalid);
    assert.equal(receipt.status, 2, invalid.join(' '));
    assert.equal(receipt.stdout, '');
    assert.match(receipt.stderr, /exact tool name.*reviewed local example/);
  }
});

function runLocalCommand(entry, args, inputText = '') {
  // Regular descriptors exercise the real process without relying on libuv child sockets.
  const work = mkdtempSync(join(tmpdir(), 'ecoback-stdio-'));
  let input, output, errors;
  try {
    const inputPath = join(work, 'stdin');
    const outputPath = join(work, 'stdout');
    const errorPath = join(work, 'stderr');
    writeFileSync(inputPath, inputText);
    input = openSync(inputPath, 'r');
    output = openSync(outputPath, 'w');
    errors = openSync(errorPath, 'w');
    const preload = join(work, 'deny-network.cjs');
    writeFileSync(preload, `const deny = () => { process.stderr.write('Unexpected network call in stdio test\\n'); process.exit(89); };
globalThis.fetch = deny;
require('node:net').Socket.prototype.connect = deny;
require('node:dgram').Socket.prototype.send = deny;
`);
    const child = spawnSync(process.execPath, ['--require', preload, entry, ...args],
      {stdio:[input, output, errors], timeout:10000});
    assert.equal(child.error, undefined);
    return {status:child.status, stdout:readFileSync(outputPath, 'utf8'), stderr:readFileSync(errorPath, 'utf8')};
  } finally {
    if (input !== undefined) closeSync(input);
    if (output !== undefined) closeSync(output);
    if (errors !== undefined) closeSync(errors);
    rmSync(work, {recursive:true, force:true});
  }
}

function readStdio(jobs, serverArgs = []) {
  const input = jobs.map(job => JSON.stringify(job)).join('\n') + '\n';
  const child = runLocalCommand(server, serverArgs, input);
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim().split('\n').map(line => JSON.parse(line));
}

test('stdio handles initialize, the complete paginated catalogue, reviewed calls and unknown tool frames', async () => {
  const jobs = [];
  function send(method, params) {
    const id = jobs.length + 1;
    jobs.push({jsonrpc:'2.0', id, method, params});
    return id;
  }
  const initialize = send('initialize', {});
  const listIds = new Map();
  let cursor;
  const expectedPages = Math.ceil(TOOLS.length / MCP_PAGE_SIZE);
  for (let page = 0; page < expectedPages; page++) {
    const id = send('tools/list', cursor === undefined ? {} : {cursor});
    assert.equal(listIds.has(cursor), false);
    listIds.set(cursor, id);
    cursor = pageTools(TOOLS, cursor, version).nextCursor;
  }
  const btu = send('tools/call', {name:'btu_empfehlung', arguments:{qm:20}});
  const holder = send('tools/call', {name:bracketTool, arguments:roofWithoutBracket});
  const unknown = send('tools/call', {name:'does_not_exist', arguments:{}});
  const messages = readStdio(jobs);
  assert.equal(messages.length, jobs.length);
  assert(messages.every(message => message.jsonrpc === '2.0'));
  const replies = new Map(messages.map(message => [message.id, message]));
  assert.equal(replies.size, jobs.length);
  assert.deepEqual(replies.get(initialize).result.serverInfo, {name:'getecoback-raumklima', version});
  assert.equal(replies.get(initialize).result.protocolVersion, '2025-06-18');

  let pages = 0;
  const catalogue = await collectToolPages(async continuation => {
    const reply = replies.get(listIds.get(continuation));
    assert.ok(reply?.result, 'The server returned an unknown pagination cursor');
    assert.equal(reply.result.tools.length, Math.min(MCP_PAGE_SIZE, TOOLS.length - pages * MCP_PAGE_SIZE));
    pages++;
    return reply.result;
  });
  assert.equal(pages, expectedPages);
  assert.equal(new Set(catalogue.map(tool => tool.name)).size, TOOLS.length);
  assert.deepEqual(catalogue, TOOLS);
  assert.equal(replies.get(btu).result.isError, false);
  assert.match(replies.get(btu).result.content[0].text, /7\.000 BTU/);
  const decision = replies.get(holder).result;
  assert.equal(decision.isError, false);
  assert.equal(decision.structuredContent.status, 'passende_halterung_vor_kauf_klaeren');
  assert.equal(decision.structuredContent.universalhalterung_ean, 4048164118687);
  assert.equal(decision.structuredContent.citation_url, bracketCitation);
  assert.equal(decision.structuredContent.guide_url, bracketGuide);
  assert.equal(decision.structuredContent.entry_url, bracketEntry);
  assert.equal(replies.get(unknown).error.code, -32602);
});

test('default and compact stdio expose the same offline German cellar evidence resource', () => {
  const uri = cellarUri;
  const mimeType = 'text/markdown';
  const meacoSource = 'https://eu.meaco.com/products/meacodry-arete-one-20l-luftentfeuchter-luftreiniger';
  const comfeeSource = 'https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2';
  const requests = [
    {method:'initialize', params:{}},
    {method:'resources/list'},
    {method:'resources/templates/list', params:{}},
    {method:'resources/read', params:{uri}},
    {method:'resources/list', params:{cursor:'stale-cursor'}},
    {method:'resources/templates/list', params:{cursor:'stale-cursor'}},
    {method:'resources/list', params:[]},
    {method:'resources/templates/list', params:[]},
    {method:'resources/read', params:{}},
    {method:'resources/read', params:{uri:42}},
    {method:'resources/read', params:{uri:uri+'/'}},
    {method:'resources/read', params:{uri:'https://example.invalid/evidence'}},
  ].map((request,index) => ({jsonrpc:'2.0', id:index+1, ...request}));

  const bodies = [[], ['--compact']].map(args => {
    const messages = readStdio(requests, args);
    assert.equal(messages.length, requests.length);
    assert(messages.every(message => message.jsonrpc === '2.0'));
    const byId = new Map(messages.map(reply => [reply.id, reply]));
    const [initial, listing, templates, read, ...errors] = requests.map(({id}) => byId.get(id));
    assert.deepEqual(initial.result.capabilities, {tools:{},resources:{}});
    const {resources, nextCursor} = listing.result;
    assert.equal(resources.length, 1);
    assert.equal(resources[0].uri, uri);
    assert.equal(resources[0].mimeType, mimeType);
    assert.match(resources[0].name, /\S/);
    assert.equal(nextCursor, undefined);
    assert.deepEqual(templates.result, {resourceTemplates:[]});
    assert.equal(read.result.contents.length, 1);
    const {text} = read.result.contents[0];
    assert.equal(typeof text, 'string');
    assert.deepEqual(read.result, {contents:[{uri,mimeType,text}]});
    assert.deepEqual(errors.map(reply => reply.error?.code), [-32602,-32602,-32602,-32602,-32602,-32602,-32002,-32002]);
    return text;
  });

  assert.equal(bodies[0], bodies[1]);
  const text = bodies[0].replace(/[^\S\r\n]+/g, ' ');
  const lines = text.split('\n');
  for (const [temperature,litres,watts] of [['10',/\b3[,.]4\s*l\/tag\b/i,'180'],['20',/\b8[,.]5\s*l\/tag\b/i,'216']]) {
    assert(lines.some(line => new RegExp(`\\b${temperature}\\s*°C`).test(line) && litres.test(line) && new RegExp(`\\b${watts}\\s*W\\b`).test(line)),
      `The Meaco ${temperature} °C test condition, daily extraction and wattage must appear together`);
  }
  assert.match(text, /60\s*%/);
  assert.match(text, /MeacoDry Arete One 20L/);
  assert(lines.some(line => line.includes(meacoSource) && /20\.11\.2026|2026-11-20/.test(line)));
  assert(lines.some(line => line.includes(comfeeSource) && /(?:06|20)\.11\.2026|2026-11-(?:06|20)/.test(line)));
  assert.match(text, /MDDF-20DEN7\s+ohne\s+WF[^\n]*\boffen\b/i);
  assert.match(text, /Ursache klären/);
  assert.match(text, /Kauf verzichten/);
  assert.match(text, /Tankalarm aktiv/);
  assert.match(text, /kurze Schwelle.*tiefer liegendem Zielablauf/i);
  assert.match(text, /https:\/\/www\.meaco\.de\/produkt\/meaco-dry-arete-one-pumpe\/\).*DE, geprüft 2026-11-22/);
  const sourceHosts = new Set(['eu.meaco.com','www.meaco.com','www.meaco.de','www.feelcomfee.com','www.stadlerform.com','getecoback.com']);
  for (const match of text.matchAll(/https?:\/\/[^\s)<>]+/g)) {
    const url = new URL(match[0]);
    assert.equal(url.protocol, 'https:');
    assert(sourceHosts.has(url.hostname), `Unapproved source hostname ${url.hostname}`);
    assert(!url.searchParams.has('tag') && !url.searchParams.has('ascsubtag'));
    if (url.hostname === 'getecoback.com') assert.equal(url.pathname, '/guide/luftentfeuchter-keller.html');
  }
});

const compactFind = 'ecoback_werkzeug_finden';
const compactRun = 'ecoback_werkzeug_ausfuehren';
const liveOnly = ['hitzewelle_vorschau', 'ratgeber_suche', 'ratgeber_lesen'];
const toolCall = (name, args) => ({method:'tools/call', params:{name, arguments:args}});

function compactReplies(requests) {
  const jobs = requests.map((request, index) => ({jsonrpc:'2.0', id:index + 1, ...request}));
  const replies = readStdio(jobs, ['--compact']);
  const byId = new Map(replies.map(reply => [reply.id, reply]));
  assert.equal(replies.length, jobs.length);
  return jobs.map(job => {
    assert.ok(byId.has(job.id), `Missing reply to request ${job.id}`);
    return byId.get(job.id);
  });
}

test('offline stdio finds Miele bag types and keeps two-device filter evidence separate', () => {
  const bag = 'miele_hyclean_beutel_vollstaendige_modellzeile';
  const shared = 'miele_zwei_sauger_vorrat_beutel_abluftfilter_getrennt';
  const citation = 'https://getecoback.com/produkte.html';
  const guide = citation + '#miele-staubsaugerbeutel';
  const source = 'https://www.miele.de/c/staubsaugerbeutel-und-filter-10520.htm';
  const tu = 'https://www.miele.de/product/12557060/4-staubsaugerbeutel-tu-hyclean-pure';
  const co = 'https://www.miele.de/product/12557080/4-staubsaugerbeutel-co-hyclean-pure';
  const fjm = 'https://www.miele.de/product/12421180/4-staubsaugerbeutel-fjm-hyclean-pure';
  const gn = 'https://www.miele.de/product/12421170/4-staubsaugerbeutel-gn-hyclean-pure';
  const pack = (artikelnummer, motorschutzfilter) => ({artikelnummer,beutel:4,motorschutzfilter,abluftfilter:1,
    ...(motorschutzfilter ? {} : {abluftfilter_art:'AirClean'}),geprueft_am:'2026-11-22'});
  const match = 'gleich_mit_de_herstellerliste', different = 'typ_weicht_von_de_herstellerliste_ab';
  const direct = [
    ['guard_s1','TU', ['TU',match,tu,pack('12557060',0)]],
    ['guard_l1','TU', ['TU',match,tu,pack('12557060',0)]],
    ['guard_m1','GN', ['CO',different,co,pack('12557080',0)]],
    ['compact_c2','GN', ['FJM',different,fjm,pack('12421180',1)]],
    ['complete_c2','GN', ['GN',match,gn,pack('12421170',1)]],
    ['nur_c2','FJM', [null,'vollstaendigen_modellnamen_pruefen',null,null]],
    ['guard_l1','unbekannt', ['TU','beuteltyp_am_angebot_pruefen',tu,pack('12557060',0)]],
  ].map(([modellfamilie, beutel_am_angebot, expected]) => ({
    name:bag,input:{modellfamilie,beutel_am_angebot},
    fields:['dokumentierter_beuteltyp','status','beleg_zum_passenden_originalpack','dokumentierter_de_originalpack'],expected,
  }));
  const pairs = [
    ['guard_s1','guard_l1',true,['TU',true,'SF-HA 50-1',true]],
    ['guard_s1','guard_l1',false,['TU',true,null,null]],
    ['classic_c1','complete_c3',true,['GN',true,null,false]],
    ['guard_l1','guard_m1',true,[null,false,'SF-HA 50-1',true]],
    ['nur_c2','guard_l1',true,[null,null,null,null]],
  ].map(([erstes_modell, zweites_modell, vorrat_soll_hepa_serie_abdecken, expected]) => ({
    name:shared,input:{erstes_modell,zweites_modell,vorrat_soll_hepa_serie_abdecken},
    fields:['gemeinsamer_beuteltyp','beleg_geteilter_beuteltyp','gemeinsamer_gelisteter_hepa_filter','beleg_geteilter_hepa_filter'],
    expected,
  }));
  const invalid = [
    {name:bag,input:{modellfamilie:'miele_guard_s1',beutel_am_angebot:'TU'}},
    {name:bag,input:{modellfamilie:'guard_s1',beutel_am_angebot:'CO/TU'}},
    {name:shared,input:{erstes_modell:'guard_s1',zweites_modell:'guard_l1',vorrat_soll_hepa_serie_abdecken:'true'}},
  ];
  const searches = [
    ['Welcher Staubsaugerbeutel passt in meinen Miele Guard S1: TU oder GN?',bag],
    ['Miele Guard M1: Darf ich meine alten GN-Beutel weiterverwenden oder brauche ich CO?',bag],
    ['Ist 12557080 das richtige Originalpaket für den Miele Guard M1, und was ist drin?',bag],
    ['Ist bei der Originalpackung TU 12557060 für Miele Guard L1 auch der AirClean Abluftfilter drin?',bag],
    ['Mein Miele sagt nur C2. Passen die GN-Beutel oder FJM?',bag],
    ['Kann ich für meine Miele Guard S1 und Guard L1 dieselben TU Beutel gemeinsam auf Vorrat kaufen?',shared],
    ['Miele Guard L1 und Complete C3 haben beide SF-HA 50-1, passen auch die Beutel?',shared],
    ['Gemeinsamer Vorrat für Miele Guard M1 und Complete C3: CO oder GN und Abluftfilter?',shared],
    ['Miele Staubsaugerbeutel Anzeige sagt voll obwohl der Beutel leer ist','miele_beutelsignal_feinstaub_fusseln_abgleichen'],
    ['Miele Guard L1 Filter wechseln und rote Anzeige zurücksetzen','miele_guard_l1_abluftanzeige_reset_vor_wechsel'],
  ];
  const cases = [...direct,...pairs,...invalid];
  const compact = compactReplies([
    ...searches.map(([frage]) => toolCall(compactFind,{frage})),
    ...cases.map(({name,input:eingaben}) => toolCall(compactRun,{name,eingaben})),
  ]);
  for (const [index, [query, expected]] of searches.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    assert.equal(first?.name, expected, query);
    if ([bag,shared].includes(expected)) assert.deepEqual([first.citation_url,first.guide_url],[citation,guide]);
  }
  const jobs = cases.map(({name,input}, index) => ({jsonrpc:'2.0',id:index+1,...toolCall(name,input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id,reply.result]));
  for (const [index, {fields,expected}] of cases.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (!fields) {
      assert.equal(result.isError,true);
      assert.equal(result.structuredContent,undefined);
      continue;
    }
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.deepEqual(fields.map(field => data[field]),expected);
    assert.deepEqual([data.citation_url,data.guide_url,data.herstellerquelle,data.quellen_geprueft],
      [citation,guide,source,'2026-11-20']);
    assert.match(data.grenze,index < direct.length ? /Kürzel wie C1 oder C2 reicht allein nicht/ : /keinen gemeinsamen Abluftfilter/);
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio preserves the Trotec TTK 70 HEPA production boundary and filter evidence', () => {
  const name = 'trotec_ttk70_hepa_filter_generation';
  const citation = 'https://getecoback.com/guide/trotec-luftentfeuchter-test.html';
  const guide = citation + '#ttk70-hepa-filter';
  const old = '7710000024', later = '7710000077', dust = '7710000080';
  const before = 'vor_dezember_2023', december = 'dezember_2023', after = 'nach_dezember_2023';
  const model = 'TTK 70 HEPA', plus = 'TTK 70 HEPA Plus', unknown = 'unbekannt';
  const confirmed = 'aelterer_hepa_filter_belegt', conflict = 'herstellerangaben_widerspruechlich';
  const cases = [
    [model,before,old,confirmed,old],
    [model,before,later,'angebot_kennung_abgleichen',old],
    [model,before,unknown,'angebot_kennung_abgleichen',old],
    [model,december,old,'uebergangsmonat_offen',null],
    [plus,december,later,'uebergangsmonat_offen',null],
    [plus,after,later,conflict,null],
    [model,after,old,conflict,null],
    [plus,before,old,'modell_und_bauzeit_abgleichen',null],
    [model,unknown,old,'typenschild_pruefen',null],
    [unknown,before,old,'typenschild_pruefen',null],
    [model,before,dust,'separater_staubluftfilter',null],
  ];
  const invalid = [
    {modell:'TTK 70 HEPA Pro',bauzeit:before,angebot_kennung:old},
    {modell:model,bauzeit:'2023',angebot_kennung:old},
    {modell:model,bauzeit:before,angebot_kennung:7710000024},
    {modell:model,bauzeit:before,angebot_kennung:'77100000240'},
    {modell:model,angebot_kennung:old},
  ];
  const positive = [
    'Welcher HEPA-Ersatzfilter passt zu meinem Trotec TTK 70 HEPA? Auf dem Typenschild steht Dezember 2023.',
    'Mein Trotec TTK 70 HEPA Plus ist Baujahr 2024. Passt 7710000024 oder 7710000077?',
    'TTK70HEPA: Ist 7710000080 ein Ersatz für den HEPA-Filter 7710000077?',
    '7710000024',
    'Trotec 7.710.000.077',
  ];
  const other = [
    ['Wie oft muss ich den Filter in meinem Trotec TTK 70 HEPA reinigen?',null],
    ['Wie wechsle ich beim TTK 70 HEPA den Filter?',null],
    ['Trotec TTK 70 HEPA Plus Staubvorfilter 7710000080',null],
    ['7710000080',null],
    ['Trotec 7710000077 für TTK 72 E?',null],
    ['Nicht für den TTK 70 HEPA, sondern für einen Meaco Arete One: Passt der HEPA Ersatzfilter 7710000024?',null],
    ['Beim Kauf dachte ich an den TTK 70 HEPA, aber es ist ein Comfee MDDF-20DEN7. Welcher Ersatzfilter passt?',null],
    ['Passt der Ersatzfilter 7710000077 in meinen Trotec TTK 70 HEPA Deluxe?',null],
    ['Passt 7710000077 für den TTK 70 HEPA Plus 2.0?',null],
    ['TTK 70 HEPA Plus Deluxe mit 7710000077?',null],
    ['Für meinen Trotec TTK 70 HEPA Plus brauche ich nur einen Staub-Filter als Ersatzfilter.',null],
    ['Levoit Core 300S HEPA-Filter','luftreiniger_ersatzfilter_zuordnung'],
    ['Wie viele Liter zieht der TTK 75 ECO im kalten Keller bei 10 Grad?','trotec_ttk75_eco_pruefpunkt'],
  ];
  const searches = [...positive, ...other.map(([query]) => query)];
  const inputs = [...cases.map(([modell, bauzeit, angebot_kennung]) => ({modell,bauzeit,angebot_kennung})), ...invalid];
  const compact = compactReplies([
    ...searches.map(frage => toolCall(compactFind, {frage})),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of searches.entries()) {
    const hits = compact[index].result.structuredContent.tools;
    const first = hits[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index >= positive.length) {
      const expected = other[index - positive.length][1];
      if (expected) assert.equal(first?.name, expected, query);
      assert.ok(!hits.some(tool => tool.name === name), query);
      continue;
    }
    assert.equal(first?.name, name, query);
    assert.deepEqual([first.citation_url, first.guide_url], [citation, guide]);
    assert.deepEqual(first.inputSchema.required, ['modell','bauzeit','angebot_kennung']);
  }
  const jobs = inputs.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of inputs.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    const [,,,status, part] = cases[index];
    assert.deepEqual([data.status,data.dokumentierter_hepa_filter,data.markt,data.quellen_geprueft_am],
      [status,part,'Deutschland','2026-11-22']);
    assert.deepEqual([data.citation_url, data.guide_url], [citation, guide]);
    assert.deepEqual(data.quellen.map(item => item.artikelnummer), [old,later,dust]);
    assert.ok(data.quellen.every(item => new URL(item.url).hostname === 'de.trotec.com'));
    assert.match(data.quellen[1].fundstelle, /ab Baujahr.*bis Baujahr/);
    assert.match(data.hinweis, /Kaufmonat bestimmt die Generation nicht/);
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio identifies the complete Kärcher narrow nozzle separately from the replacement lip', () => {
  const name = 'fenstersauger_170mm_saugduese_geraetezuordnung';
  const lip = 'fenstersauger_170mm_abziehlippe_geraetefamilie';
  const citation = 'https://getecoback.com/produkte.html';
  const guide = citation + '#kaercher-170mm-saugduese';
  const complete = 'komplette_saugduese';
  const confirmed = 'herstellerliste_bestaetigt';
  const open = 'zuordnung_offen';
  const cases = [
    ['WV 2 Plus Multi Edition','2.633-112.0',complete,confirmed,['2.633-112.0'],['2.633-112.0']],
    ['WV 3 Comfort Precision+ Black','2.633-605.0',complete,confirmed,['2.633-605.0'],['2.633-605.0']],
    ['WV 8 Signature Line','2.633-532.0',complete,confirmed,['2.633-532.0'],['2.633-532.0']],
    ['WV 6 Plus','2.633-512.0',complete,confirmed,['2.633-512.0','2.633-532.0'],['2.633-512.0','2.633-532.0']],
    ['WV 8 Signature Line','2.633-112.0',complete,'kombination_nicht_belegt',['2.633-532.0'],['2.633-112.0','2.633-532.0']],
    ['unbekannt','2.633-532.0',complete,open,[],['2.633-532.0']],
    ['WV 8 Signature Line','unbekannt',complete,open,['2.633-532.0'],['2.633-532.0']],
    ['WV 8 Signature Line','unbekannt','nur_abziehlippe','nur_abziehlippe',['2.633-532.0'],['2.633-532.0']],
    ['WV 8 Signature Line','2.633-532.0','unbekannt',open,['2.633-532.0'],['2.633-532.0']],
    ['unbekannt','unbekannt','unbekannt',open,[],[]],
  ];
  const invalid = [
    {geraet:'WV 3',teilenummer:'2.633-605.0',angebotsart:complete},
    {geraet:'WV 8 Signature Line',teilenummer:'2.633-513.0',angebotsart:'nur_abziehlippe'},
    {geraet:'WV 8 Signature Line',teilenummer:'26335320',angebotsart:complete},
    {geraet:'WV 8 Signature Line',teilenummer:'2.633-532.0'},
    {geraet:'WV 8 Signature Line',teilenummer:'2.633-532.0',angebotsart:'beides'},
  ];
  const related = [
    'Welche schmale Düse mit 170 mm passt auf meinen Kärcher WV 8 Signature Line?',
    'Passt die komplette 2.633-605.0 Saugdüse an den Kärcher WV 3 Comfort Precision+ Black?',
    'Kann ich die 2.633-112.0 für den WV 2 Plus Multi Edition nachkaufen?',
  ];
  const other = [
    ['Passt die 170 mm Gummilippe 2.633-104.0 auf meinen Kärcher WV 3?',lip],
    ['Gummilippe 2.633-513.0 für WV 8 Signature Line',lip],
    ['Welcher 170 mm breite Saugkopf passt zwischen meine Sprossen bei 160 mm Glasbreite?','fenstersauger_sprossenfenster_duesenbreite'],
    ['Meine Scheibe ist 170 mm breit, beim WV 8 sind links und rechts je 5 mm Luft nötig. Passt die schmale Saugdüse?',
      'fenstersauger_sprossenfenster_duesenbreite'],
    ['Beim Kärcher WV 3: Passt der Saugkopf 2.633-605.0 zwischen meine Sprossen mit 170 mm Glasbreite?',
      'fenstersauger_sprossenfenster_duesenbreite'],
    ['Kärcher WV 8 LED blinkt beim Laden, was bedeutet das?','fenstersauger_wv3_wv8_led_muster_einordnen'],
    ['Kann ich eine 170 mm Saugdüse an meinem Bosch GlassVAC montieren?',null],
  ];
  const searches = [...related, ...other.map(([query]) => query)];
  const inputs = [...cases.map(([geraet, teilenummer, angebotsart]) => ({geraet, teilenummer, angebotsart})), ...invalid];
  const compact = compactReplies([
    ...searches.map(frage => toolCall(compactFind, {frage})),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of searches.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index >= related.length) {
      const expected = other[index - related.length][1];
      if (expected) assert.equal(first?.name, expected, query);
      assert.notEqual(first?.name, name, query);
      continue;
    }
    assert.equal(first?.name, name, query);
    assert.deepEqual([first.citation_url, first.guide_url], [citation, guide]);
    assert.deepEqual(first.inputSchema.required, ['geraet','teilenummer','angebotsart']);
  }
  const jobs = inputs.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of inputs.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    const [,,,status, documented, evidence] = cases[index];
    assert.deepEqual([data.status, data.markt, data.dokumentierte_duesen], [status, 'Deutschland', documented]);
    assert.deepEqual([data.citation_url, data.guide_url], [citation, guide]);
    assert.deepEqual(data.belege.map(item => item.teilenummer), evidence);
    assert.ok(data.belege.every(item => new URL(item.url).hostname === 'www.karcher.com' &&
      item.url.endsWith('p' + item.teilenummer.replace(/\D/g, '')) && item.geprueft_am === '2026-11-22'));
    assert.match(data.hinweis, /170 mm.*Nennbreite/);
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio distinguishes exact coffee filter compatibility from upkeep and unrelated filters', () => {
  const name = 'kaffeevollautomat_intenza_aquaclean_filterfamilie_modellpruefung';
  const citation = 'https://getecoback.com/produkte.html';
  const guide = citation + '#kaffee-wasserfilter';
  const found = 'in_unterlagen_belegt';
  const unresolved = 'zuordnung_offen';
  const exactPackSource = 'https://acc.philips.de/c-p/CA6903_10/kalk-und-wasserfilter';
  const cases = [
    [{modell: 'EP2220/10', filter: 'AquaClean'}, found, ['AquaClean'], ['www.documents.philips.com','acc.philips.de']],
    [{modell: 'EP2231/40', filter: 'TCZ7003'}, 'brita_fuer_dieses_geraet_ausgeschlossen',
      ['AquaClean'], ['www.download.p4c.philips.com','acc.philips.de']],
    [{modell: 'TIE20301', filter: 'TCZ7003'}, found, ['TCZ7003','TCZ7033'], ['media3.bsh-group.com']],
    [{modell: 'TIE20301', filter: 'TCZ7033'}, found, ['TCZ7003','TCZ7033'], ['media3.bsh-group.com']],
    [{modell: 'TIE20301', filter: 'DLSC002'}, 'durch_gelesene_quellen_nicht_belegt',
      ['TCZ7003','TCZ7033'], ['media3.bsh-group.com']],
    [{modell: 'ECAM22.110.B', filter: 'DLSC002'}, found, ['DLSC002'], ['www.delonghi.com']],
    [{modell: 'offen', filter: 'AquaClean'}, unresolved, null, []],
    [{modell: 'anderes_modell', filter: 'DLSC002'}, unresolved, null, []],
    [{modell: 'EP2220/10', filter: 'offen'}, unresolved, ['AquaClean'], ['www.documents.philips.com','acc.philips.de']],
    [{modell: 'EP2220/10', filter: 'CA6903/10'}, found,
      ['AquaClean'], ['www.documents.philips.com','acc.philips.de','acc.philips.de']],
    [{modell: 'EP2231/40', filter: 'CA6903/10'}, found,
      ['AquaClean'], ['www.download.p4c.philips.com','acc.philips.de','acc.philips.de']],
    [{modell: 'TIE20301', filter: 'CA6903/10'}, 'durch_gelesene_quellen_nicht_belegt',
      ['TCZ7003','TCZ7033'], ['media3.bsh-group.com']],
  ];
  const invalid = [{modell: 'EP2220', filter: 'AquaClean'}, {modell: 'ECAM22.110', filter: 'DLSC002'},
    {modell: 'EP2220/10', filter: 'CA6903/11'},
    {modell: 'TIE20301', filter: 'TCZ8003'}, {modell: 'EP2220/10'}, {filter: 'AquaClean'}];
  const related = [
    'Welcher Wasserfilter passt in meine Philips EP2220/10: AquaClean oder BRITA Intenza?',
    'Passt AquaClean CA6903/10 in die Philips EP2220/10?',
    'Passt CA6903/10 in meinen Philips LatteGo EP2231/40?',
    'Passt TCZ7003 in Bosch TIE20301?',
    'Bosch TIE20301 TCZ7003 oder TCZ7033 als Wasserfilter',
    'Passt DLSC002 in meine DeLonghi ECAM22.110.B?',
  ];
  const other = [
    ['Mein AquaClean blinkt orange beim Philips EP2220/10, was heißt das?', 'philips_aquaclean_orange_blinkt_blau_filteranzeige'],
    ['Der Filter DLSC002 blieb nach vier Wochen Stillstand in der DeLonghi ECAM22.110.B. Muss ich ihn tauschen?',
      'delonghi_magnifica_filter_stillstand_drei_wochen'],
    ['Kann ich den Philips EP2220/10 AquaClean nach dem Filterwechsel zurücksetzen?', null],
    ['Wie wechsle ich den AquaClean Filter beim Philips EP2231/40 und setze die Anzeige zurück?', null],
    ['Passt ein AquaClean CA6903/10 in Philips EP2220/11?', null],
    ['Nicht die Philips EP2220/10, sondern EP2220/12: passt AquaClean CA6903/10?', null],
    ['Ersatzfilter für Levoit Core 300S', 'luftreiniger_ersatzfilter_zuordnung'],
  ];
  const searches = [...related, ...other.map(([query]) => query)];
  const inputs = [...cases.map(([input]) => input), ...invalid];
  const compact = compactReplies([
    ...searches.map(frage => toolCall(compactFind, {frage})),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of searches.entries()) {
    const hits = compact[index].result.structuredContent.tools;
    const first = hits[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index >= related.length) {
      const expected = other[index - related.length][1];
      if (expected) assert.equal(first?.name, expected, query);
      assert.notEqual(first?.name, name, query);
      continue;
    }
    assert.equal(first?.name, name, query);
    assert.deepEqual([first.citation_url, first.guide_url], [citation, guide]);
    assert.deepEqual(first.inputSchema.required, ['modell','filter']);
  }
  const jobs = inputs.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of inputs.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    const [, status, allowed, hosts] = cases[index];
    assert.deepEqual([data.angebotszuordnung, data.ausgewiesene_kennung_oder_familie], [status, allowed]);
    assert.deepEqual([data.citation_url, data.guide_url], [citation, guide]);
    const evidence = [data.beleg].flat().filter(Boolean);
    assert.deepEqual(evidence.map(item => new URL(item.quelle).hostname), hosts);
    const packReference = evidence.find(item => item.quelle === exactPackSource);
    const exactPack = inputs[index].filter === 'CA6903/10' && status === found;
    if (exactPack) assert.match(packReference?.fundstelle, /CA6903\/10.*Series 2200/);
    else assert.equal(packReference, undefined);
    assert.ok(evidence.every(item => item.fundstelle &&
      item.geprueft_am === (item === packReference ? '2026-11-22' : '2026-11-20')));
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio distinguishes exact Trotec TTK 75 ECO evidence and unsupported conditions', () => {
  const name = 'trotec_ttk75_eco_pruefpunkt';
  const citation = 'https://getecoback.com/guide/trotec-luftentfeuchter-test.html';
  const guide = citation + '#ttk75-pruefpunkt';
  const manual = 'https://de.trotec.com/fileadmin/downloads/Entfeuchtung/TTK75ECO/TRT-BA-TTK75ECO-TC-010-DE.pdf';
  const supplier = 'https://www.baushop-express.com/trotec-kondensationsentfeuchter-ttk-eco.html';
  const base = {modell: 'ttk_75_eco', temperatur_c: 30, luftfeuchte_prozent: 80};
  const outside = ['ausserhalb_betriebsbereich', null, null];
  const unknown = ['kein_pruefpunkt', null, null];
  const cases = [
    [{}, ['hersteller_pruefpunkt', 20, null]],
    [{temperatur_c: 20, luftfeuchte_prozent: 60}, ['lieferantenwert_abgleichen', null, 6.4]],
    [{temperatur_c: 10, luftfeuchte_prozent: 60}, unknown],
    [{temperatur_c: 29.999}, unknown],
    [{luftfeuchte_prozent: 79.999}, unknown],
    [{temperatur_c: 5, luftfeuchte_prozent: 30}, unknown],
    [{temperatur_c: 32, luftfeuchte_prozent: 90}, unknown],
    [{temperatur_c: 4.999}, outside],
    [{temperatur_c: 32.001}, outside],
    [{luftfeuchte_prozent: 29.999}, outside],
    [{luftfeuchte_prozent: 90.001}, outside],
    [{modell: 'abweichend_oder_offen'}, ['modell_klaeren', null, null]],
  ];
  const invalid = [{...base, modell: 'ttk_75_e'}, {...base, temperatur_c: '30'}, {...base, temperatur_c: undefined},
    {...base, luftfeuchte_prozent: 101}, {...base, luftfeuchte_prozent: -1}, {...base, angebots_watt: 440}];
  const related = [
    'Wie viele Liter entzieht der Trotec TTK 75 ECO bei 30 °C und 80 Prozent relativer Luftfeuchte?',
    'Bringt der Trotec TTK 75 ECO bei 10 Grad und 60 Prozent Luftfeuchte im Keller auch 21 Liter am Tag?',
    'Kann ich beim Trotec TTK-75-ECO mit 20l/24h rechnen?',
  ];
  const separate = [
    'Wie viele Liter entzieht der Trotec TTK 75 E bei 30 Grad und 80 Prozent Luftfeuchte?',
    'Trotec TTK 72 E Entfeuchtungsleistung bei 20 Grad und 60 Prozent Luftfeuchte',
    'Verbraucht mein Trotec TTK 75 ECO 440 Watt, was kostet der Strom?',
    'Nicht TTK 75 ECO, sondern Trotec TTK 75 E: wie viel Wasser zieht der bei 30 °C und 80 %?',
    'Trotec TTK 75 ECO Pro Entfeuchtungsleistung bei 30 Grad und 80 Prozent Luftfeuchte',
  ];
  const searches = [...related, ...separate];
  const inputs = [...cases.map(([change]) => ({...base, ...change})), ...invalid];
  const compact = compactReplies([
    ...searches.map(frage => toolCall(compactFind, {frage})),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of searches.entries()) {
    const hits = compact[index].result.structuredContent.tools;
    const first = hits[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index >= related.length) {
      assert.ok(!hits.some(tool => tool.name === name), query);
      continue;
    }
    assert.equal(first?.name, name, query);
    assert.deepEqual([first.citation_url, first.guide_url], [citation, guide]);
    assert.deepEqual(first.inputSchema.required, Object.keys(base));
  }
  const jobs = inputs.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of inputs.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    assert.deepEqual([data.status, data.dokumentierter_entzug_l_24h, data.lieferantenwert_l_24h], cases[index][1]);
    assert.deepEqual([data.citation_url, data.guide_url], [citation, guide]);
    assert.deepEqual([data.hersteller_anleitung_url, data.druckseite, data.lieferantenquelle_url, data.quellen_geprueft_am],
      [manual, 14, supplier, '2026-11-22']);
    assert.deepEqual(data.betriebsbereich, data.status === 'modell_klaeren' ? null :
      {temperatur_c:[5,32],luftfeuchte_prozent:[30,90]});
    assert.match(data.grenze, /21 l\/24 h.*separat als Maximalwert/);
    assert.ok(!Object.keys(data).some(key => /watt|leistungsaufnahme|_w$|stromkosten|kwh/i.test(key)));
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio separates air-conditioner noise quantities, conditions and finder routes', () => {
  const name = 'klimaanlage_geraeusch_vergleich';
  const energy = 'pac_n90_energielabel_zu_stromkosten';
  const identity = 'pac_n90_ean_abgleichen';
  const citation = 'https://getecoback.com/guide/delonghi-pac-n90-test.html';
  const guide = citation + '#lautstaerke';
  const base = {
    pegel_a_dba: 52, pegel_b_dba: 64, groesse_a: 'schalldruck',
    groesse_b: 'schallleistung', gleiche_bedingungen: true,
  };
  const cases = [
    [{}, false, null],
    [{groesse_a: 'schallleistung'}, true, 12],
    [{groesse_b: 'schalldruck', gleiche_bedingungen: false}, false, null],
    [{groesse_b: 'schalldruck', pegel_a_dba: 51.2, pegel_b_dba: 47.1}, true, -4.1],
    [{groesse_a: 'unbekannt', groesse_b: 'unbekannt'}, false, null],
    [{groesse_b: 'schalldruck', pegel_b_dba: 52}, true, 0],
  ];
  const invalid = [{...base, pegel_a_dba: -0.1}, {...base, pegel_b_dba: 131},
    {...base, gleiche_bedingungen: 'true'}, {...base, groesse_a: 'lautstaerke'},
    {...base, pegel_b_dba: undefined}, {...base, pegel_a_dba: '52'}];
  const lookups = [
    ['Kann ich 52 dB(A) Schalldruck und 64 dB(A) Schallleistung bei zwei Klimaanlagen vergleichen?', name, guide],
    ['Midea PortaSplit 39 dB(A) oder PAC N90 64 dB(A): Welche ist leiser im Schlafzimmer?', name, guide],
    ['Midea PortaSplit 39 dB Schalldruck innen oder 62 dB Schallleistung außen vergleichen', name, guide],
    ['PAC N90 50–52 dB Schalldruck gegen 64 dB Schallleistung vergleichen?', name, guide],
    ['Midea PortaSplit 39 dB und De’Longhi Pinguino N90 64 dB im Schlafzimmer vergleichen', name, guide],
    ['Sind 39 und 64 Dezibel bei Midea PortaSplit und PAC N90 vergleichbar?', name, guide],
    ['DeLonghi PAC N90 ECO Silent Energielabel Stromkosten 8004399512351', energy, citation + '#n90-energielabel'],
    ['8004399512351', identity, citation + '#testlage'],
  ];
  const other = [
    'Kann man den Schalldruck zweier Luftreiniger im Schlafzimmer vergleichen?',
    'Lautstärke Klimaanlage klappert plötzlich, was tun?',
    'Wie laut ist die Midea PortaSplit nachts?',
    'Ist die PortaSplit Lite mit 39 dB oder der N90 mit 64 dB leiser?',
  ];
  const unsupportedEans = ['4048164122424', '4048164122301'].map(ean =>
    `Midea PortaSplit EAN ${ean} oder PAC N90, 39 dB Schalldruck und 64 dB Schallleistung vergleichen`);
  const searches = [...lookups.map(([query]) => query), ...other, ...unsupportedEans];
  const inputs = [...cases.map(([change]) => ({...base, ...change})), ...invalid];
  const compact = compactReplies([
    ...searches.map(frage => toolCall(compactFind, {frage})),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of searches.entries()) {
    const hits = compact[index].result.structuredContent.tools;
    const first = hits[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index >= lookups.length + other.length) {
      assert.ok(hits.every(tool => tool.name !== name), query);
      continue;
    }
    if (index >= lookups.length) {
      assert.notEqual(first?.name, name, query);
      continue;
    }
    const [, expected, target] = lookups[index];
    assert.equal(first?.name, expected, query);
    assert.deepEqual([first.citation_url, first.guide_url], [citation, target]);
    if (expected === name) {
      assert.deepEqual(first.inputSchema.required, Object.keys(base));
      assert.ok(!hits.some(tool => tool.name === energy), query);
    }
  }
  const jobs = inputs.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of inputs.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    const [, comparable, difference] = cases[index];
    assert.deepEqual([data.vergleichbar, data.differenz_b_minus_a_db], [comparable, difference]);
    assert.deepEqual([data.citation_url, data.guide_url], [citation, guide]);
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio compares the full stated gap with the documented German tesamoll profile bands', () => {
  const name = 'tesamoll_fensterdichtung_profil_pruefen';
  const groove = 'fensterdichtung_falz_profilabgleich';
  const citation = 'https://getecoback.com/guide/fenster-zugluft-mietwohnung.html';
  const guide = citation + '#dichtungsprofil';
  const catalog = 'https://www.tesa.com/de-de/files/download/11555752%2C4%2Ctesa-consumerkatalog-2024-online.pdf';
  const instructions = 'https://www.tesa.com/de-de/buero-und-zuhause/do-it-yourself-magazin/fensterdichtung-erneuern.html';
  const base = {dichtungsart: 'tesamoll_klebeprofil', spalt_min_mm: 4, spalt_max_mm: 4};
  const allowed = 'abmessungen_passender_profile';
  const measure = 'messwerte_klaeren';
  const defer = 'fenstersystem_klaeren';
  const none = 'kein_dokumentiertes_profil';
  const cases = [
    [{}, allowed, ['P','D']],
    [{spalt_min_mm: 1, spalt_max_mm: 1}, allowed, ['E']],
    [{spalt_min_mm: 3, spalt_max_mm: 3.5}, allowed, ['E','P','D']],
    [{spalt_min_mm: 1, spalt_max_mm: 7}, none, []],
    [{spalt_min_mm: 0}, measure, []],
    [{spalt_max_mm: 0}, measure, []],
    [{spalt_min_mm: 5, spalt_max_mm: 2}, measure, []],
    [{dichtungsart: 'nutdichtung'}, defer, []],
    [{dichtungsart: 'zusatzdichtung'}, defer, []],
    [{dichtungsart: 'unbekannt'}, defer, []],
  ];
  const invalid = [{...base, dichtungsart: 'silikon'}, {...base, spalt_min_mm: -0.01},
    {...base, spalt_min_mm: '4'}, {...base, spalt_max_mm: undefined},
    {...base, profil_erzwungen: 'D'}];
  const related = [
    'Welches tesamoll E-, P- oder D-Profil passt bei 4 mm Spalt?',
    'tesamoll Fensterdichtung für 3 bis 3,5 mm Spalt: E, P oder D?',
  ];
  const legacy = 'Meine Fensterdichtung ist aus der Nut gezogen. Wie gleiche ich Nut und Falzprofil beim Ersatz ab?';
  const unrelated = [
    'tesamoll Silikonprofil für 4 mm Fensterdichtung',
    'Wie repariere ich undichte Dachfenster nach einem Sturm?',
  ];
  const searches = [...related, legacy, ...unrelated];
  const args = [...cases.map(([change]) => ({...base, ...change})), ...invalid];
  const compact = compactReplies([
    ...searches.map(frage => toolCall(compactFind, {frage})),
    ...args.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of searches.entries()) {
    const hits = compact[index].result.structuredContent.tools;
    const first = hits[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index >= related.length) {
      assert.ok(!hits.some(tool => tool.name === name), query);
      if (query === legacy) assert.equal(first?.name, groove, query);
      continue;
    }
    assert.equal(first?.name, name, query);
    assert.deepEqual([first.citation_url, first.guide_url], [citation, guide]);
    assert.deepEqual(first.inputSchema.required, Object.keys(base));
  }
  const jobs = args.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of args.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    const [, status, profiles] = cases[index];
    assert.deepEqual([data.status, data.passende_profile], [status, profiles]);
    assert.deepEqual([data.citation_url, data.guide_url, data.hersteller_katalog_url, data.hersteller_anleitung_url],
      [citation, guide, catalog, instructions]);
    assert.equal(data.katalog_druckseite, 28);
    assert.equal(data.quellen_geprueft_am, '2026-11-22');
    assert.deepEqual(data.dokumentierte_spaltbereiche_mm, {E:[1,3.5],P:[2,5],D:[3,7]});
    assert.match(data.grenze, /Entwässerungsöffnungen und vorgesehene Lüftung frei lassen/);
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio uses only the documented PortaSplit window-lip limits', () => {
  const name = 'midea_portasplit_fensterfalz_pruefen';
  const guide = bracketCitation + '#fensterfalz';
  const ean = 4048164116478;
  const manual = 'https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/PortaSplit-Gebrauchsanweisung-DE.pdf';
  const input = {
    angebot_ean: ean, halterung: 'original_standard', fenster: 'nach_innen_oeffnend',
    messbezug: 'falz_nach_zeichnung', falzbreite_mm: 45, falzhoehe_mm: 20,
  };
  const scopePending = ['halterung_oder_fenster_klaeren', null, null, null, null];
  const modelPending = ['modell_klaeren', null, null, null, null];
  const cases = [
    [{falzbreite_mm: 60, falzhoehe_mm: 0}, ['ausserhalb_dokumentierter_masse', 45, 20, -15, null]],
    [{}, ['masse_im_dokumentierten_rahmen', 45, 20, 0, 0]],
    [{messbezug: 'dichtung_oder_unklar', falzbreite_mm: 60}, ['messpunkt_oder_masse_klaeren', 45, 20, null, null]],
    [{falzbreite_mm: 0, falzhoehe_mm: 19.9}, ['ausserhalb_dokumentierter_masse', 45, 20, null, -0.1]],
    [{falzbreite_mm: 0, falzhoehe_mm: 20}, ['messpunkt_oder_masse_klaeren', 45, 20, null, 0]],
    [{angebot_ean: 0}, modelPending],
    [{angebot_ean: 4048164118687}, modelPending],
    [{halterung: 'anders_oder_offen'}, scopePending],
    [{fenster: 'anders_oder_offen'}, scopePending],
  ];
  const invalid = [{...input, angebot_ean: ean + 0.5}, {...input, angebot_ean: '4048164116478'},
    {...input, angebot_ean: 123456789012}, {...input, falzbreite_mm: -1},
    {...input, falzhoehe_mm: undefined}, {...input, zusaetzliches_mass: 5}];
  const queries = [
    ['4048164116478', name],
    ['EAN 4048164116478', name],
    ['Midea Porta-Split Original', name],
    ['Fensterfalzbreite für EAN 4048164116478 prüfen', name],
    ['Midea PortaSplit Fensterfalz 60 mm breit, reicht die Standardhalterung?', name],
    ['Muss ich bei der Midea PortaSplit die Gummidichtung beim Fensterrahmen mitmessen?', name],
    ['Die PortaSplit passt nicht ans Fenster, wo muss ich die Rahmendicke messen?', name],
    ['Midea PortaSplit Dachfenster Halterung', bracketTool],
    ['Passt die Midea PortaSplit Universalhalterung fürs Dachfenster?', bracketTool],
  ];
  const otherVariants = [
    'Midea PortaSplit Pro: Passt die Standardhalterung an meinen 60 mm Fensterfalz?',
    'Midea PortaSplit Lite Dachfenster Universalhalterung',
    'PortaSplit 4048164122424 Fensterfalz',
    'PortaSplit 4048164122301 Fensterfalz',
    'PortaSplit 4048164116478 oder 4048164122424 Fensterfalz',
    'Midea PortaSplit Cool 4048164116478 Fensterfalz',
  ];
  const args = [...cases.map(([change]) => ({...input, ...change})), ...invalid];
  const searches = [...queries.map(([query]) => query), ...otherVariants];
  const compact = compactReplies([
    ...searches.map(frage => toolCall(compactFind, {frage})),
    ...args.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of searches.entries()) {
    const hits = compact[index].result.structuredContent.tools;
    const first = hits[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index < 2) assert.deepEqual(hits.map(tool => tool.name), [name], query);
    if (index >= queries.length) {
      assert.ok(!hits.some(tool => [name, bracketTool].includes(tool.name)), query);
      continue;
    }
    const expected = queries[index][1];
    assert.equal(first?.name, expected, query);
    assert.equal(first.citation_url, bracketCitation);
    assert.equal(first.guide_url, expected === name ? guide : bracketGuide);
    if (expected === name) assert.deepEqual(first.inputSchema.required, Object.keys(input));
    else assert.ok(!hits.some(tool => tool.name === name), query);
  }
  const jobs = args.map((arguments_, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, arguments_)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of args.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[searches.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    assert.deepEqual([data.status, data.breite_max_mm, data.hoehe_min_mm,
      data.breite_unter_max_mm, data.hoehe_ueber_min_mm], cases[index][1]);
    assert.deepEqual([data.referenz_ean, data.citation_url, data.guide_url, data.hersteller_anleitung_url, data.druckseite],
      [ean, bracketCitation, guide, manual, 15]);
    assert.match(data.grenze, /noch keine Aufstellung oder Befestigung/);
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio checks German N90 identity and separates it from energy-cost intent', () => {
  const name = 'pac_n90_ean_abgleichen';
  const costs = 'pac_n90_energielabel_zu_stromkosten';
  const citation = 'https://getecoback.com/guide/delonghi-pac-n90-test.html';
  const guide = citation + '#testlage';
  const exact = 8004399512351;
  const label = 'PAC N90 ECO Silent';
  const queries = [
    ['8004399512351', name],
    ['De’Longhi PAC N90: Ist der Barcode 8004399512351 auf dem Typenschild richtig?', name],
    ['Ist das Angebot für den DeLonghi PAC N90 dieselbe Modellvariante?', name],
    ['Ist das Angebot mit 8004399512351 auch die ECO-Silent-Version?', name],
    ['Stimmt die Typenbezeichnung De’Longhi PAC N90 im deutschen Angebot ohne ECO Silent?', name],
    ['DeLonghi PAC N90 ECO Silent Energielabel Stromkosten 8004399512351', costs],
    ['Was verbraucht das PAC N90 ECO Silent laut EAN 8004399512351 im Betrieb?', costs],
    ['PAC N90 mit EAN 8004399512351: Leistungsaufnahme in W?', costs],
  ];
  const unrelated = [
    'Welcher GTIN steht auf dem Typenschild des DeLonghi PAC EX105?',
    'DeLonghi PAC EX105 Energielabel Stromkosten',
  ];
  const cases = [
    [{ean: exact, modell: label}, 'modellangaben_passen'],
    [{ean: exact, modell: 'abweichend'}, 'modellbezeichnung_klaeren'],
    [{ean: exact, modell: 'unbekannt'}, 'modellbezeichnung_klaeren'],
    [{ean: exact + 1, modell: label}, 'ean_abweicht'],
    [{ean: 0, modell: label}, 'ean_fehlt'],
    [{ean: 0, modell: 'unbekannt'}, 'ean_fehlt'],
  ];
  const invalid = [{ean: exact}, {ean: String(exact), modell: label},
    {ean: exact + 0.5, modell: label}, {ean: 123456789012, modell: label},
    {ean: exact * 10, modell: label}, {ean: exact, modell: 'PAC N90 ECO'},
    {ean: -1, modell: label}];
  const args = [...cases.map(([input]) => input), ...invalid];
  const search = [...queries.map(([frage]) => frage), ...unrelated];
  const compact = compactReplies([
    ...search.map(frage => toolCall(compactFind, {frage})),
    ...args.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, [query, expected]] of queries.entries()) {
    const hits = compact[index].result.structuredContent.tools;
    const first = hits[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    assert.equal(first?.name, expected, query);
    assert.equal(first.citation_url, citation);
    assert.equal(first.guide_url, expected === name ? guide : citation + '#n90-energielabel');
    if (expected === name) {
      assert.ok(!hits.some(tool => tool.name === costs), query);
      assert.deepEqual(first.inputSchema.required, ['ean', 'modell']);
      assert.deepEqual(first.inputSchema.properties.modell.enum, [label, 'abweichend', 'unbekannt']);
    }
  }
  for (const [index, query] of unrelated.entries()) {
    const hits = compact[queries.length + index].result.structuredContent.tools;
    assert.ok(!hits.some(tool => [name, costs].includes(tool.name)), query);
  }
  const jobs = args.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of args.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[search.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    assert.deepEqual([data.referenz_ean, data.referenz_modell, data.status], [exact, label, cases[index][1]]);
    assert.deepEqual([data.citation_url, data.guide_url], [citation, guide]);
    assert.equal(data.hersteller_url, 'https://www.delonghi.com/de-de/s/PACN90ECOSILENT');
    assert.equal(data.datenblatt_url,
      'https://shop.sonepar.at/asset_external/downloads/pim/400901/datasheet_delonghi_PAC%20N90ECO.pdf');
    assert.match(data.datenblatt_hinweis, /österreichischen.*Lieferumfang.*Bestand/);
    assert.match(data.naechster_schritt, index === 0 ? /Abluftweg/ : /Typenschild/);
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio checks exact, touching and clipped hygrometer measurement ranges', () => {
  const name = 'hygrometer_messbereiche';
  const citation = 'https://getecoback.com/guide/luftfeuchtigkeit-richtig-messen.html';
  const guide = citation + '#hygrometer-vergleichen';
  const authority = 'https://www.tfa-dostmann.de/service/faq/';
  const args = (a, da, b, db) => ({
    reading_a_pct: a, accuracy_a_pp: da, reading_b_pct: b, accuracy_b_pp: db,
  });
  const cases = [
    [args(55, 3, 60, 3), [5, true, [52, 58], [57, 63], [57, 58]]],
    [args(55.1, 2.5, 60.2, 2.6), [5.1, true, [52.6, 57.6], [57.6, 62.8], [57.6, 57.6]]],
    [args(60.2, 2.6, 55.1, 2.5), [5.1, true, [57.6, 62.8], [52.6, 57.6], [57.6, 57.6]]],
    [args(55.1, 2.5, 60.200001, 2.6), [5.1, false, [52.6, 57.6], [57.600001, 62.800001], null]],
    [args(1, 3, 99, 3), [98, false, [0, 4], [96, 100], null]],
  ];
  const invalid = [args(55, 3, 60), args(55, -0.1, 60, 3), args(55, 25.01, 60, 3),
    args(55, 3, 100.01, 3), args('55', 3, 60, 3), {...args(55, 3, 60, 3), calibrate: true}];
  const related = [
    'Zwei Hygrometer nebeneinander zeigen 55 und 60 Prozent, beide ±3 Prozentpunkte.',
    'Hygrometer A und Hygrometer B am selben Messort zeigen Unterschiede, wie viel Toleranz ist normal?',
    'Zwei Hygrometer unterscheiden sich am selben Ort um 5 Prozentpunkte.',
    'Zwei Hygrometer haben am gleichen Standort eine Differenz von 5 Prozentpunkten.',
  ];
  const separate = [
    'Muss ich beide Hygrometer mit einem Salztest kalibrieren?',
    'Wie prüfe ich mit einer Referenz die Abweichung von zwei Hygrometern?',
    'Wie hoch soll ein Hygrometer an der Fensterbank stehen?',
  ];
  const queries = [...related, ...separate];
  const inputs = [...cases.map(([input]) => input), ...invalid];
  const compact = compactReplies([
    ...queries.map(frage => toolCall(compactFind, {frage})),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, query] of queries.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.deepEqual(first, findTools(query).tools[0]);
    if (index >= related.length) {
      assert.notEqual(first?.name, name, query);
      continue;
    }
    assert.equal(first?.name, name, query);
    assert.deepEqual([first.citation_url, first.guide_url], [citation, guide]);
    assert.deepEqual(first.inputSchema.required, Object.keys(args(0, 0, 0, 0)));
  }
  const jobs = inputs.map((input, index) => ({jsonrpc: '2.0', id: index + 1, ...toolCall(name, input)}));
  const full = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index] of inputs.entries()) {
    const result = full.get(index + 1);
    assert.deepEqual(result, compact[queries.length + index].result);
    if (index >= cases.length) {
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      continue;
    }
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    assert.deepEqual([data.difference_pp, data.stated_ranges_overlap, data.range_a_pct,
      data.range_b_pct, data.overlap_range_pct], cases[index][1]);
    assert.deepEqual([data.citation_url, data.guide_url, data.guidance_source], [citation, guide, authority]);
    assert.match(data.assumption, /keine Kalibrierungsfrage/);
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio estimates electric blanket costs from explicit user inputs only', () => {
  const name = 'heizdecke_stromkosten_nennleistung';
  const citation = 'https://getecoback.com/guide/heizdecke-stromverbrauch.html';
  const guide = citation+'#waerme-rechner';
  const source = 'https://verbraucherzentrale-energieberatung.de/energie-sparen/allgemeines/stromverbrauch-messen/';
  const queries = [
    'Was kostet eine Heizdecke mit 110 Watt für 2 Stunden bei 35 Cent pro kWh?',
    'Wie hoch ist der Stromverbrauch meiner Heizdecke mit 110 Watt?',
    'Stromkosten für meine Wärmezudecke pro Abend berechnen',
  ];
  const unrelated = [
    'Wie viel kostet die Anschaffung einer Heizdecke?',
    'Ist es sicher, eine Heizdecke im Schlaf unbeaufsichtigt zu nutzen?',
    'Was kostet der Betrieb eines Heizlüfters mit 1100 Watt?',
    'Was kostet Meine Heizdecke oder die Raumerwärmung per Gasheizung im Vergleich?',
    'Was kostet meine Heizdecke laut gemessenen 0,12 kWh je Abend?',
  ];
  const base = {nennleistung_w:110,laufzeit_h:2,arbeitspreis_kwh:0.35};
  const cases = [
    [{...base,nutzungstage:30},[0.22,0.077,6.6,2.31,'EUR',30]],
    [base,[0.22,0.077,0.22,0.077,'EUR',1]],
    [{...base,nutzungstage:30,waehrung:'CHF'},[0.22,0.077,6.6,2.31,'CHF',30]],
    [{...base,arbeitspreis_kwh:0},[0.22,0,0.22,0,'EUR',1]],
  ];
  const invalid = [
    {}, {nennleistung_w:110,laufzeit_h:2}, {...base,nennleistung_w:'110 W'},
    {...base,arbeitspreis_kwh:35}, {...base,nutzungstage:4.5}, {...base,waehrung:'GBP'},
    {...base,laufzeit_h:25}, {...base,nennleistung_w:501}, {...base,modell:'unknown'},
  ];
  const inputs = [...cases.map(([args])=>args),...invalid];
  const searches = [...queries,...unrelated];
  const compact = compactReplies([
    ...searches.map(frage=>toolCall(compactFind,{frage})),
    ...inputs.map(eingaben=>toolCall(compactRun,{name,eingaben})),
  ]);
  for (const [index,frage] of queries.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name,name,frage);
    assert.deepEqual(first,findTools(frage).tools[0]);
    assert.deepEqual([first.citation_url,first.guide_url],[citation,guide]);
    assert.deepEqual(first.inputSchema.required,['nennleistung_w','laufzeit_h','arbeitspreis_kwh']);
  }
  for (const [index,frage] of unrelated.entries()) {
    const hits = compact[queries.length+index].result.structuredContent.tools;
    assert.ok(!hits.some(tool=>tool.name===name),frage);
  }
  const jobs = inputs.map((args,index)=>({jsonrpc:'2.0',id:index+1,...toolCall(name,args)}));
  const standard = new Map(readStdio(jobs).map(reply=>[reply.id,reply.result]));
  for (const [index] of inputs.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[searches.length+index].result);
    if (index >= cases.length) {
      assert.equal(result.isError,true);
      assert.equal(result.structuredContent,undefined);
      continue;
    }
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.equal(data.berechnungsart,'nennleistung_schaetzung');
    assert.deepEqual([data.energie_kwh_pro_nutzung,data.kosten_pro_nutzung,data.energie_kwh_gesamt,
      data.kosten_gesamt,data.waehrung,data.nutzungstage],cases[index][1]);
    assert.deepEqual([data.citation_url,data.guide_url,data.guidance_source],[citation,guide,source]);
    assert.match(data.hinweis,/Geräteanleitung/);
    assert.match(data.hinweis,/messen/);
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('offline stdio distinguishes exact Philips humidifier filters, variants and unknown models', () => {
  const name = 'philips_verdunsterfilter_zuordnung';
  const citation = 'https://getecoback.com/guide/luftbefeuchter-ratgeber.html';
  const guide = citation + '#philips-verdunsterfilter';
  const source = 'https://acc.philips.de/c-e/ho/luftreiniger-und-luftbefeuchter/air-purifier-filter-replacement';
  const queries = [
    'Welcher Ersatzfilter passt zum Philips HU4803/01?',
    'Passt FY2401/30 in den Philips HU2716/10?',
    'Welchen Filter braucht mein Philips Series 2000 Luftbefeuchter?',
  ];
  const unrelated = [
    'Welcher Ersatzfilter passt in den Philips Luftreiniger AC2889?',
    'Wie oft sollte ich den Filter meines Philips HU4803/01 wechseln?',
  ];
  const cases = [
    [{model:'HU4803/01'},'documented_variant','FY2401/30','#philips-hu4803-01'],
    [{model:'HU2716/10',candidate:' fy3446/30 '},'documented_variant','FY3446/30','#philips-hu2716-10'],
    [{model:'HU2716/10',candidate:'FY2401/30'},'candidate_not_documented','FY3446/30','#philips-hu2716-10'],
    [{model:'HU4803/01',candidate:'FY2401/31'},'candidate_not_documented','FY2401/30','#philips-hu4803-01'],
    [{model:'unknown',candidate:'FY2401/30'},'identify_model',null,null],
  ];
  const invalid = [{model:'HU4803/03'},{model:'HU2716'},{model:'AC2889'},{candidate:'FY2401/30'},
    {model:'HU4803/01',candidate:''},{model:'HU4803/01',candidate:'X'.repeat(25)}];
  const inputs = [...cases.map(([args])=>args),...invalid];
  const lookup = [...queries,...unrelated];
  const compact = compactReplies([
    ...lookup.map(frage=>toolCall(compactFind,{frage})),
    ...inputs.map(eingaben=>toolCall(compactRun,{name,eingaben})),
  ]);
  for (const [index,frage] of queries.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name,name,frage);
    assert.deepEqual(first,findTools(frage).tools[0]);
    assert.deepEqual([first.citation_url,first.guide_url],[citation,guide]);
    assert.deepEqual(first.inputSchema.required,['model']);
    assert.deepEqual(first.inputSchema.properties.model.enum,['HU4803/01','HU2716/10','unknown']);
  }
  for (const [index,frage] of unrelated.entries()) {
    const hits = compact[queries.length+index].result.structuredContent.tools;
    assert.ok(!hits.some(tool=>tool.name===name),frage);
  }
  const jobs = inputs.map((args,index)=>({jsonrpc:'2.0',id:index+1,...toolCall(name,args)}));
  const standard = new Map(readStdio(jobs).map(reply=>[reply.id,reply.result]));
  const now = new Date();
  const days = (Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()) - Date.parse('2026-11-22')) / 86400000;
  const fresh = days >= 0 && days <= 90;
  for (const [index,args] of inputs.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[lookup.length+index].result);
    if (index >= cases.length) {
      assert.equal(result.isError,true);
      assert.equal(result.structuredContent,undefined);
      continue;
    }
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    const [,status,part,anchor] = cases[index];
    assert.deepEqual([data.citation_url,data.guide_url,data.manufacturer_source,data.source_checked,data.market],
      [citation,guide,source,'2026-11-22','DE']);
    assert.equal(data.status,!anchor || fresh ? status : 'source_recheck');
    assert.equal(data.part_number,fresh ? part : null);
    if (anchor) {
      assert.equal(data.exact_model,args.model);
      assert.equal(data.model_guide_url,citation+anchor);
      assert.equal(new URL(data.manufacturer_datasheet).hostname,'www.documents.philips.com');
    } else {
      assert.equal(Object.hasOwn(data,'model_guide_url'),false);
      assert.equal(Object.hasOwn(data,'manufacturer_datasheet'),false);
    }
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('both offline stdio profiles find exact German replacement filters without using unsupported variants', () => {
  const name = 'luftreiniger_ersatzfilter_zuordnung';
  const citation = 'https://getecoback.com/ersatzfilter.html';
  const guide = citation + '#finder';
  const queries = [
    'Welcher Ersatzfilter passt in meinen Beurer LR 401?',
    'Ich brauche einen neuen Filter für den Levoit Core 300S ohne Pro. Welche Variante passt?',
    'Passt der Ersatzfilter in mein Luftreinigermodell?',
  ];
  const unrelated = [
    'Welcher Ersatzfilter passt in den Levoit Core 300S Pro?',
    'Welcher Ersatzfilter passt in den Levoit Core 300S-P?',
    'Welcher Ersatzfilter passt in den Philips AC2889?',
    'Darf ich den Filter vom Levoit Core 300S waschen?',
    'Kann ich einen Ersatzfilter für Beurer LR 401 und LR 405 tauschen?',
    'Welcher Ersatzfilter passt in den Xiaomi LR 401?',
    'Welcher Ersatzfilter passt in den Dyson Core 300S?',
    'Welcher Ersatzfilter passt in den Levoit Core 300S Plus?',
    'Welcher Ersatzfilter passt in den Beurer LR 401 Premium?',
  ];
  const cases = [
    ['beurer-lr401','LR 401','69309','https://www.beurer.com/de/p/69309/'],
    ['levoit-core-300s','Core 300S',null,'https://levoit.de/products/levoit-core-300-und-core-300s-ersatzfilter-hepa-filter'],
  ];
  const models = [...cases.map(([model])=>model),'unknown','levoit-core-300s-pro','levoit-core-300s-p','philips-ac2889','beurer-lr405'];
  const searches = [...queries,...unrelated];
  const compact = compactReplies([
    ...searches.map(frage=>toolCall(compactFind,{frage})),
    ...models.map(model=>toolCall(compactRun,{name,eingaben:{model}})),
  ]);
  for (const [index,frage] of queries.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name,name,frage);
    assert.deepEqual(first,findTools(frage).tools[0]);
    assert.deepEqual([first.citation_url,first.guide_url],[citation,guide]);
    assert.deepEqual(first.inputSchema.required,['model']);
    assert.deepEqual(first.inputSchema.properties.model.enum,['levoit-core-300s','beurer-lr401','unknown']);
  }
  for (const [index,frage] of unrelated.entries()) {
    const hits = compact[queries.length+index].result.structuredContent.tools;
    assert.ok(!hits.some(tool=>tool.name===name),frage);
  }
  const jobs = models.map((model,index)=>({jsonrpc:'2.0',id:index+1,...toolCall(name,{model})}));
  const standard = new Map(readStdio(jobs).map(reply=>[reply.id,reply.result]));
  const date = new Date();
  const days = (Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()) - Date.parse('2026-11-15')) / 86400000;
  const evidenceCurrent = days >= 0 && days <= 30;
  for (const [index,model] of models.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[searches.length+index].result);
    if (model !== 'unknown' && index >= cases.length) {
      assert.equal(result.isError,true);
      assert.equal(result.structuredContent,undefined);
      continue;
    }
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.deepEqual([data.citation_url,data.guide_url],[citation,guide]);
    if (model === 'unknown') {
      assert.equal(data.status,'identify_model');
      for (const field of ['model_guide_url','manufacturer_source','part_number']) assert.equal(Object.hasOwn(data,field),false);
    } else {
      const [,modelLabel,part,source] = cases[index];
      assert.equal(data.status,evidenceCurrent?'documented_variant':'source_recheck');
      assert.equal(data.exact_model,modelLabel);
      assert.equal(data.manufacturer_source,source);
      assert.equal(data.source_checked,'2026-11-15');
      assert.equal(data.part_number,evidenceCurrent?part:null);
      assert.equal(typeof data.filter_name,evidenceCurrent?'string':'object');
      if (!evidenceCurrent) assert.equal(data.filter_name,null);
      assert.equal(data.model_guide_url,citation+'#'+model);
    }
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('both offline stdio profiles make cellar ventilation decisions from five measured values', () => {
  const name = 'keller_lueften_taupunkt_messwerte';
  const legacy = 'taupunkt_lueften';
  const citation = 'https://getecoback.com/guide/keller-lueften-sommer.html';
  const guide = citation + '#taupunkt';
  const indoor = {innen_c:17,innen_rh_prozent:65};
  const outside = {aussen_c:10,aussen_rh_prozent:80};
  const initial = {...outside,...indoor,wand_c:15};
  const cases = [
    [{...initial,aussen_c:28,aussen_rh_prozent:60},['kondensationsrisiko',19.5,10.4,-4.5,-9.1,false]],
    [initial,['probeweise_lueften',6.7,10.4,8.3,3.7,false]],
    [{...initial,wand_c:7},['grenzbereich_nachmessen',6.7,10.4,0.3,3.7,true]],
    [{...initial,aussen_c:20,aussen_rh_prozent:70,wand_c:16},['keine_trocknung',14.4,10.4,1.6,-4,false]],
    [{...initial,aussen_rh_prozent:100,innen_c:20,wand_c:11},['grenzbereich_nachmessen',10,13.2,1,3.2,true]],
  ];
  const invalid = [{...outside,innen_c:17,wand_c:15},{...initial,innen_rh_prozent:0},{...initial,wand_c:'15'}];
  const queries = [
    'Soll ich meinen Keller jetzt lüften? Draußen 28 °C und 60 %, drinnen 17 °C und 65 %, Wand 15 °C.',
    'Kann ich das Kellerfenster jetzt öffnen, draußen 10 °C und 80 %, innen 17 °C und 65 %, die Wand 15 °C?',
  ];
  const unrelated = [
    'Wie lange soll ich meinen Keller lüften und wie oft?',
    'Wie lüfte ich den Keller bei Radon?',
    'Wie soll ich bei erhöhtem CO₂ im Keller lüften?',
    'Wie soll ich bei erhöhtem CO2 im Keller lüften?',
    'Darf ich bei Wassereintritt in den Keller lüften oder soll zuerst ein Gutachter kommen?',
    'Keller feuchte Wand: Außen 28 Grad/60 %, innen 17 Grad/65 %. Was ist die Ursache der nassen Stelle?',
    'Kann ich verschimmelte Kartons im Keller durch Lüften trocknen?',
  ];
  const inputs = [...cases.map(([args])=>args),...invalid];
  const legacyArgs = {aussen_temp_c:18,aussen_luftfeuchte_prozent:60,innen_temp_c:16};
  const compact = compactReplies([
    ...[...queries,...unrelated].map(frage=>toolCall(compactFind,{frage})),
    ...inputs.map(eingaben=>toolCall(compactRun,{name,eingaben})),
    toolCall(compactRun,{name:legacy,eingaben:legacyArgs}),
  ]);
  for (const [index,frage] of queries.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name,name,frage);
    assert.deepEqual(first,findTools(frage).tools[0]);
    assert.equal(first.guide_url,guide);
    assert.deepEqual(first.inputSchema.required,Object.keys(initial));
  }
  for (const [index,frage] of unrelated.entries()) {
    const hits = compact[queries.length+index].result.structuredContent.tools;
    assert.ok(!hits.some(tool=>tool.name===name),frage);
  }
  const jobs = [
    ...inputs.map((args,index)=>({jsonrpc:'2.0',id:index+1,...toolCall(name,args)})),
    {jsonrpc:'2.0',id:inputs.length+1,...toolCall(legacy,legacyArgs)},
  ];
  const standard = new Map(readStdio(jobs).map(reply=>[reply.id,reply.result]));
  for (const [index] of inputs.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[queries.length+unrelated.length+index].result);
    if (index >= cases.length) {
      assert.equal(result.isError,true);
      assert.equal(result.structuredContent,undefined);
      continue;
    }
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.deepEqual([
      data.status,data.aussen_taupunkt_c,data.innen_taupunkt_c,data.abstand_wand_aussentaupunkt_c,
      data.abstand_innen_aussentaupunkt_c,data.kondensation_innen_moeglich,
    ],cases[index][1]);
    assert.deepEqual([data.citation_url,data.guide_url,data.quellen_geprueft_am],[citation,guide,'2026-11-22']);
    assert.equal(new URL(data.quellen_url).hostname,'www.umweltbundesamt.de');
    assert.equal(new URL(data.verbraucherzentrale_url).hostname,'www.verbraucherzentrale.de');
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
  const ordinaryLegacy = standard.get(inputs.length+1);
  assert.deepEqual(ordinaryLegacy,compact.at(-1).result);
  assert.equal(ordinaryLegacy.isError,false);
  assert.equal(ordinaryLegacy.structuredContent,undefined);
  assert.match(ordinaryLegacy.content[0].text,/Außenluft: 10,1 °C/);
  assert.match(ordinaryLegacy.content[0].text,/geschätzten Wandtemperatur von 14,0 °C/);
});

test('both offline profiles find the short-uphill condensate route and preserve exact model evidence', () => {
  const name = 'entfeuchter_ablaufcheck';
  const citation = 'https://getecoback.com/guide/luftentfeuchter-keller.html';
  const guide = citation + '?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf';
  const source = 'https://www.meaco.de/produkt/meaco-dry-arete-one-pumpe/';
  const queries = [
    'Kellerentfeuchter: Mein Kondensatschlauch muss kurz über eine Türschwelle, aber der Abfluss liegt tiefer. Läuft das Wasser trotzdem ab?',
    'Der Ablaufschlauch vom Luftentfeuchter steigt kurz über die Türschwelle und fällt danach zum tieferen Bodenablauf. Brauche ich eine Pumpe?',
    'Kann ich den Abflussschlauch nach oben führen?',
  ];
  const unrelated = [
    'Mein Kondensatschlauch muss kurz über eine Türschwelle, aber der Abfluss liegt tiefer. Läuft das Wasser trotzdem ab?',
    'Meine Waschmaschine pumpt nicht ab. Kann der Ablaufschlauch über die Türschwelle?',
    'Darf ich einen Kabelkanal über die Türschwelle im Keller führen?',
  ];
  const cases = [
    [{drain:'level_or_uphill',model:'meaco-one-20'},'pump_check','DE'],
    [{drain:'level_or_uphill',model:'meaco-two-12',moisture:'normal'},'pump_check','DE'],
    [{drain:'downhill',model:'stadler-lukas'},'gravity_check','DE'],
    [{drain:'no_drain'},'tank',null],
    [{drain:'unknown',moisture:'damage'},'inspect_route',null],
  ];
  const compact = compactReplies([
    ...[...queries,...unrelated].map(frage=>toolCall(compactFind,{frage})),
    ...cases.map(([eingaben])=>toolCall(compactRun,{name,eingaben})),
  ]);
  for (const [index,frage] of queries.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name,name,frage);
    assert.deepEqual(first,findTools(frage).tools[0]);
    assert.equal(first.citation_url,citation);
    assert.equal(first.guide_url,guide);
    assert.deepEqual(first.inputSchema.required,['drain']);
    assert.deepEqual(first.example_arguments,cases[0][0]);
  }
  for (const [index,frage] of unrelated.entries()) {
    const hits = compact[queries.length+index].result.structuredContent.tools;
    assert.ok(!hits.some(tool=>tool.name===name),frage);
  }
  const jobs = cases.map(([input],index)=>({jsonrpc:'2.0',id:index+1,...toolCall(name,input)}));
  const standard = new Map(readStdio(jobs).map(reply=>[reply.id,reply.result]));
  for (const [index,[input,outcome,market]] of cases.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[queries.length+unrelated.length+index].result);
    assert.equal(result.isError,false);
    const output = result.structuredContent;
    assert.deepEqual([output.outcome,output.citation_url,output.guide_url],[outcome,citation,guide]);
    assert.equal(output.model_evidence?.source_market ?? null,market);
    if (input.model==='meaco-one-20') {
      assert.equal(output.model_evidence.source_url,source);
      assert.equal(output.model_evidence.checked,'2026-11-22');
      assert.match(output.model_evidence.note,/2[,.]5\s*m\b/);
      assert.match(output.model_evidence.note,/3(?:\s+|-)m\b/);
      assert.match(output.model_evidence.note,/6\s*m.+1[,.]5\s*m.+nicht bestätigt/);
      assert.match(output.answer,/Schwelle/i);
      assert.match(output.answer,/tiefer/i);
    } else {
      assert.notEqual(output.model_evidence?.source_url,source);
    }
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('both offline profiles use exact FRITZ 302 Danfoss evidence and leave unresolved valves open', () => {
  const name = 'fritz_302_danfoss_adapter';
  const citation = 'https://getecoback.com/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
  const guide = citation + '#fritz-302-danfoss-adapter';
  const searches = [
    'Ist der Adapter für Danfoss RA beim FRITZ!Smart Thermo 302 dabei?',
    'Welchen Adapter brauche ich für das unbekannte Ventil am FRITZ!Smart Thermo 302?',
    'Danfoss RAV mit Pin beim FRITZ!DECT 302, Artikel 20003120?',
  ];
  const cases = [
    ['20003120','danfoss-ra','adapter_im_lieferumfang',true,null],
    ['20003120','danfoss-rav','adapter_separat',false,true],
    ['20003120','danfoss-ravl','adapter_separat',false,null],
    ['20003120','anders_oder_unbekannt','modell_oder_ventil_klaeren',null,null],
    ['andere_oder_unbekannt','danfoss-ra','modell_oder_ventil_klaeren',null,null],
  ];
  const inputs = [
    ...cases.map(([artikelnummer,ventil])=>({artikelnummer,ventil})),
    {artikelnummer:'20003120',ventil:'34 mm'},
    {ventil:'danfoss-ra'},
  ];
  const compact = compactReplies([
    ...searches.map(frage=>toolCall(compactFind,{frage})),
    ...inputs.map(eingaben=>toolCall(compactRun,{name,eingaben})),
  ]);
  for (const [index,frage] of searches.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name,name,frage);
    assert.deepEqual(first,findTools(frage).tools[0]);
    assert.equal(first.citation_url,citation);
    assert.equal(first.guide_url,guide);
  }
  assert.equal(findTools(name).tools[0]?.name,name);
  for (const unrelated of [
    'Welche Firmware braucht der FRITZ!DECT 302 an meinem Router?',
    'FRITZ!DECT 302 und Bosch II [+M] am Danfoss RAV vergleichen',
  ]) {
    assert.ok(!findTools(unrelated).tools.some(tool=>tool.name === name),unrelated);
  }

  const jobs = inputs.map((input,index)=>({jsonrpc:'2.0',id:index+1,...toolCall(name,input)}));
  const standard = new Map(readStdio(jobs).map(reply=>[reply.id,reply.result]));
  for (const [index] of inputs.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[searches.length+index].result);
    if (index >= cases.length) {
      assert.equal(result.isError,true);
      assert.equal(result.structuredContent,undefined);
      continue;
    }
    const [, , status,included,pin] = cases[index];
    assert.equal(result.isError,false);
    const output = result.structuredContent;
    assert.deepEqual([output.status,output.adapter_im_lieferumfang,output.adapter_mit_pin_dokumentiert],[status,included,pin]);
    assert.deepEqual([output.citation_url,output.guide_url,output.quellenmarkt],[citation,guide,'DE']);
    assert.equal(output.quellen_geprueft_am,'2026-11-22');
    assert.match(output.quellen_url,/^https:\/\/fritz\.com\/apps\/knowledge-base\/fritz-dect-302\/3376_/);
    assert.equal(output.produkt_url,'https://fritz.com/products/fritz-smart-thermo-302-20003120');
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('the general thermostat tool keeps FRITZ, Bosch and tado evidence separate', async () => {
  const name = 'thermostat_ventilabgleich';
  const cases = [
    [{model:'fritz-302',valve:'danfoss-ravl'},'adapter','2026-11-22','fritz.com',/Separaten Adapter/],
    [{model:'bosch-ii-m',valve:'danfoss-ravl'},'adapter','2026-11-22','www.bosch-smarthome.com',/Adapter liegt bei/],
    [{model:'tado-v3',valve:'heimeier-m30'},'direct','2026-10-31','cdn.brandfolder.io',/ohne Adapter/],
  ];
  const compact = compactReplies(cases.map(([eingaben])=>toolCall(compactRun,{name,eingaben})));
  for (const [index,[input,status,reviewed,authority,title]] of cases.entries()) {
    const result = await callTool(name,input);
    assert.deepEqual(result,compact[index].result);
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.equal(data.status,status);
    assert.equal(data.reviewed_on,reviewed);
    assert.equal(new URL(data.manufacturer_or_guidance_url).hostname,authority);
    assert.match(data.title,title);
  }
});

test('both offline profiles compute a single laundry run without a dryer reading', () => {
  const name = 'luftentfeuchter_waesche_einzelkosten';
  const comparison = 'waesche_trocknungskosten';
  const citation = 'https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html';
  const guide = citation + '#luftentfeuchter-waesche-kosten';
  const lookup = [
    ['Was kostet eine Waschladung mit meinem Luftentfeuchter? 1,8 kWh, 0,35 Euro/kWh.', name],
    ['Was kostet mich die Wäsche mit Entfeuchter, durchschnittlich 200 Watt über 6 Stunden?', name],
    ['Was kostet das Trocknen pro Ladung mit Wäschetrockner oder Luftentfeuchter?', comparison],
  ];
  const valid = [
    [{method:'measured',dehum:1.8,price:0.35},1.8,0.63],
    [{method:'estimate',watts:200,hours:6,price:0.35},1.2,0.42],
    [{method:'measured',dehum:0,price:0},0,0],
  ];
  const inputs = [
    ...valid.map(([input])=>input),
    {method:'measured',dehum:1.8,watts:200,price:0.35},
    {method:'estimate',watts:200,price:0.35},
    {method:'estimate',watts:200,hours:6,dehum:1.8,price:0.35},
    {method:'measured',dehum:1.8,price:0.35,dryer:0},
  ];
  const compact = compactReplies([
    ...lookup.map(([frage])=>toolCall(compactFind,{frage})),
    ...inputs.map(eingaben=>toolCall(compactRun,{name,eingaben})),
  ]);
  for (const [index,[question,expected]] of lookup.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name,expected,question);
    assert.deepEqual(first,findTools(question).tools[0]);
    if (expected === name) {
      assert.equal(first.citation_url,citation);
      assert.equal(first.guide_url,guide);
      assert.deepEqual(first.inputSchema.required,['method','price']);
      assert.equal(first.inputSchema.oneOf.length,2);
    }
  }
  assert.equal(findTools(name).tools[0]?.name,name);
  assert.ok(!findTools('Was kostet Wäsche mit Luftentfeuchter laut Typenschild und Nennleistung?').tools.some(t=>t.name===name));

  const jobs = inputs.map((input,index)=>({jsonrpc:'2.0',id:index+1,...toolCall(name,input)}));
  const standard = new Map(readStdio(jobs).map(reply=>[reply.id,reply.result]));
  for (const [index,input] of inputs.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[lookup.length+index].result);
    if (index >= valid.length) {
      assert.equal(result.isError,true);
      assert.equal(result.structuredContent,undefined);
      continue;
    }
    const [, kwh, cost] = valid[index];
    assert.equal(result.isError,false);
    const output = result.structuredContent;
    assert.deepEqual([output.kwh,output.cost,output.basis],[kwh,cost,input.method]);
    assert.deepEqual([output.citation_url,output.guide_url,output.share_url],[citation,guide,guide]);
    assert.ok(output.share_text_de.includes(guide));
    assert.equal(Object.hasOwn(output,'lower_cost'),false);
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('both offline stdio profiles keep decimal window widths on the measured fit boundary', () => {
  const name = 'fenstersauger_sprossenfenster_duesenbreite';
  const entry = 'https://getecoback.com/produkte.html?mcp_entry=fenstersauger-breitencheck#fenstersauger-duesenbreite';
  const cases = [
    {
      inputs:{lichte_breite_mm:143.7,spiel_pro_seite_mm:5.2,vorhandene_duese_mm:133.3,kauf_geplant:true},
      usable:133.3, fits:true, offers:['06008B7000'],
      step:'vorhandene_duese_zuerst_probesetzen',
    },
    {
      inputs:{lichte_breite_mm:256.4,spiel_pro_seite_mm:61.7,vorhandene_duese_mm:0,kauf_geplant:true},
      usable:133, fits:null, offers:['06008B7000'], entry,
      step:'genaues_originalpaket_und_platzbedarf_pruefen',
    },
    {
      inputs:{lichte_breite_mm:256.39999,spiel_pro_seite_mm:61.7,vorhandene_duese_mm:0,kauf_geplant:true},
      usable:132.99999, fits:null, offers:[],
      step:'vorhandenen_einwascher_oder_abzieher_pruefen',
    },
  ];
  const compact = compactReplies(cases.map(({inputs}) => toolCall(compactRun,{name,eingaben:inputs})));
  const jobs = cases.map(({inputs}, index) => ({jsonrpc:'2.0',id:index+1,...toolCall(name,inputs)}));
  const standard = new Map(readStdio(jobs).map(reply => [reply.id,reply.result]));
  for (const [index, {usable,fits,offers,entry:destination,step}] of cases.entries()) {
    const result = standard.get(index+1);
    assert.deepEqual(result,compact[index].result);
    assert.equal(result.isError,false);
    const output = result.structuredContent;
    assert.ok(Math.abs(output.nutzbreite_mm - usable) < 1e-9);
    assert.equal(output.vorhandene_duese_nominell_passend,fits);
    assert.deepEqual(output.nominell_passende_originalpakete.map(item => item.artikel),offers);
    assert.equal(output.folgeschritt,step);
    assert.equal(output.entry_url,destination);
    assert.equal(Object.hasOwn(output,'entry_url'),Boolean(destination));
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
  }
});

test('both offline stdio profiles resolve the German condensation question and expose the same share link', () => {
  const name = 'fenster_oberflaeche_taucheck';
  const citation = 'https://getecoback.com/guide/fenster-beschlagen-innen.html';
  const guide = citation + '#fenstersauger-gegen-kondenswasser';
  const questions = [
    'Fenstersauger gegen Kondenswasser',
    'Hilft ein Fenstersauger gegen Kondenswasser am Fenster oder reicht ein Tuch?',
    '20 Grad 60 % Luftfeuchtigkeit und Scheibe 10 Grad: Ist Kondenswasser am Fenster plausibel?',
  ];
  const room = {room_c:20, room_rh_pct:60};
  const saturatedRoom = {room_c:23, room_rh_pct:100};
  const cases = [
    [{...room, surface_c:10}, 12, -2, true, 'unter_taupunkt'],
    [{...room, surface_c:12}, 12, 0, false, 'nahe_am_taupunkt'],
    [{...room, surface_c:14}, 12, 2, false, 'ueber_taupunkt'],
    [{...saturatedRoom, surface_c:22}, 23, -1, true, 'nahe_am_taupunkt'],
    [{...saturatedRoom, surface_c:24}, 23, 1, false, 'nahe_am_taupunkt'],
  ];
  const inputs = [...cases.map(([measurements]) => measurements), room];
  const compact = compactReplies([
    ...questions.map(frage => toolCall(compactFind, {frage})),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  for (const [index, question] of questions.entries()) {
    const first = compact[index].result.structuredContent.tools[0];
    assert.equal(first?.name, name, question);
    assert.equal(first.guide_url, guide);
    assert.equal(first.citation_url, citation);
    assert.deepEqual(first, findTools(question).tools[0]);
  }

  const jobs = inputs.map((args, index) => ({jsonrpc:'2.0', id:index + 1, ...toolCall(name, args)}));
  const fullById = new Map(readStdio(jobs).map(reply => [reply.id, reply.result]));
  for (const [index, [{surface_c}, dewPoint, margin, possible, interpretation]] of cases.entries()) {
    const result = fullById.get(index + 1);
    assert.deepEqual(result, compact[questions.length + index].result);
    assert.equal(result.isError, false);
    const output = result.structuredContent;
    assert.equal(output.dew_point_c, dewPoint, `surface ${surface_c} °C`);
    assert.equal(output.surface_margin_c, margin);
    assert.equal(output.condensation_possible, possible);
    assert.equal(output.messlage, interpretation);
    assert.equal(output.citation_url, citation);
    assert.equal(output.guide_url, guide);
    assert.equal(output.share_url, guide);
    assert.doesNotMatch(JSON.stringify(output), /https:\/\/[^"]*amazon\.|[?&]tag=/i);
  }
  const missingSurface = fullById.get(inputs.length);
  assert.deepEqual(missingSurface, compact.at(-1).result);
  assert.equal(missingSurface.isError, true);
  assert.equal(missingSurface.structuredContent, undefined);
});

test('German model corrections keep charging temperatures and LED observations on their own window vacuum', async () => {
  const bosch = 'glassvac_kalt_lagern_einschalten_laden_getrennt';
  const kaercher = 'fenstersauger_wv3_wv8_led_muster_einordnen';
  const guide = 'https://getecoback.com/produkte.html#kaercher-fenstersauger-einsatz-und-hinweise';
  const changedToKaercher = 'Den Bosch GlassVAC wollte ich nach Frost laden. Jetzt geht es um meinen Kärcher WV 8: Alle LEDs blinken zweimal kurz und machen dann eine lange Pause, der Motor ist schon aus. Was bedeutet das?';
  const changedToBosch = 'Zuvor hatte ich den Kärcher WV 8. Jetzt nutze ich den Bosch GlassVAC 06008B7000. Darf ich ihn nach Frost bei minus 3 Grad aufladen?';
  const unanswered = [
    'Mein alter Bosch GlassVAC war im Schuppen. Jetzt habe ich einen Kärcher WV 8. Darf ich dessen Akku nach Frost bei minus 3 Grad aufladen?',
    'Beim Bosch GlassVAC habe ich im Schuppen minus 3 Grad gemessen. Den Kärcher WV 8 lade ich drinnen, dort habe ich nicht gemessen. Darf ich ihn jetzt laden?',
    'Ich vergleiche Bosch GlassVAC und Kärcher WV 8. Darf ich beide Fenstersauger bei minus 3 Grad aufladen?',
    'Ich vergleiche beide Geräte: Darf ich beim Bosch GlassVAC und Kärcher WV 8 jeweils im unbeheizten Schuppen laden?',
  ];
  for (const [query, expected] of [[changedToKaercher, kaercher], [changedToBosch, bosch], [kaercher, kaercher], [bosch, bosch]]) {
    assert.equal(findTools(query).tools[0]?.name, expected);
  }
  for (const query of unanswered) assert.equal(findTools(query).totalMatches, 0, query);
  const pattern = {
    artikel:'1.633-785.0', sicherheitsblatt_bestaetigt:true,
    muster:'alle_leds_zweimal_kurz_dann_lange_pause', zustand:'motor_aus',
  };
  const [found, empty, executed] = compactReplies([
    toolCall(compactFind, {frage:changedToKaercher}),
    toolCall(compactFind, {frage:unanswered[1]}),
    toolCall(compactRun, {name:kaercher, eingaben:pattern}),
  ]);
  const entry = found.result.structuredContent.tools[0];
  assert.equal(entry.name, kaercher);
  assert.equal(entry.guide_url, guide);
  assert.equal(empty.result.structuredContent.totalMatches, 0);
  assert.deepEqual(executed.result, await callTool(kaercher, pattern));
  const observation = executed.result.structuredContent;
  assert.equal(observation.tabellenbedeutung, 'akkutemperatur_zu_hoch_oder_zu_tief');
  assert.equal(observation.guide_url, guide);
  assert.equal(observation.citation_url, 'https://getecoback.com/produkte.html');
  assert.equal(Object.hasOwn(observation, 'im_empfohlenen_ladebereich'), false);
  const unmeasured = await callTool(bosch, {paketkennung:'06008B7000', handbuch_zugeordnet:true});
  assert.equal(unmeasured.isError, true);
});

test('GlassVAC frost questions distinguish charging, startup and storage using the measured temperature', () => {
  const name = 'glassvac_kalt_lagern_einschalten_laden_getrennt';
  const guide = 'https://getecoback.com/produkte.html#bosch-glassvac-einsatz-und-pflege';
  const queries = [
    'Der Bosch GlassVAC 06008B7000 liegt seit gestern im unbeheizten Schuppen. Darf ich den Akku dort bei minus 3 Grad aufladen?',
    'Mein Bosch-Fenstersauger 06008B7000 stand über Nacht bei Frost in der Garage. Kann er gleich ans Ladegerät?',
  ];
  for (const query of queries) assert.equal(findTools(query).tools[0]?.name, name);
  for (const query of [
    'Bosch GlassVAC 06008B7000: Welchen Ladeanschluss zeigt das Foto aus der kalten Garage?',
    'Wie lädt man den Kärcher WV 8 bei −3 °C in der Garage?',
    'Welches USB-Kabel passt zum Bosch GlassVAC 06008B7000?',
    'Die LED an meinem GlassVAC blinkt beim Laden nach Frost. Ist der Akku defekt?',
    'Mein Bosch GlassVAC ist nach Frost im Schuppen kaputt, die LED blinkt beim Laden. Wie kann ich den Fehler finden?',
  ]) assert.notEqual(findTools(query).tools[0]?.name, name);

  const model = {paketkennung:'06008B7000', handbuch_zugeordnet:true};
  const inputs = [
    {...model, umgebung_c:-8}, {...model, umgebung_c:2}, model,
    {...model, umgebung_c:-8, paketkennung:'06008B7200'},
    {...model, umgebung_c:2, handbuch_zugeordnet:false},
  ];
  const [found, ...compact] = compactReplies([
    toolCall(compactFind, {frage:queries[1]}),
    ...inputs.map(eingaben => toolCall(compactRun, {name, eingaben})),
  ]);
  const tool = found.result.structuredContent.tools[0];
  assert.equal(tool.name, name);
  assert.equal(tool.guide_url, guide);
  assert.ok(tool.inputSchema.required.includes('umgebung_c'));
  const native = readStdio(inputs.map((args, index) => ({
    jsonrpc:'2.0', id:index + 1, ...toolCall(name, args),
  })));
  for (const [index, reply] of compact.entries()) {
    assert.deepEqual(reply.result, native.find(message => message.id === index + 1).result);
  }
  for (const [index, start, charge] of [[0, false, false], [1, true, true]]) {
    const result = compact[index].result.structuredContent;
    assert.equal(result.im_lagerbereich, true);
    assert.equal(result.einschalten_im_temperaturbereich, start);
    assert.equal(result.im_empfohlenen_ladebereich, charge);
    assert.equal(result.guide_url, guide);
    assert.equal(result.citation_url, 'https://getecoback.com/produkte.html');
    assert.match(result.beleg.fundstelle, /S\. 4–5/);
  }
  assert.equal(compact[2].result.isError, true);
  for (const reply of compact.slice(3)) {
    assert.equal(reply.result.structuredContent.status, 'modell_oder_handbuch_offen');
    assert.equal(reply.result.structuredContent.beleg, null);
    assert.equal(Object.hasOwn(reply.result.structuredContent, 'im_empfohlenen_ladebereich'), false);
  }
});

test('offline humidifier efficiency questions require output and watts from matching settings', async () => {
  const name = 'befeuchter_nennwatt_abgabeleistung_bezug';
  const citation = 'https://getecoback.com/guide/luftbefeuchter-stromverbrauch.html';
  const questions = [
    'Welcher befeuchtet effizienter: der Beurer LB 55 mit 365 Watt oder Oskar mit 6 bis 18 Watt?',
    'Gibt der LB 55 mit 365 W mehr Wasser an die Raumluft ab als ein Oskar mit 18 W?',
  ];
  for (const question of questions) assert.equal(findTools(question).tools[0]?.name, name);
  for (const question of [
    'Welcher Tank fasst mehr Wasser, der Oskar mit 18 Watt oder der LB 55 mit 365 Watt?',
    'Braucht der LB 55 mit 365 W mehr Wasser zum Nachfüllen als der Oskar mit 18 W?',
  ]) assert.notEqual(findTools(question).tools[0]?.name, name);
  const filter = 'Wann muss ich den Filter von meinem Oskar wechseln?';
  assert.equal(findTools(filter).tools[0]?.name, 'oskar_filtermatten_gemeinsamer_vorrat');

  const readings = {gemessene_wasserabgabe_ml_h:400, elektrische_leistung_w:365};
  const different = {...readings, gleiche_stufe_bedingung:false};
  const same = {...readings, gleiche_stufe_bedingung:true};
  const [found, unmatched, matched] = compactReplies([
    toolCall(compactFind, {frage:questions[0]}),
    toolCall(compactRun, {name, eingaben:different}),
    toolCall(compactRun, {name, eingaben:same}),
  ]);
  assert.equal(found.result.structuredContent.tools[0].name, name);
  assert.equal(found.result.structuredContent.tools[0].citation_url, citation);
  assert.equal(found.result.structuredContent.tools[0].guide_url, citation + '#effizienz-vergleichen');
  for (const [reply, args, expected] of [[unmatched, different, null], [matched, same, 1.1]]) {
    assert.equal(reply.result.isError, false);
    assert.deepEqual(reply.result, await callTool(name, args));
    assert.equal(reply.result.structuredContent.ml_pro_wh, expected);
    assert.equal(reply.result.structuredContent.citation_url, citation);
    assert.equal(reply.result.structuredContent.guide_url, citation + '#effizienz-vergleichen');
  }
});

test('compact stdio advertises only the finder and executor without pagination', () => {
  const [list, invalidCursor, direct] = compactReplies([
    {method:'tools/list', params:{}},
    {method:'tools/list', params:{cursor:pageTools(TOOLS, undefined, version).nextCursor}},
    toolCall('entfeuchter_ablaufcheck', {drain:'downhill'}),
  ]);
  const tools = list.result.tools;
  assert.deepEqual(tools.map(tool => tool.name).sort(), [compactRun, compactFind]);
  assert.equal(list.result.nextCursor, undefined);
  const schemas = Object.fromEntries(tools.map(tool => [tool.name, tool.inputSchema]));
  assert.deepEqual(schemas[compactFind].required, ['frage']);
  assert.equal(schemas[compactFind].properties.frage.type, 'string');
  assert.equal(schemas[compactFind].properties.frage.minLength, 1);
  assert.equal(schemas[compactFind].properties.frage.maxLength, 500);
  assert.deepEqual([...schemas[compactRun].required].sort(), ['eingaben', 'name']);
  assert.equal(schemas[compactRun].properties.name.type, 'string');
  assert.equal(schemas[compactRun].properties.eingaben.type, 'object');
  assert.equal(invalidCursor.error.code, -32602);
  assert.equal(direct.error.code, -32602);
});

test('compact lookup exposes the offline tool schema, source and guide for real questions', async () => {
  const cases = [
    ['  Kann ich den Abflussschlauch nach oben führen?  ', 'entfeuchter_ablaufcheck', {drain:'level_or_uphill', model:'meaco-one-20'}],
    ['trockner_programm_trockenmasse', 'trockner_programm_trockenmasse', {trockenmasse_kg:5, programm_max_kg:4, kapazitaetsbasis:true}],
    ['Wie lange darf ich mit 72 Litern duschen?', 'dusche_zeit_bei_wasserbudget', {budget_l:72, durchfluss_l_min:9}],
  ];
  const found = compactReplies(cases.map(([frage]) => toolCall(compactFind, {frage})));
  const tools = found.map((reply, index) => {
    const [query, name, example] = cases[index];
    const tool = reply.result.structuredContent.tools[0];
    assert.equal(tool.name, name);
    assert.deepEqual(tool, findTools(query).tools[0]);
    assert.deepEqual(tool.inputSchema, TOOLS.find(entry => entry.name === name).inputSchema);
    assert.deepEqual(tool.example_arguments, example);
    return tool;
  });
  const ownInputs = {budget_l:40, durchfluss_l_min:8};
  const replies = compactReplies([
    ...tools.map(tool => toolCall(compactRun, {name:tool.name, eingaben:tool.example_arguments})),
    toolCall(compactRun, {name:tools[2].name, eingaben:ownInputs}),
  ]);
  for (const [index, tool] of tools.entries()) {
    assert.deepEqual(replies[index].result, await callTool(tool.name, tool.example_arguments));
    assert.equal(replies[index].result.isError, false);
  }
  const drainage = replies[0].result.structuredContent;
  assert.equal(drainage.outcome, 'pump_check');
  assert.equal(drainage.guide_url, drainage.citation_url + '?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf');
  assert.match(drainage.model_evidence.source_url, /^https:\/\//);
  assert.deepEqual(replies[3].result, await callTool(tools[2].name, ownInputs));
  assert.notDeepEqual(replies[3].result, replies[2].result);
});

test('compact finder embeds matching cellar evidence and runs the documented test-point tool', async () => {
  const [read, listing, relevant, ...unmatched] = compactReplies([
    {method:'resources/read',params:{uri:cellarUri}},
    {method:'resources/list'},
    ...[
      'Was leisten Comfee MDDF-20DEN7 und Meaco Arete One 20L bei 10 °C und 60 % im Keller?',
      'Comfee MDDF-20DEN7-WF bei 10 °C',
      'Wie lange darf ich mit 72 Litern duschen?',
    ].map(frage => toolCall(compactFind,{frage})),
  ]);
  assert.equal(relevant.result.isError, false);
  assert.deepEqual(relevant.result.structuredContent.resources, listing.result.resources);
  assert.deepEqual(relevant.result.content.filter(part => part.type === 'resource'),
    [{type:'resource',resource:read.result.contents[0]}]);
  const found = relevant.result.structuredContent.tools[0];
  assert.equal(found.name, 'kellerentfeuchter_pruefpunkt_abgleichen');
  assert.deepEqual(found.inputSchema, TOOLS.find(tool => tool.name === found.name).inputSchema);
  assert.equal(found.citation_url, 'https://getecoback.com/guide/luftentfeuchter-keller.html');
  assert.equal(found.guide_url, found.citation_url + '#kalter-keller');

  const cases = [
    [{},'hersteller_pruefpunkt',3.4,180],
    [{temperatur_c:20},'hersteller_pruefpunkt',8.5,216],
    [{temperatur_c:15},'wertepaar_offen',null,null],
    [{relative_feuchte_pct:59},'wertepaar_offen',null,null],
    [{modell:'comfee-mddf20'},'wertepaar_offen',null,null],
  ];
  const inputs = cases.map(([change]) => ({...found.example_arguments,...change}));
  const decisions = compactReplies(inputs.map(eingaben => toolCall(compactRun,{name:found.name,eingaben})));
  for (const [index, [,status,litres,watts]] of cases.entries()) {
    const {result} = decisions[index];
    assert.deepEqual(result, await callTool(found.name,inputs[index]));
    assert.equal(result.isError, false);
    const data = result.structuredContent;
    assert.deepEqual([data.status,data.liter_pro_tag,data.leistungsaufnahme_w], [status,litres,watts]);
    assert.equal(data.quellenmarkt, 'DE');
    assert.equal(data.quellenpruefung, '2026-11-20');
    assert.equal(data.citation_url, found.citation_url);
    assert.equal(data.guide_url, found.guide_url);
    assert(read.result.contents[0].text.includes(data.quelle));
  }
  for (const {result} of unmatched) {
    assert.equal(result.isError, false);
    assert.equal(Object.hasOwn(result.structuredContent,'resources'), false);
    assert.deepEqual(result.content.map(part => part.type), ['text']);
  }
  assert.equal(unmatched[1].result.structuredContent.tools[0].name, 'dusche_zeit_bei_wasserbudget');
});

test('compact stdio excludes live tools and reports invalid inputs in-band', async () => {
  const searches = compactReplies(liveOnly.map(frage => toolCall(compactFind, {frage})));
  for (const reply of searches) {
    const result = reply.result.structuredContent;
    assert.ok(result.tools.every(tool => !liveOnly.includes(tool.name)));
    assert.ok(Number.isInteger(result.totalMatches));
  }
  const invalidRequests = [
    ...[...liveOnly, 'missing_tool', '__proto__', compactRun].map(name => toolCall(compactRun, {name, eingaben:{}})),
    ...[{}, {frage:12}, {frage:'  '}, {frage:'a'.repeat(501)}].map(args => toolCall(compactFind, args)),
    ...[{}, {name:'btu_empfehlung'}, {name:'btu_empfehlung', eingaben:[]}, {name:'btu_empfehlung', eingaben:null}].map(args => toolCall(compactRun, args)),
  ];
  for (const reply of compactReplies(invalidRequests)) assert.equal(reply.result?.isError, true);
  const name = 'dusche_zeit_bei_wasserbudget';
  const [invalid] = compactReplies([toolCall(compactRun, {name, eingaben:{budget_l:72}})]);
  const nativeError = await callTool(name, {budget_l:72});
  assert.equal(nativeError.isError, true);
  assert.deepEqual(invalid.result, nativeError);
});

test('PortaSplit keeps one fixed first-party entry through each decision state', async () => {
  const cases = [
    [{}, 'passende_halterung_vor_kauf_klaeren'],
    [{universalhalterung:'ean_separat_vorhanden'}, 'halterungsbeleg_vorhanden'],
    [{universalhalterung:'offen'}, 'lieferumfang_klaeren'],
    [{angebot_ean:0}, 'modellnummer_abgleichen'],
    [{fenster:'anders_oder_offen'}, 'fenstertyp_mit_anleitung_abgleichen'],
  ];
  for (const [input,status] of cases) {
    const result = await callTool(bracketTool, {...roofWithoutBracket, ...input});
    assert.equal(result.isError, false, status);
    assert.equal(result.structuredContent.status, status);
    assert.equal(result.structuredContent.citation_url, bracketCitation);
    assert.equal(result.structuredContent.guide_url, bracketGuide);
    assert.equal(result.structuredContent.entry_url, bracketEntry);
  }
  const entryOverride = await callTool(bracketTool, {...roofWithoutBracket, entry_url:bracketCitation});
  assert.equal(entryOverride.isError, true);
  assert.equal(entryOverride.structuredContent, undefined);
});

test('the German mixed laundry decision is discoverable and runnable offline', async () => {
  await withFetchFixtures(new Map(), async () => {
    const question = 'Lohnt sich ein Luftentfeuchter zum Wäschetrocknen wenn ein Teil der Waschladungen im Winter weiter in den Trockner geht';
    const found = findTools(question).tools[0];
    assert.equal(found.name, laundryTool);
    assert.equal(found.citation_url, laundryCitation);
    assert.equal(found.guide_url, laundryCitation + '#laundry-check');
    assert.deepEqual(found.inputSchema.required, Object.keys(found.example_arguments));

    const example = runLocalCommand(finder, ['--example', laundryTool]);
    assert.equal(example.status, 0, example.stderr);
    const output = JSON.parse(example.stdout);
    assert.deepEqual(output, runReviewedExample(laundryTool));
    const {structuredContent: decision} = output.result;
    assert.equal(decision.citation_url, found.citation_url);
    assert.equal(decision.guide_url, found.guide_url);
    assert.equal(decision.status, 'rechnerische_kostendeckung');
    assert.equal(decision.trocknerladungen_weiter, 40);
    assert.equal(decision.stromersparnis_saison_eur, 16.8);
    assert.equal(decision.kostendeckung_saisons, 6);

    const calculate = changes => callTool(laundryTool, {...found.example_arguments, ...changes});
    const unknown = (await calculate({zusatzstrom_erfasst:false})).structuredContent;
    assert.equal(unknown.status, 'erst_vergleichbar_messen');
    assert.equal(unknown.stromersparnis_saison_eur, null);
    assert.equal(unknown.kostendeckung_saisons, null);
    const worse = (await calculate({entfeuchter_kwh:2})).structuredContent;
    assert.equal(worse.status, 'kein_stromkostenvorteil');
    assert.equal(worse.stromersparnis_saison_eur, -12.6);
    assert.equal(worse.kostendeckung_saisons, null);
    const available = (await calculate({anschaffung_eur:0})).structuredContent;
    assert.equal(available.status, 'vorhandene_option_stromguenstiger');
    assert.equal(available.kostendeckung_saisons, 0);
    assert.equal((await calculate({ladungen_ersetzbar:100.5})).isError, true);
    assert.equal((await calculate({ladungen_ersetzbar:101})).isError, true);
  });
});

test('advertised tools have bilingual descriptions and valid required input names', () => {
  for (const tool of TOOLS) {
    assert.ok(tool.description.includes('—'), tool.name);
    assert.equal(tool.inputSchema.type, 'object', tool.name);
    for (const field of tool.inputSchema.required ?? []) {
      assert.ok(Object.hasOwn(tool.inputSchema.properties, field), `${tool.name}.${field}`);
    }
  }
});

async function withFetchFixtures(fixtures, check) {
  const previous = globalThis.fetch;
  const used = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url).href;
    used.push(url);
    assert.equal(options?.method ?? 'GET', 'GET');
    const fixture = fixtures.get(url);
    assert.ok(fixture, `Unexpected outbound request ${url}`);
    return fixture();
  };
  try {
    await check();
  } finally {
    globalThis.fetch = previous;
  }
  assert.deepEqual(used.sort(), [...fixtures.keys()].sort());
}

test('all deterministic expanded examples and the unknown-tool branch run without network', async () => {
  await withFetchFixtures(new Map(), async () => {
    const unknown = await callTool('does_not_exist', {});
    assert.equal(unknown.isError, true);
    for (const {name, page, example} of expandedDefinitions) {
      const result = await callTool(name, example.args);
      assert.equal(result.isError, false, name);
      assert.deepEqual(runReviewedExample(name), {name, example_arguments:example.args, result}, name);
      assert.equal(result.structuredContent.citation_url, 'https://getecoback.com' + page, name);
      for (const [field, expected] of Object.entries(example.expect)) {
        const actual = result.structuredContent[field];
        if (typeof expected === 'number') {
          assert(typeof actual === 'number' && Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${name}.${field}`);
        } else {
          assert.deepEqual(actual, expected, `${name}.${field}`);
        }
      }
    }
  });
});

const json = data => new Response(JSON.stringify(data), {headers:{'content-type':'application/json'}});

test('the weather tool reports the verified maximum from three frozen forecasts', async () => {
  const fixtures = new Map([
    ['52.52', '13.41', [24,28,23]],
    ['50.11', '8.68', [25,29,24]],
    ['48.14', '11.58', [24,32,25]],
  ].map(([latitude, longitude, temperature_2m_max]) => [
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max&forecast_days=3&timezone=Europe%2FBerlin`,
    () => json({daily:{temperature_2m_max, time:['2026-11-20','2026-11-21','2026-11-22']}}),
  ]));
  await withFetchFixtures(fixtures, async () => {
    const result = await callTool('hitzewelle_vorschau', {});
    assert.equal(result.isError, false);
    const {forecast_status, peak_c, peak_city, peak_date} = result.structuredContent;
    assert.deepEqual({forecast_status, peak_c, peak_city, peak_date}, {
      forecast_status:'available', peak_c:32, peak_city:'München', peak_date:'2026-11-21',
    });
    assert.match(result.content[0].text, /open-meteo/);
    assert.match(result.content[0].text, /Affiliate/i);
  });
});

test('guide search returns the stable German hit from a frozen index', async () => {
  const index = [{u:'/guide/klimaanlage-kippfenster.html', t:'Klimaanlage am Kippfenster abdichten', d:'Hinweise auf Deutsch', l:'de'}];
  await withFetchFixtures(new Map([['https://getecoback.com/search-index.json', () => json(index)]]), async () => {
    const result = await callTool('ratgeber_suche', {frage:'Klimaanlage Kippfenster abdichten', max:3});
    assert.equal(result.isError, false);
    assert.match(result.content[0].text, /https:\/\/getecoback\.com\/guide\/klimaanlage-kippfenster\.html/);
    assert.match(result.content[0].text, /Affiliate/i);
  });
});

test('guide reading returns the source and text from a frozen HTML page', async () => {
  const guide = 'https://getecoback.com/guide/btu-rechner.html';
  const html = '<title>BTU für einen Raum</title><article><h2>Grundlagen</h2><p>20 m² messen.</p></article>';
  await withFetchFixtures(new Map([[guide, () => new Response(html, {headers:{'content-type':'text/html'}})]]), async () => {
    const result = await callTool('ratgeber_lesen', {pfad:'/guide/btu-rechner.html'});
    assert.equal(result.isError, false);
    const text = result.content[0].text;
    assert.ok(text.includes(`Quelle: ${guide}`));
    assert.match(text, /## Grundlagen\n20 m² messen\./);
    assert.match(text, /Affiliate/i);
  });
});
