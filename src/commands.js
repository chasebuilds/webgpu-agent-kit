// One implementation of each command, returning plain text. The CLI prints it; the MCP server returns it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkWGSL, formatCheck } from "./check.js";
import { doctor } from "./doctor.js";
import { findTopic, listTopics } from "./docs.js";
import { ROOT, pullExample, searchExamples, showExample } from "./examples.js";

export function examplesSearch(query = "") {
  const hits = searchExamples(query);
  if (hits.length === 0) {
    return { ok: false, text: `No examples match "${query}". Run \`examples search\` with no query to list all ${searchExamples().length}.` };
  }
  const width = Math.max(...hits.map((h) => h.id.length));
  const rows = hits.map((h) => `${h.id.padEnd(width)}  [${h.kind}] ${h.title}. ${h.summary}`);
  return { ok: true, text: rows.join("\n") };
}

export function examplesShow(id, file) {
  const { example, files } = showExample(id, file);
  const parts = [`# ${example.title} (${example.id})`, example.summary, `Tags: ${example.tags.join(", ")}`, ""];
  for (const [name, text] of Object.entries(files)) {
    parts.push(`--- ${example.id}/${name} ---`, text.trimEnd(), "");
  }
  return { ok: true, text: parts.join("\n").trimEnd() };
}

export function examplesPull(id, dir, options) {
  const result = pullExample(id, dir, options);
  const text = [
    `Pulled "${result.example.id}" into ${result.dir}`,
    ...result.files.map((f) => `  ${f}`),
    "",
    "Serve the folder over http (for example `npx serve .`) and open index.html. file:// will not work.",
  ].join("\n");
  return { ok: true, text, files: result.files };
}

export async function checkSource(source, file = "shader.wgsl") {
  const result = await checkWGSL(source);
  return { ok: result.ok, text: formatCheck(result, source, file), result };
}

export async function checkFile(path) {
  const source = readFileSync(path, "utf8");
  return checkSource(source, path);
}

export function docsTopic(query) {
  if (!query) {
    const lines = listTopics().map((t) => `${t.name.padEnd(12)} ${t.title}`);
    return { ok: true, text: `Topics (run \`docs <topic>\`):\n${lines.join("\n")}` };
  }
  const topic = findTopic(query);
  if (!topic) {
    return { ok: false, text: `No topic matches "${query}". Topics: ${listTopics().map((t) => t.name).join(", ")}` };
  }
  return { ok: true, text: topic.text.trimEnd() };
}

export async function doctorReport() {
  const { lines, ok } = await doctor();
  return { ok, text: lines.join("\n") };
}

export function agentsSnippet() {
  return { ok: true, text: readFileSync(join(ROOT, "AGENTS.snippet.md"), "utf8").trimEnd() };
}
