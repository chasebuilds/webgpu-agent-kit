# WebGPU Agent Kit

[![ci](https://github.com/chasebuilds/webgpu-agent-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/chasebuilds/webgpu-agent-kit/actions/workflows/ci.yml)

WebGPU lets a web page use the graphics card for 3D scenes, simulations and heavy math. AI coding assistants often get it wrong: the shader language is strict, and one bad buffer size gives a blank screen with no clue why.

This kit gives your assistant what it is missing:

- **Ten working examples** it can search, read and copy, from a spinning triangle to a GPU flocking simulation.
- **A shader checker** that tells it exactly which line of a shader is wrong, without opening a browser.
- **Short notes** on the parts people get stuck on, like how to lay out data in memory.
- **An MCP server**, so assistants like Claude Code and Cursor can use all of this as built-in tools.

**Live demo: https://chasebuilds.github.io/webgpu-agent-kit/**

Every example runs live on that page, with a Source tab showing the exact code. If your browser has no WebGPU, the page says so and the Source tabs still work.

![Demo page with live examples](docs/preview.png)

## Quick start

You need Node 24.12 or newer. Nothing to install first; `npx` fetches it from GitHub.

```sh
# Find an example
npx github:chasebuilds/webgpu-agent-kit examples search particles

# Copy one into a folder, then serve it (npx serve .) and open index.html
npx github:chasebuilds/webgpu-agent-kit examples pull compute-boids ./boids

# Check a shader for mistakes
npx github:chasebuilds/webgpu-agent-kit check shader.wgsl
```

A failed check looks like this:

```
shader.wgsl:3:7: error: the type of `x` is expected to be `i32`, but got `{AbstractFloat}`
     3 |   let x: i32 = 1.0;
       |       ^
shader.wgsl: 1 error
```

## Connect it to your assistant

**MCP server** (Claude Code, Cursor, and other MCP clients). Add this to the client's MCP settings:

```json
{
  "mcpServers": {
    "webgpu-agent-kit": {
      "command": "npx",
      "args": ["-y", "github:chasebuilds/webgpu-agent-kit", "mcp"]
    }
  }
}
```

In Claude Code: `claude mcp add webgpu-agent-kit -- npx -y github:chasebuilds/webgpu-agent-kit mcp`.

The server offers six tools: `examples_search`, `examples_show`, `examples_pull`, `check_wgsl`, `docs` and `doctor`. They do the same thing as the commands below.

**AGENTS.md snippet.** Paste the block in [`AGENTS.snippet.md`](AGENTS.snippet.md) into your project's `AGENTS.md` or `CLAUDE.md`. It tells the assistant to look up an example first, read the notes, and run the checker before it says a shader works. Print it any time with `webgpu-agent-kit agents-snippet`.

## Commands

| Command | What it does |
|---|---|
| `examples search [query]` | Lists examples that match, best first. No query lists all of them. |
| `examples show <id> [--file name]` | Prints an example's source. |
| `examples pull <id> <dir>` | Copies a runnable example, with its helper files and an `index.html`, into a folder. |
| `check <file.wgsl>` | Validates WGSL and prints line-numbered errors. Exit code 1 if invalid. `-` reads stdin, `--json` prints JSON. |
| `docs [topic]` | Short API notes: setup, buffers, pipelines, compute, textures, wgsl, bind-groups, debugging. |
| `doctor` | Reports your Node version, whether the validator loads, which browsers are installed, and WebGPU support hints. |
| `agents-snippet` | Prints the AGENTS.md block. |
| `mcp` | Starts the MCP server on stdio. |

## The examples

| Id | What it shows |
|---|---|
| `triangle` | The smallest complete program: pipeline, uniform buffer, vertex colors |
| `texture-sampling` | A tiny image drawn with nearest and linear filtering side by side |
| `instanced-galaxy` | 24,000 particles in one draw call, storage buffer, additive blending |
| `compute-boids` | 2,048 flocking birds simulated by a compute shader |
| `game-of-life` | Conway's cellular automaton on the GPU, click to reseed |
| `image-blur` | Compute shader writes an image, then a two-pass blur softens it |
| `raymarched-sdf` | Signed distance fields, soft shadows, orbit camera |
| `black-hole-lensing` | A point mass bends a star field into an Einstein ring |
| `mandelbrot-zoom` | Endless zoom with smooth coloring |
| `depth-cube` | 3D cube with a perspective matrix, index buffer and depth texture |

All ten are original code written for this project. Each one is a folder with a `main.js`, its WGSL files and a small `example.json`. They all share two helper files in `examples/_shared/` (device setup, a shader compile helper that reports line numbers, a frame loop); `examples pull` copies the ones an example needs.

## How the checker works

`check` runs [naga](https://github.com/gfx-rs/wgpu/tree/trunk/naga), the shader compiler used by Firefox and wgpu, compiled to WebAssembly through the [`naga-wasm`](https://www.npmjs.com/package/naga-wasm) package. It parses and validates the shader, then this kit turns naga's report into `file:line:column` errors. Every shader in the example gallery is validated by the test suite.

What it does not do: it proves a shader compiles under naga's rules, not that the picture looks right, and not that your JavaScript sets up buffers correctly. Browsers have their own compiler (Tint in Chrome), and the two can disagree on rare edge cases. For the last step, open the page in a browser; the `debugging` topic lists what to look for.

## Develop

```sh
npm install
npm test          # unit tests, CLI tests, and an MCP server test over stdio
npm run lint      # JS syntax check and no-em-dash check
npm run demo      # builds dist/ and serves it at http://localhost:47931/
npm run build:index   # regenerate examples/index.json after changing an example
```

To add an example, create `examples/<id>/` with `main.js`, your `.wgsl` files and an `example.json` (title, summary, tags, kind, files), then run `npm run build:index`. The tests fail if any shader is invalid or the index is stale.

## Credits and license

Inspired by the [`vgpu`](https://github.com/vercel-labs/vgpu) project from Vercel Labs and its command line for browsing WebGPU examples. This repository shares no code with it; the examples, checker, docs and MCP server here are written from scratch.

MIT license. Built by Chase Builds.
