#!/usr/bin/env node
// Rebuilds the tool table in README.md from the live server's tools/list.
// Nothing in that table is hand-written: a README that drifts from the server
// it documents is worse than no README, because it is the thing a directory
// reviewer reads. Run daily by .github/workflows/sync.yml.

import { readFileSync, writeFileSync } from "node:fs";

const URL_MCP = process.env.MCP_URL || "https://getecoback.com/mcp/v1";

async function rpc(method, params) {
  const res = await fetch(URL_MCP, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let payload = text;
  if (/^\s*event:|^\s*data:/m.test(text)) {
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));
    payload = lines.length ? lines[lines.length - 1].slice(5).trim() : text;
  }
  const json = JSON.parse(payload);
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

// The descriptions are bilingual, "Deutsch — English". The table takes the
// English half so the list reads for an international audience; the German
// half stays in the server, where a German-speaking client sees it.
function englishHalf(desc) {
  const i = desc.indexOf("— ");
  return (i > -1 ? desc.slice(i + 2) : desc).trim();
}

const { tools } = await rpc("tools/list", {});
const rows = tools
  .map((t) => `| \`${t.name}\` | ${englishHalf(t.description).replace(/\|/g, "\\|")} |`)
  .join("\n");

const readme = readFileSync("README.md", "utf8");
const next = readme
  .replace(/<!-- tools:start -->[\s\S]*?<!-- tools:end -->/,
    `<!-- tools:start -->\n${rows}\n<!-- tools:end -->`)
  .replace(/<!-- count -->\d+<!-- \/count -->/g, `<!-- count -->${tools.length}<!-- /count -->`);

if (next !== readme) {
  writeFileSync("README.md", next);
  console.log(`README updated — ${tools.length} tools`);
} else {
  console.log(`No change — ${tools.length} tools`);
}
