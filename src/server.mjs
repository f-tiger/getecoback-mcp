#!/usr/bin/env node
// Stdio MCP server. Run it directly:  npx github:f-tiger/getecoback-mcp
// The same tools are also served over HTTP at https://getecoback.com/mcp/v1
// if you would rather not run anything locally.
//
// No SDK dependency on purpose: this is a small, auditable JSON-RPC loop over
// stdio, so the package installs with zero transitive dependencies.

import { createInterface } from "node:readline";
import { TOOLS, callTool } from "./tools.mjs";
import { CELLAR_RESOURCE, CELLAR_RESOURCE_TEXT } from "./cellar-resource.mjs";

const PROTOCOL_VERSION = "2025-06-18";
import {pageTools} from './eco-suite/src/mcp-pagination.mjs';

const SERVER_INFO = { name: "getecoback-raumklima", version: "1.22.22" };
const assistant = process.argv.slice(2).includes('--compact') ? await import('./assistant-tools.mjs') : null;
const availableTools = assistant?.ASSISTANT_TOOLS ?? TOOLS;
const runTool = assistant?.callAssistantTool ?? callTool;
const resourceHint = 'Bei Fragen zu kalten Kellern findest du über resources/list eine offline lesbare Quellenübersicht zu Prüfbedingungen und Kondensatablauf.';

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
  const resourceParams = params === undefined || (params !== null && typeof params === 'object' && !Array.isArray(params));

  if (method === "initialize") {
    return result(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {}, resources: {} },
      serverInfo: SERVER_INFO,
      instructions: assistant ? `${assistant.INSTRUCTIONS} ${resourceHint}` : resourceHint,
    });
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return; // nothing to acknowledge
  }
  if (method === "ping") {
    return result(id, {});
  }
  if (method === "resources/list" || method === "resources/templates/list") {
    if (isNotification) return;
    if (!resourceParams || params?.cursor !== undefined) return failure(id, -32602, 'Invalid resource listing parameters');
    return result(id, method === "resources/list" ? {resources:[CELLAR_RESOURCE]} : {resourceTemplates:[]});
  }
  if (method === "resources/read") {
    if (isNotification) return;
    const uri = params?.uri;
    if (!resourceParams || typeof uri !== 'string' || !uri) return failure(id, -32602, 'A resource URI is required');
    if (uri !== CELLAR_RESOURCE.uri) return failure(id, -32002, 'Resource not found');
    return result(id, {contents:[{uri, mimeType:CELLAR_RESOURCE.mimeType, text:CELLAR_RESOURCE_TEXT}]});
  }
  if (method === "tools/list") {
    const page = pageTools(availableTools,params?.cursor,SERVER_INFO.version);
    return page ? result(id,page) : failure(id,-32602,"invalid or expired tools cursor");
  }
  if (method === "tools/call") {
    const name = params?.name;
    if (!availableTools.some((t) => t.name === name)) {
      return failure(id, -32602, `Unknown tool: ${name}`);
    }
    try {
      return result(id, await runTool(name, params?.arguments));
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
