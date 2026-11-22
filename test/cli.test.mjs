import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });

test("examples search prints matching ids", () => {
  const r = run("examples", "search", "boids");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^compute-boids\b/);
});

test("examples search with no hits exits 1", () => {
  assert.equal(run("examples", "search", "zzzzqqq").status, 1);
});

test("examples show prints source", () => {
  const r = run("examples", "show", "triangle", "--file", "shader.wgsl");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /@vertex/);
  assert.equal(run("examples", "show", "nope").status, 2);
});

test("examples pull copies a runnable folder", () => {
  const dir = mkdtempSync(join(tmpdir(), "wak-cli-"));
  try {
    const r = run("examples", "pull", "triangle", join(dir, "out"));
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(join(dir, "out", "index.html"), "utf8"), /<canvas/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check exits 0 on good WGSL and 1 with a line number on broken WGSL", () => {
  const dir = mkdtempSync(join(tmpdir(), "wak-cli-"));
  try {
    const good = join(dir, "good.wgsl");
    const bad = join(dir, "bad.wgsl");
    writeFileSync(good, "@compute @workgroup_size(1)\nfn main() {}\n");
    writeFileSync(bad, "@compute @workgroup_size(1)\nfn main() {\n  let a = ;\n}\n");
    const ok = run("check", good);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /OK/);
    const broken = run("check", bad);
    assert.equal(broken.status, 1);
    assert.match(broken.stdout, /bad\.wgsl:3:\d+: error/);
    const json = JSON.parse(run("check", bad, "--json").stdout);
    assert.equal(json.ok, false);
    assert.equal(json.errors[0].line, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check reads stdin with -", () => {
  const r = spawnSync(process.execPath, [CLI, "check", "-"], { input: "fn broken( {", encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /<stdin>:1:/);
});

test("docs lists topics and finds one by keyword", () => {
  assert.match(run("docs").stdout, /buffers/);
  assert.match(run("docs", "alignment").stdout, /vec3f/);
  assert.equal(run("docs", "zzzzqqq").status, 1);
});

test("doctor reports Node and the validator", () => {
  const r = run("doctor");
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Node/);
  assert.match(r.stdout, /naga/);
});

test("agents-snippet prints the paste-in block", () => {
  assert.match(run("agents-snippet").stdout, /^## WebGPU/);
});

test("unknown command exits 2", () => {
  assert.equal(run("frobnicate").status, 2);
});
