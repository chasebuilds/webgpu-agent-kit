# Compute shaders

Keywords: compute, dispatch, workgroup, workgroup_size, global_invocation_id, ping-pong, storage buffer, read_write

WGSL:

```wgsl
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&input)) { return; }
  output[id.x] = input[id.x] * 2.0;
}
```

JavaScript:

```js
const pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });
const pass = encoder.beginComputePass();
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.dispatchWorkgroups(Math.ceil(count / 64));
pass.end();
```

Rules that trip agents up:

- `dispatchWorkgroups(n)` launches n groups of `workgroup_size` threads. Total threads are rounded up, so guard against `id.x >= count` in the shader.
- A good default is `@workgroup_size(64)` for 1D work and `@workgroup_size(8, 8)` for images. The device limit on invocations per workgroup is 256 by default.
- A thread cannot safely read and write the same storage buffer that other threads read. Use two buffers and swap them each step (ping-pong). See the `compute-boids` and `game-of-life` examples.
- `var<storage, read_write>` is allowed in compute shaders only. Vertex shaders cannot use read-write storage buffers.
- Compute and render passes can share one command encoder. Ordering inside the encoder is respected.
- Use `arrayLength(&buf)` for runtime-sized arrays instead of passing the length (when it matches the buffer).
- Atomics need `var<storage, read_write>` plus `atomic<u32>` or `atomic<i32>` types and the `atomicAdd` family.
- Reading results on the CPU is asynchronous: copy to a `MAP_READ` buffer, `await mapAsync`, then read.
