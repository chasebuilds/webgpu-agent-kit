// Repository hygiene checks that run in CI: syntax of every JS file, and no em dashes anywhere.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "../src/examples.js";

const SKIP = new Set(["node_modules", ".git", "dist"]);
const EM_DASH = String.fromCodePoint(0x2014);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let failed = false;
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (/\.(js|mjs)$/.test(file)) {
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    } catch (error) {
      failed = true;
      console.error(`syntax error in ${rel}\n${error.stderr}`);
    }
  }
  if (/\.(js|mjs|json|md|html|css|wgsl|yml)$/.test(file) && readFileSync(file, "utf8").includes(EM_DASH)) {
    failed = true;
    console.error(`em dash found in ${rel}`);
  }
}
if (failed) process.exit(1);
console.log("lint ok");
