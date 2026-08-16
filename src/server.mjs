#!/usr/bin/env node
// Stdio MCP server. Run it directly:  npx getecoback-mcp
// The same nine tools are also served over HTTP at https://getecoback.com/mcp/v1
// if you would rather not run anything locally.
//
// No SDK dependency on purpose: this is a small, auditable JSON-RPC loop over
// stdio, so the package installs with zero transitive dependencies.

import { createInterface } from "node:readline";
import { TOOLS, callTool } from "./tools.mjs";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "getecoback-raumklima", version: "1.1.0" };

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function result(id, value) {
  send({ jsonrpc: "2.0", id, result: value });
}

function failure(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(msg) {
  const { id, method, params } = msg;
  // Notifications carry no id and expect no response.
  const isNotification = id === undefined || id === null;

  if (method === "initialize") {
    return result(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return; // nothing to acknowledge
  }
  if (method === "ping") {
    return result(id, {});
  }
  if (method === "tools/list") {
    return result(id, { tools: TOOLS });
  }
  if (method === "tools/call") {
    const name = params?.name;
    if (!TOOLS.some((t) => t.name === name)) {
      return failure(id, -32602, `Unknown tool: ${name}`);
    }
    try {
      return result(id, await callTool(name, params?.arguments));
    } catch (e) {
      // A tool failure is reported in-band so the client can show it to the
      // user, rather than as a protocol error that looks like a broken server.
      return result(id, {
        content: [{ type: "text", text: `Tool ${name} failed: ${e.message}` }],
        isError: true,
      });
    }
  }
  if (!isNotification) failure(id, -32601, `Method not found: ${method}`);
}

const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  const text = line.trim();
  if (!text) return;
  let msg;
  try {
    msg = JSON.parse(text);
  } catch (e) {
    return failure(null, -32700, "Parse error");
  }
  try {
    await handle(msg);
  } catch (e) {
    if (msg?.id !== undefined && msg?.id !== null) failure(msg.id, -32603, e.message);
  }
});
