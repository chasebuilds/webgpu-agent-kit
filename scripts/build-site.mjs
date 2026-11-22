// Assembles the GitHub Pages site into dist/: the demo page plus the examples it runs.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../src/examples.js";

const dist = join(ROOT, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(ROOT, "demo"), dist, { recursive: true });
cpSync(join(ROOT, "examples"), join(dist, "examples"), { recursive: true });
cpSync(join(ROOT, "AGENTS.snippet.md"), join(dist, "AGENTS.snippet.md"));
console.log("built dist/");
