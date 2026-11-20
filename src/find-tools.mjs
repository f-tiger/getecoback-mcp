import { pathToFileURL } from 'node:url';
import { TOOLS } from './tools.mjs';
import { catalogueExample, expandedCatalog } from './eco-suite/src/mcp-expanded.mjs';
import { findCatalogueTools, indexCatalogue } from './eco-suite/site/assets/mcp-catalog-search.mjs';

const expandedByName = new Map(expandedCatalog.map(tool => [tool.name, tool]));
const index = indexCatalogue(TOOLS.map(tool => {
  const expanded = expandedByName.get(tool.name);
  return { ...tool, category: expanded?.category ?? 'Raumklima', page: expanded?.page };
}));

export function findTools(query) {
  const normalized = query.normalize('NFC').trim();
  const matches = normalized ? findCatalogueTools(index, {query: normalized}) : [];
  const tools = matches.slice(0, 5).map(tool => {
    const { citation_url, example } = catalogueExample(tool.name);
    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema,
      citation_url: citation_url ?? null,
      example_arguments: example?.arguments ?? null,
    };
  });
  return { totalMatches: matches.length, tools };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const query = process.argv.slice(2).join(' ').trim();
  const usage = 'Usage: node src/find-tools.mjs "German question or exact MCP tool name"';
  if (!query) {
    console.error(usage);
    process.exitCode = 2;
  } else if (query === '--help') {
    console.log(usage);
  } else {
    console.log(JSON.stringify(findTools(query), null, 2));
  }
}
