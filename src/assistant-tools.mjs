import { drainTool } from './drain.mjs';
import { isExpandedTool } from './eco-suite/src/mcp-expanded.mjs';
import { findTools } from './find-tools.mjs';
import { callTool } from './tools.mjs';
import { CELLAR_RESOURCE, CELLAR_RESOURCE_TEXT, matchesColdCellarQuestion } from './cellar-resource.mjs';

const finder = 'ecoback_werkzeug_finden';
const runner = 'ecoback_werkzeug_ausfuehren';
const offlineLegacy = new Set([
  drainTool.name,
  'geraet_wahl', 'btu_empfehlung', 'fensterabdichtung_laenge',
  'klimaanlage_stromkosten', 'heizleistung_watt', 'taupunkt_lueften',
]);
const isOffline = name => offlineLegacy.has(name) || isExpandedTool(name);

export const INSTRUCTIONS = 'Suche zuerst mit ecoback_werkzeug_finden. Verwende Name und Eingabeschema eines passenden Treffers für ecoback_werkzeug_ausfuehren. Frage nach fehlenden Messwerten. Beispielwerte dienen zum Ausprobieren. Behalte verlinkte Quellen und Grenzen in der Antwort.';

export const ASSISTANT_TOOLS = [
  {
    name: finder,
    description: 'Passende EcoBack-Werkzeuge für eine Haushaltsfrage suchen. Bis zu fünf Treffer mit Eingabeschema, Beispiel und vorhandener Quelle — Find up to five local tools with their input schemas, examples and available citations.',
    inputSchema: {
      type: 'object',
      properties: {frage: {type:'string', minLength:1, maxLength:500, description:'Eine konkrete Frage oder ein exakter Werkzeugname.'}},
      required: ['frage'], additionalProperties: false,
    },
    annotations: {readOnlyHint:true, openWorldHint:false},
  },
  {
    name: runner,
    description: 'Ein lokales EcoBack-Werkzeug mit seinem exakten Namen und passenden eigenen Eingaben ausführen — Run one offline tool with the name and input schema from a finder result.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {type:'string', minLength:1, description:'Exakter Name aus der Suche.'},
        eingaben: {type:'object', additionalProperties:true, description:'Eingaben gemäß inputSchema des gefundenen Werkzeugs.'},
      },
      required: ['name', 'eingaben'], additionalProperties: false,
    },
    annotations: {readOnlyHint:true, openWorldHint:false},
  },
];

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const error = text => ({isError:true, content:[{type:'text', text}]});

export function callAssistantTool(method, args) {
  if (!object(args)) return error('Gib Eingaben als JSON-Objekt an.');
  if (method === finder) {
    const {frage} = args;
    if (Object.keys(args).length !== 1 || typeof frage !== 'string' || [...frage].length > 500 || !frage.trim()) {
      return error('Gib eine Frage mit 1 bis 500 Zeichen an.');
    }
    const result = findTools(frage, isOffline);
    const evidence = matchesColdCellarQuestion(frage);
    const structuredContent = evidence ? {...result, resources:[CELLAR_RESOURCE]} : result;
    const content = [{type:'text', text:JSON.stringify(structuredContent)}];
    if (evidence) {
      const {uri, mimeType} = CELLAR_RESOURCE;
      content.push({type:'resource', resource:{uri, mimeType, text:CELLAR_RESOURCE_TEXT}});
    }
    return {isError:false, structuredContent, content};
  }
  if (method !== runner || Object.keys(args).length !== 2 || typeof args.name !== 'string' || !object(args.eingaben)) {
    return error('Gib den exakten Werkzeugnamen und die Eingaben als Objekt an.');
  }
  if (!isOffline(args.name)) return error('Dieses Werkzeug ist lokal nicht verfügbar. Suche zuerst nach deiner Frage.');
  return callTool(args.name, args.eingaben);
}
