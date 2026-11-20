import { pathToFileURL } from 'node:url';
import { TOOLS } from './tools.mjs';
import { drainDecision, drainTool } from './drain.mjs';
import { catalogueExample, expandedCall, expandedCatalog } from './eco-suite/src/mcp-expanded.mjs';
import { findCatalogueTools, indexCatalogue } from './eco-suite/site/assets/mcp-catalog-search.mjs';

const expandedByName = new Map(expandedCatalog.map(tool => [tool.name, tool]));
const drainExample = Object.freeze({drain:'level_or_uphill', model:'meaco-one-20'});
const index = indexCatalogue(TOOLS.map(tool => {
  const expanded = expandedByName.get(tool.name);
  return { ...tool, category: expanded?.category ?? 'Raumklima', page: expanded?.page };
}));

export function findTools(query) {
  const normalized = query.normalize('NFC').trim();
  const matches = normalized ? findCatalogueTools(index, {query: normalized}) : [];
  const tools = matches.slice(0, 5).map(tool => {
    const { citation_url, example } = catalogueExample(tool.name);
    const drainArguments = tool.name === drainTool.name ? {...drainExample} : null;
    const drain = drainArguments ? drainDecision(drainArguments).structuredContent : null;
    const guide_url = drain?.guide_url ?? expandedByName.get(tool.name)?.guide_url;
    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema,
      citation_url: drain?.citation_url ?? citation_url ?? null,
      ...(guide_url ? {guide_url} : {}),
      example_arguments: drainArguments ?? example?.arguments ?? null,
    };
  });
  return { totalMatches: matches.length, tools };
}

export function runReviewedExample(name) {
  const isDrain = name === drainTool.name;
  const reviewed = isDrain ? drainExample : catalogueExample(name).example?.arguments;
  if (!reviewed) return null;
  const example_arguments = structuredClone(reviewed);
  // Only the local deterministic handlers are reachable from this command.
  const result = isDrain ? drainDecision(example_arguments) : expandedCall(name, example_arguments);
  return {name, example_arguments, result};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const query = args.join(' ').trim();
  const usage = [
    'Usage: node src/find-tools.mjs "German question or exact MCP tool name"',
    '       node src/find-tools.mjs --example EXACT_TOOL_NAME',
  ].join('\n');
  if (args[0] === '--example') {
    const example = args.length === 2 ? runReviewedExample(args[1]) : null;
    if (example) {
      console.log(JSON.stringify(example, null, 2));
      if (example.result.isError) process.exitCode = 1;
    } else {
      console.error('Enter one exact tool name with a reviewed local example.\n' + usage);
      process.exitCode = 2;
    }
  } else if (!query) {
    console.error(usage);
    process.exitCode = 2;
  } else if (query === '--help') {
    console.log(usage);
  } else {
    console.log(JSON.stringify(findTools(query), null, 2));
  }
}
