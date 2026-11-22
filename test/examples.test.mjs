import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkWGSL } from "../src/check.js";
import { EXAMPLES_DIR, buildIndex, getExample, listExamples, pullExample, searchExamples, showExample } from "../src/examples.js";

test("at least 8 examples, each with complete metadata and existing files", () => {
  const all = listExamples();
  assert.ok(all.length >= 8, `only ${all.length} examples`);
  for (const example of all) {
    assert.ok(example.title && example.summary, `${example.id} needs title and summary`);
    assert.ok(example.tags.length > 0, `${example.id} needs tags`);
    assert.ok(example.files.includes("main.js"), `${example.id} needs main.js`);
    for (const file of example.files) {
      assert.ok(existsSync(join(EXAMPLES_DIR, example.id, file)), `${example.id}/${file} is missing`);
    }
  }
});

test("every .wgsl file in every example is valid according to naga", async () => {
  for (const example of listExamples()) {
    for (const file of example.files.filter((f) => f.endsWith(".wgsl"))) {
      const source = readFileSync(join(EXAMPLES_DIR, example.id, file), "utf8");
      const result = await checkWGSL(source);
      assert.ok(result.ok, `${example.id}/${file}: ${JSON.stringify(result.errors)}`);
    }
  }
});

test("examples/index.json is up to date", () => {
  assert.equal(readFileSync(join(EXAMPLES_DIR, "index.json"), "utf8"), buildIndex(), "run `npm run build:index`");
});

test("search ranks by id, title and tags", () => {
  assert.equal(searchExamples("boids")[0].id, "compute-boids");
  assert.equal(searchExamples("game of life")[0].id, "game-of-life");
  assert.equal(searchExamples("depth buffer")[0].id, "depth-cube");
  assert.ok(searchExamples("black hole").some((e) => e.id === "black-hole-lensing"));
  assert.ok(searchExamples("part").some((e) => e.id === "instanced-galaxy"), "prefix match");
  assert.deepEqual(searchExamples("zzzzqqq"), []);
  assert.equal(searchExamples("").length, listExamples().length);
});

test("show returns the files, or one file, and rejects unknown names", () => {
  const { files } = showExample("compute-boids");
  assert.deepEqual(Object.keys(files), ["main.js", "compute.wgsl", "render.wgsl"]);
  assert.match(files["compute.wgsl"], /@compute/);
  assert.deepEqual(Object.keys(showExample("triangle", "shader.wgsl").files), ["shader.wgsl"]);
  assert.throws(() => showExample("triangle", "nope.wgsl"), /no file/);
  assert.throws(() => getExample("nope"), /No example called/);
});

test("pull writes a self-contained folder and refuses a non-empty one", () => {
  const dir = mkdtempSync(join(tmpdir(), "wak-"));
  try {
    const out = join(dir, "boids");
    const result = pullExample("compute-boids", out);
    assert.ok(result.files.includes("index.html") && result.files.includes("gpu.js"));
    const main = readFileSync(join(out, "main.js"), "utf8");
    assert.ok(!main.includes("_shared"), "shared imports were rewritten");
    assert.match(main, /from "\.\/gpu\.js"/);
    assert.throws(() => pullExample("compute-boids", out), /not empty/);
    pullExample("compute-boids", out, { force: true });

    // fullscreen.js imports gpu.js, so both must arrive.
    const sdf = join(dir, "sdf");
    pullExample("raymarched-sdf", sdf);
    assert.deepEqual(readdirSync(sdf).sort(), ["fullscreen.js", "gpu.js", "index.html", "main.js", "shader.wgsl"]);
    assert.match(readFileSync(join(sdf, "fullscreen.js"), "utf8"), /from "\.\/gpu\.js"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
