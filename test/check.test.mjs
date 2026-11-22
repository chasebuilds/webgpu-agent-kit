import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWGSL, formatCheck } from "../src/check.js";

const GOOD = `
@fragment
fn fs() -> @location(0) vec4f {
  return vec4f(1.0, 0.5, 0.0, 1.0);
}
`;

test("valid WGSL passes", async () => {
  const result = await checkWGSL(GOOD);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("a syntax error is reported with its line and column", async () => {
  const source = "@fragment\nfn fs() -> @location(0) vec4f {\n  return vec4f(1.0)\n}\n";
  const result = await checkWGSL(source);
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].kind, "parse");
  assert.match(result.errors[0].message, /expected `;`/);
  assert.equal(result.errors[0].line, 4, "the missing semicolon is noticed at the closing brace");
  assert.ok(result.errors[0].column >= 1);
});

test("a type error is reported on the right line", async () => {
  const source = "@fragment\nfn fs() -> @location(0) vec4f {\n  let x: i32 = 1.0;\n  return vec4f(1.0);\n}\n";
  const result = await checkWGSL(source);
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].line, 3);
  assert.match(result.errors[0].message, /i32/);
});

test("an undefined name is an error", async () => {
  const result = await checkWGSL("@fragment\nfn fs() -> @location(0) vec4f {\n  return vec4f(missing);\n}\n");
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].line, 3);
});

test("a shader with no entry point is valid but warns", async () => {
  const result = await checkWGSL("fn helper() -> f32 { return 1.0; }\n");
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
});

test("formatCheck prints file:line:col, the source line and a caret", async () => {
  const source = "@fragment\nfn fs() -> @location(0) vec4f {\n  let x: i32 = 1.0;\n  return vec4f(1.0);\n}\n";
  const text = formatCheck(await checkWGSL(source), source, "bad.wgsl");
  assert.match(text, /^bad\.wgsl:3:\d+: error: /m);
  assert.match(text, /\|\s+let x: i32 = 1\.0;/);
  assert.match(text, /\^/);
  assert.match(text, /1 error$/);
  assert.match(formatCheck(await checkWGSL(GOOD), GOOD, "ok.wgsl"), /OK, valid WGSL/);
});
