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

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const server = fileURLToPath(new URL('../src/server.mjs', import.meta.url));
const finder = fileURLToPath(new URL('../src/find-tools.mjs', import.meta.url));
const cellarUri = 'ecoback://evidence/de/kellerentfeuchter';

test('offline lookup preserves every exact name and input schema', () => {
  for (const {name, inputSchema} of TOOLS) {
    const result = findTools(name);
    assert.equal(result.totalMatches, 1, name);
    assert.equal(result.tools[0].name, name);
    assert.deepEqual(result.tools[0].inputSchema, inputSchema, name);
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

test('offline finder emits JSON and handles an omitted query', () => {
  const found = spawnSync(process.execPath, [finder, 'Wie lange darf ich mit 72 Litern duschen?'],
    {encoding:'utf8', timeout:10000});
  assert.equal(found.status, 0, found.stderr);
  assert.equal(JSON.parse(found.stdout).tools[0].name, 'dusche_zeit_bei_wasserbudget');
  const missing = spawnSync(process.execPath, [finder], {encoding:'utf8', timeout:10000});
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /Usage:/);
});

test('offline CLI examples run exact reviewed inputs and reject incomplete or live-only requests', () => {
  const example = (...args) => spawnSync(process.execPath, [finder, '--example', ...args], {encoding:'utf8', timeout:10000});
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

function readStdio(jobs, serverArgs = []) {
  // Regular descriptors exercise the real process without relying on libuv child sockets.
  const work = mkdtempSync(join(tmpdir(), 'ecoback-stdio-'));
  let input, output;
  try {
    const inputPath = join(work, 'input.ndjson');
    const outputPath = join(work, 'output.ndjson');
    writeFileSync(inputPath, jobs.map(job => JSON.stringify(job)).join('\n') + '\n');
    input = openSync(inputPath, 'r');
    output = openSync(outputPath, 'w');
    const preload = join(work, 'deny-network.cjs');
    writeFileSync(preload, `const deny = () => { process.stderr.write('Unexpected network call in stdio test\\n'); process.exit(89); };
globalThis.fetch = deny;
require('node:net').Socket.prototype.connect = deny;
require('node:dgram').Socket.prototype.send = deny;
`);
    const child = spawnSync(process.execPath, ['--require', preload, server, ...serverArgs],
      {stdio:[input, output, 'inherit'], timeout:10000});
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0);
    return readFileSync(outputPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  } finally {
    if (input !== undefined) closeSync(input);
    if (output !== undefined) closeSync(output);
    rmSync(work, {recursive:true, force:true});
  }
}

test('stdio handles initialize, the complete paginated catalogue, BTU and unknown tool frames', async () => {
  const jobs = [];
  function send(method, params) {
    const id = jobs.length + 1;
    jobs.push({jsonrpc:'2.0', id, method, params});
    return id;
  }
  const initialize = send('initialize', {});
  const listIds = new Map();
  let cursor;
  assert.equal(TOOLS.length, 2003);
  const expectedPages = Math.ceil(TOOLS.length / MCP_PAGE_SIZE);
  for (let page = 0; page < expectedPages; page++) {
    const id = send('tools/list', cursor === undefined ? {} : {cursor});
    assert.equal(listIds.has(cursor), false);
    listIds.set(cursor, id);
    cursor = pageTools(TOOLS, cursor, version).nextCursor;
  }
  const btu = send('tools/call', {name:'btu_empfehlung', arguments:{qm:20}});
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

test('compact finder embeds the matching cellar evidence and leaves unrelated results unchanged', () => {
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
