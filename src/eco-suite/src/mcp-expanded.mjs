import {householdSuite} from './mcp-household.mjs';
import {moistureSuite} from './mcp-moisture-suite.mjs';
import {coolingSuite} from './mcp-cooling-suite.mjs';
import {winterSuite} from './mcp-winter-suite.mjs';
import {efficiencySuite} from './mcp-efficiency-suite.mjs';
import {fitSuite} from './mcp-fit-suite.mjs';
import {energyNext} from './mcp-energy-next.mjs';
import {climateNext} from './mcp-climate-next.mjs';
import {careNext} from './mcp-care-next.mjs';
import {evidenceNext} from './mcp-evidence-next.mjs';
import {waterHousehold} from './mcp-water-household.mjs';
import {envelopeSuite} from './mcp-envelope.mjs';
import {useWorkflows} from './mcp-use-workflows.mjs';
import {measurementLab} from './mcp-measurement-lab.mjs';

export const expandedDefinitions = [
  ['Strom & Haushalt', householdSuite],
  ['Feuchte', moistureSuite],
  ['Kühlen', coolingSuite],
  ['Heizen', winterSuite],
  ['Strom & Haushalt', efficiencySuite],
  ['Passform', fitSuite],
  ['Energie prüfen', energyNext],
  ['Raumkomfort prüfen', climateNext],
  ['Geräte pflegen', careNext],
  ['Quellen & Kaufprüfung', evidenceNext],
  ['Wasser & Wäsche', waterHousehold],
  ['Gebäude & Fenster', envelopeSuite],
  ['Geräte im Alltag', useWorkflows],
  ['Messpraxis', measurementLab],
].flatMap(([category, definitions]) => definitions.map(tool => ({...tool, category})));

const handlers = new Map(expandedDefinitions.map(tool => [tool.name, tool]));
export const isExpandedTool = name => handlers.has(name);

export const expandedTools = expandedDefinitions.map(({name, description, properties}) => ({
  name, description,
  inputSchema: {type:'object', properties, required:Object.keys(properties), additionalProperties:false},
  annotations: {readOnlyHint:true, openWorldHint:false},
}));

export const expandedCatalog = expandedTools.map((tool, index) => ({
  ...tool, category:expandedDefinitions[index].category, page:expandedDefinitions[index].page,
}));

function valid(schema, value) {
  if (typeof value !== schema.type || (schema.enum && !schema.enum.includes(value))) return false;
  if (schema.type !== 'number') return true;
  return Number.isFinite(value) &&
    value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
}

function toolError(text) {
  return {isError:true, content:[{type:'text', text}]};
}

export function expandedCall(name, args) {
  const tool = handlers.get(name);
  if (!tool) return null;
  const properties = Object.entries(tool.properties);
  if (!args || typeof args !== 'object' || Array.isArray(args) ||
      Object.keys(args).length !== properties.length ||
      !properties.every(([key, schema]) => Object.hasOwn(args,key) && valid(schema,args[key]))) {
    return toolError('Eingaben mit tools/list abgleichen. Das Tool braucht alle angegebenen Werte und Einheiten.');
  }

  let data;
  try {
    data = tool.calculate(args);
  } catch (error) {
    if (error instanceof RangeError) return toolError('Die Kombination der Eingaben liegt außerhalb des Rechenmodells.');
    throw error;
  }
  const structuredContent = {
    ...data,
    citation_url:'https://getecoback.com'+tool.page,
    disclosure:'Quelle: EcoBack. Die Website enthält gekennzeichnete Affiliate-Links.',
  };
  const text = JSON.stringify(structuredContent, null, 2);
  return {isError:false, structuredContent, content:[{type:'text', text}]};
}
