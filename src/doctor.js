import { existsSync } from "node:fs";
import { nagaVersion } from "./check.js";
import { listExamples } from "./examples.js";

const MIN_NODE = [24, 12];

function nodeOk() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major > MIN_NODE[0] || (major === MIN_NODE[0] && minor >= MIN_NODE[1]);
}

function candidates() {
  const env = process.env;
  switch (process.platform) {
    case "win32":
      return [
        ["Chrome", [`${env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`, `${env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`, `${env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`]],
        ["Edge", [`${env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`, `${env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`]],
        ["Firefox", [`${env.PROGRAMFILES}\\Mozilla Firefox\\firefox.exe`]],
      ];
    case "darwin":
      return [
        ["Chrome", ["/Applications/Google Chrome.app"]],
        ["Edge", ["/Applications/Microsoft Edge.app"]],
        ["Safari", ["/Applications/Safari.app"]],
        ["Firefox", ["/Applications/Firefox.app"]],
      ];
    default:
      return [
        ["Chrome", ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"]],
        ["Edge", ["/usr/bin/microsoft-edge"]],
        ["Firefox", ["/usr/bin/firefox"]],
      ];
  }
}

function browsersFound() {
  return candidates()
    .filter(([, paths]) => paths.some((p) => p && !p.includes("undefined") && existsSync(p)))
    .map(([name]) => name);
}

/** Environment report. Returns { lines, problems } so callers can print or return it. */
export async function doctor() {
  const lines = [];
  const problems = [];
  const row = (status, label, detail) => lines.push(`${status.padEnd(5)} ${label}: ${detail}`);

  if (nodeOk()) row("ok", "Node", `${process.versions.node} (needs ${MIN_NODE.join(".")} or newer for the WGSL checker)`);
  else {
    row("FAIL", "Node", `${process.versions.node}, but the WGSL checker needs ${MIN_NODE.join(".")} or newer`);
    problems.push("node");
  }

  const naga = await nagaVersion();
  if (naga) row("ok", "WGSL validator", `naga ${naga} (WebAssembly build)`);
  else {
    row("FAIL", "WGSL validator", "naga-wasm did not load, so `check` will not work");
    problems.push("naga");
  }

  row("ok", "Examples", `${listExamples().length} bundled`);

  const found = browsersFound();
  if (found.length) row("ok", "Browsers found", found.join(", "));
  else row("warn", "Browsers found", "none detected in the usual install paths");

  lines.push("");
  lines.push("WebGPU in the browser (a hint, not a test; check the version you actually run):");
  lines.push("  - Chrome and Edge 113 and newer: on by default on Windows, macOS and ChromeOS. Linux and Android need newer builds or flags.");
  lines.push("  - Safari 26 and newer, Firefox 141 and newer on Windows: available, but verify on your machine.");
  lines.push("  - To confirm: open the live demo, or run `await navigator.gpu?.requestAdapter()` in the DevTools console. An object means it works; null or undefined means it does not.");
  lines.push("  - Node has no built-in WebGPU. Run generated code in a browser, and use `check` to validate shaders from the terminal.");
  lines.push("  - Pages must be served over https or http://localhost. file:// will not load modules or shaders.");
  return { lines, problems, ok: problems.length === 0 };
}
