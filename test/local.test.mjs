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

function readStdio(jobs) {
  // Regular descriptors exercise the real process without relying on libuv child sockets.
  const work = mkdtempSync(join(tmpdir(), 'ecoback-stdio-'));
  let input, output;
  try {
    const inputPath = join(work, 'input.ndjson');
    const outputPath = join(work, 'output.ndjson');
    writeFileSync(inputPath, jobs.map(job => JSON.stringify(job)).join('\n') + '\n');
    input = openSync(inputPath, 'r');
    output = openSync(outputPath, 'w');
    const child = spawnSync(process.execPath, [server], {stdio:[input, output, 'inherit'], timeout:10000});
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
