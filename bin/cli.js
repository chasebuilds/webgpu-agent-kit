#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { agentsSnippet, checkFile, checkSource, docsTopic, doctorReport, examplesPull, examplesSearch, examplesShow } from "../src/commands.js";
import { ROOT } from "../src/examples.js";
import { join } from "node:path";

const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

const HELP = `webgpu-agent-kit ${version}
Examples, a WGSL checker, docs and an MCP server for AI coding agents that write WebGPU.

Usage:
  webgpu-agent-kit examples search [query]       find examples (no query lists all)
  webgpu-agent-kit examples show <id> [--file f] print an example's source
  webgpu-agent-kit examples pull <id> <dir>      copy a runnable example into a folder (--force to overwrite)
  webgpu-agent-kit check <file.wgsl | ->         validate WGSL with naga, print line-numbered errors (--json)
  webgpu-agent-kit doctor                        report Node and browser WebGPU support hints
  webgpu-agent-kit docs [topic]                  short API notes (no topic lists them)
  webgpu-agent-kit agents-snippet                print the AGENTS.md snippet to paste into your project
  webgpu-agent-kit mcp                           start the MCP server on stdio

Without installing: npx github:chasebuilds/webgpu-agent-kit <command>
`;

function parse(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--file") flags.file = argv[++i];
    else if (arg === "--force") flags.force = true;
    else if (arg === "--json") flags.json = true;
    else if (arg === "-" || !arg.startsWith("-")) positional.push(arg);
    else throw new Error(`Unknown option ${arg}. Run with --help.`);
  }
  return { positional, flags };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return 0;
  }
  if (command === "--version" || command === "-v") {
    console.log(version);
    return 0;
  }
  if (command === "mcp") {
    const { startServer } = await import("../src/mcp.js");
    await startServer();
    return null; // keep running until the client closes stdin
  }

  const { positional, flags } = parse(rest);
  let result;
  switch (command) {
    case "examples": {
      const [sub, ...args] = positional;
      if (sub === "search" || sub === "list") result = examplesSearch(args.join(" "));
      else if (sub === "show" && args[0]) result = examplesShow(args[0], flags.file);
      else if (sub === "pull" && args[0] && args[1]) result = examplesPull(args[0], args[1], { force: flags.force });
      else throw new Error("Usage: examples search [query] | examples show <id> | examples pull <id> <dir>");
      break;
    }
    case "check": {
      if (!positional[0]) throw new Error("Usage: check <file.wgsl | ->");
      result = positional[0] === "-" ? await checkSource(await readStdin(), "<stdin>") : await checkFile(positional[0]);
      if (flags.json) {
        console.log(JSON.stringify(result.result, null, 2));
        return result.ok ? 0 : 1;
      }
      break;
    }
    case "doctor":
      result = await doctorReport();
      break;
    case "docs":
      result = docsTopic(positional.join(" "));
      break;
    case "agents-snippet":
      result = agentsSnippet();
      break;
    default:
      throw new Error(`Unknown command "${command}". Run with --help.`);
  }
  console.log(result.text);
  return result.ok ? 0 : 1;
}

main().then(
  (code) => {
    if (code !== null) process.exitCode = code;
  },
  (error) => {
    console.error(`error: ${error.message}`);
    process.exitCode = 2;
  },
);
