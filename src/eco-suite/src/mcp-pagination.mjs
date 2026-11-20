export const MCP_PAGE_SIZE = 100;

// Cursors are opaque to clients. A release change invalidates old offsets so
// a client never skips or repeats tools after a deployment changes the list.
export function pageTools(tools, cursor, version) {
  const prefix = version + ':';
  let start = 0;
  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || !cursor.startsWith(prefix)) return null;
    const offset = cursor.slice(prefix.length);
    if (!/^[1-9]\d{1,6}$/.test(offset)) return null;
    start = Number(offset);
    if (start % MCP_PAGE_SIZE || start >= tools.length) return null;
  }
  const end = start + MCP_PAGE_SIZE;
  const page = {tools:tools.slice(start,end)};
  if (end < tools.length) page.nextCursor = prefix + end;
  return page;
}

export async function collectToolPages(readPage,{maxPages=21}={}) {
  if (!Number.isSafeInteger(maxPages) || maxPages < 1) throw new RangeError('Invalid tools/list page limit');
  const tools = [];
  const seenNames = new Set();
  const cursors = new Set();
  let cursor;
  do {
    const page = await readPage(cursor);
    if (!Array.isArray(page?.tools) || page.tools.length > MCP_PAGE_SIZE) {
      throw new Error('Malformed tools/list page');
    }
    for (const tool of page.tools) {
      if (!tool?.name || seenNames.has(tool.name)) throw new Error('Missing or repeated tool name');
      seenNames.add(tool.name);
      tools.push(tool);
    }
    cursor = page.nextCursor;
    if (cursor === undefined) return tools;
    if (typeof cursor !== 'string' || !cursor || cursors.has(cursor) || cursors.size >= maxPages - 1) {
      throw new Error('Invalid or repeated tools/list cursor');
    }
    cursors.add(cursor);
  } while (true);
}
