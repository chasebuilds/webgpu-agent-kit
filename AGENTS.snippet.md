## WebGPU

This project uses WebGPU. Before writing or changing WebGPU or WGSL code:

1. Find a starting point: `npx github:chasebuilds/webgpu-agent-kit examples search <keywords>`, then `examples show <id>` to read it. Copy the pattern instead of writing pipeline setup from memory.
2. Read the notes for the area you are touching: `npx github:chasebuilds/webgpu-agent-kit docs <topic>` (topics: setup, buffers, pipelines, compute, textures, wgsl, bind-groups, debugging).
3. After writing or editing any `.wgsl` file or WGSL string, validate it: `npx github:chasebuilds/webgpu-agent-kit check path/to/shader.wgsl`. Fix every error before saying the shader works.
4. Uniform and storage structs follow strict alignment rules (a `vec3f` aligns to 16 bytes). Check them against `docs buffers` before choosing buffer sizes.
5. Do not claim a WebGPU page renders correctly unless it was opened in a browser with WebGPU. `check` proves the shader compiles, not that the picture is right.

If the `webgpu-agent-kit` MCP server is connected, use its tools instead of the commands above: `examples_search`, `examples_show`, `examples_pull`, `check_wgsl`, `docs`, `doctor`.
