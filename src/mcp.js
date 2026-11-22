import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { checkFile, checkSource, docsTopic, doctorReport, examplesPull, examplesSearch, examplesShow } from "./commands.js";
import { ROOT } from "./examples.js";

export const TOOL_NAMES = ["examples_search", "examples_show", "examples_pull", "check_wgsl", "doctor", "docs"];

const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

// Turn a command result into an MCP tool result. Errors from bad input come back as tool errors, not crashes.
async function respond(work) {
  try {
    const result = await work();
    return { content: [{ type: "text", text: result.text }], isError: result.isError ?? false };
  } catch (error) {
    return { content: [{ type: "text", text: `error: ${error.message}` }], isError: true };
  }
}

export function createServer() {
  const server = new McpServer({ name: "webgpu-agent-kit", version });

  server.registerTool(
    "examples_search",
    {
      title: "Search WebGPU examples",
      description: "Find bundled, tested WebGPU examples by keyword (for example 'compute particles' or 'texture'). An empty query lists all of them.",
      inputSchema: { query: z.string().optional().describe("Free-text keywords") },
    },
    ({ query }) => respond(() => examplesSearch(query ?? "")),
  );

  server.registerTool(
    "examples_show",
    {
      title: "Show an example's source",
      description: "Return the full source (JavaScript and WGSL) of one example, or one file of it.",
      inputSchema: {
        id: z.string().describe("Example id from examples_search"),
        file: z.string().optional().describe("One file name, for example shader.wgsl"),
      },
    },
    ({ id, file }) => respond(() => examplesShow(id, file)),
  );

  server.registerTool(
    "examples_pull",
    {
      title: "Copy an example into a folder",
      description: "Write a runnable copy of an example (index.html, main.js, shaders, helpers) into a directory. Serve it over http to run it.",
      inputSchema: {
        id: z.string().describe("Example id"),
        dir: z.string().describe("Target directory; created if missing"),
        force: z.boolean().optional().describe("Write into a non-empty directory"),
      },
    },
    ({ id, dir, force }) => respond(() => examplesPull(id, dir, { force })),
  );

  server.registerTool(
    "check_wgsl",
    {
      title: "Validate WGSL",
      description: "Validate WGSL with the naga compiler. Pass either `source` (shader text) or `path` (a .wgsl file). Returns line-numbered errors, or OK.",
      inputSchema: {
        source: z.string().optional().describe("WGSL source text"),
        path: z.string().optional().describe("Path to a .wgsl file"),
      },
    },
    ({ source, path }) =>
      respond(async () => {
        if (source === undefined && !path) throw new Error("Pass `source` or `path`.");
        const result = source !== undefined ? await checkSource(source, "shader.wgsl") : await checkFile(path);
        // The shader being invalid is a normal answer for this tool, so it is not an MCP error.
        return { text: result.text };
      }),
  );

  server.registerTool(
    "doctor",
    {
      title: "Environment report",
      description: "Report Node version, WGSL validator status and browser WebGPU support hints.",
      inputSchema: {},
    },
    () => respond(doctorReport),
  );

  server.registerTool(
    "docs",
    {
      title: "WebGPU API notes",
      description: "Short notes on a WebGPU topic (setup, buffers, pipelines, compute, textures, wgsl, bind-groups, debugging). Omit the topic to list them.",
      inputSchema: { topic: z.string().optional().describe("Topic name or keyword") },
    },
    ({ topic }) => respond(() => docsTopic(topic ?? "")),
  );

  return server;
}

export async function startServer() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}
