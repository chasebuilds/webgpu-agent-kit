import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TOOL_NAMES } from "../src/mcp.js";

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
let client;

before(async () => {
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [CLI, "mcp"] }));
});
after(() => client?.close());

const text = (result) => result.content.map((c) => c.text).join("\n");

test("the server lists every tool, each with a description and an input schema", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [...TOOL_NAMES].sort());
  for (const tool of tools) {
    assert.ok(tool.description.length > 20, `${tool.name} needs a description`);
    assert.equal(tool.inputSchema.type, "object");
  }
});

test("examples_search and examples_show work over MCP", async () => {
  const search = await client.callTool({ name: "examples_search", arguments: { query: "flocking" } });
  assert.match(text(search), /compute-boids/);
  const show = await client.callTool({ name: "examples_show", arguments: { id: "triangle", file: "shader.wgsl" } });
  assert.match(text(show), /@vertex/);
  const missing = await client.callTool({ name: "examples_show", arguments: { id: "nope" } });
  assert.equal(missing.isError, true);
});

test("examples_pull writes files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wak-mcp-"));
  try {
    const result = await client.callTool({ name: "examples_pull", arguments: { id: "triangle", dir: join(dir, "t") } });
    assert.equal(result.isError, false);
    assert.match(readFileSync(join(dir, "t", "main.js"), "utf8"), /initGPU/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check_wgsl reports broken and good source", async () => {
  const bad = await client.callTool({ name: "check_wgsl", arguments: { source: "@fragment\nfn f() -> @location(0) vec4f {\n  return vec4f(1.0)\n}\n" } });
  assert.match(text(bad), /shader\.wgsl:4:\d+: error/);
  const good = await client.callTool({ name: "check_wgsl", arguments: { source: "@compute @workgroup_size(1)\nfn main() {}\n" } });
  assert.match(text(good), /OK, valid WGSL/);
  const neither = await client.callTool({ name: "check_wgsl", arguments: {} });
  assert.equal(neither.isError, true);
});

test("docs and doctor work over MCP", async () => {
  assert.match(text(await client.callTool({ name: "docs", arguments: { topic: "compute" } })), /dispatchWorkgroups/);
  assert.match(text(await client.callTool({ name: "doctor", arguments: {} })), /naga/);
});
