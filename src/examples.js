import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const EXAMPLES_DIR = join(ROOT, "examples");

const SHARED_IMPORT = /from\s+"\.\.\/_shared\/([\w-]+\.js)"/g;

/** Every example with its metadata, sorted by id. */
export function listExamples() {
  return readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => {
      const meta = JSON.parse(readFileSync(join(EXAMPLES_DIR, entry.name, "example.json"), "utf8"));
      return { id: entry.name, ...meta };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The text of examples/index.json, which the demo page loads. */
export function buildIndex() {
  return JSON.stringify(listExamples(), null, 2) + "\n";
}

export function getExample(id) {
  const found = listExamples().find((example) => example.id === id);
  if (!found) {
    const ids = listExamples().map((example) => example.id).join(", ");
    throw new Error(`No example called "${id}". Available: ${ids}`);
  }
  return found;
}

const words = (text) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Rank examples against a free-text query. An empty query returns everything. */
export function searchExamples(query = "") {
  const terms = words(query);
  const all = listExamples();
  if (terms.length === 0) return all.map((example) => ({ ...example, score: 0 }));

  return all
    .map((example) => {
      const idWords = words(example.id);
      const titleWords = words(example.title);
      const tagWords = example.tags.flatMap(words);
      const summaryWords = words(example.summary);
      let score = 0;
      for (const term of terms) {
        if (idWords.includes(term)) score += 5;
        if (titleWords.includes(term)) score += 4;
        if (tagWords.includes(term)) score += 3;
        if (summaryWords.includes(term)) score += 1;
        // Prefix matches so "part" finds "particles".
        if (term.length >= 3 && [...idWords, ...titleWords, ...tagWords].some((w) => w.startsWith(term) && w !== term)) {
          score += 2;
        }
      }
      return { ...example, score };
    })
    .filter((example) => example.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** The files of one example as { name: text }. Pass `file` to get a single one. */
export function showExample(id, file) {
  const example = getExample(id);
  const names = file ? [file] : example.files;
  if (file && !example.files.includes(file)) {
    throw new Error(`Example "${id}" has no file "${file}". Files: ${example.files.join(", ")}`);
  }
  const files = {};
  for (const name of names) files[name] = readFileSync(join(EXAMPLES_DIR, id, name), "utf8");
  return { example, files };
}

function bootstrapPage(example) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${example.title}</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0b0d12; color: #e8e8ee; font: 15px system-ui, sans-serif; }
    body { display: grid; place-items: center; }
    canvas { width: min(100vw, calc(100vh * 16 / 9)); aspect-ratio: 16 / 9; display: block; }
    #message { position: fixed; inset: auto 1rem 1rem; max-width: 40rem; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <p id="message"></p>
  <script type="module">
    import start from "./main.js";
    start(document.getElementById("canvas")).catch((error) => {
      document.getElementById("message").textContent = error.message;
      console.error(error);
    });
  </script>
</body>
</html>
`;
}

/**
 * Copy an example into `dir` so it runs on its own: its files, the shared helpers it imports,
 * and an index.html. The `../_shared/` imports are rewritten to `./`.
 */
export function pullExample(id, dir, { force = false } = {}) {
  const example = getExample(id);
  const target = resolve(dir);
  if (existsSync(target) && readdirSync(target).length > 0 && !force) {
    throw new Error(`${target} is not empty. Pick another folder or pass --force.`);
  }
  mkdirSync(target, { recursive: true });

  const written = [];
  const shared = new Set();
  for (const name of example.files) {
    let text = readFileSync(join(EXAMPLES_DIR, id, name), "utf8");
    if (name.endsWith(".js")) {
      text = text.replace(SHARED_IMPORT, (_match, file) => {
        shared.add(file);
        return `from "./${file}"`;
      });
    }
    writeFileSync(join(target, name), text);
    written.push(name);
  }
  // fullscreen.js imports gpu.js, so follow the chain.
  const queue = [...shared];
  while (queue.length) {
    const file = queue.pop();
    let text = readFileSync(join(EXAMPLES_DIR, "_shared", file), "utf8");
    text = text.replace(/from\s+"\.\/([\w-]+\.js)"/g, (_match, dep) => {
      if (!shared.has(dep)) {
        shared.add(dep);
        queue.push(dep);
      }
      return `from "./${dep}"`;
    });
    writeFileSync(join(target, file), text);
    written.push(file);
  }
  writeFileSync(join(target, "index.html"), bootstrapPage(example));
  written.push("index.html");
  return { example, dir: target, files: written };
}
