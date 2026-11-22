# Bind groups

Keywords: bind group, layout, binding, group, resource, auto layout, getBindGroupLayout

A bind group hands buffers, textures and samplers to a shader. The shader names where it expects each one with `@group(g) @binding(b)`.

```wgsl
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> items: array<Item>;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;
```

```js
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: uniforms } },
    { binding: 1, resource: { buffer: items } },
    { binding: 2, resource: texture.createView() },
    { binding: 3, resource: sampler },
  ],
});
pass.setBindGroup(0, bindGroup);
```

- Binding numbers in JS must match the WGSL numbers.
- Buffer `usage` must match the declared address space: `var<uniform>` needs `UNIFORM`, `var<storage>` needs `STORAGE`.
- With `layout: "auto"`, a pipeline only exposes bindings its entry point actually uses. Other pipelines get their own layouts, so create one bind group per pipeline (or define explicit layouts with `createBindGroupLayout` and `createPipelineLayout` to share).
- A bind group cannot change what it points at. To use a different buffer or texture, make another bind group. Ping-pong setups build two ahead of time.
- Pass a view for textures, not the texture: `texture.createView()`.
- Pass a `{ buffer, offset, size }` object to bind a slice. Offsets for uniform buffers must be multiples of 256 (`minUniformBufferOffsetAlignment`).
- A read-write storage buffer (`var<storage, read_write>`) cannot be bound twice in one dispatch, for example as both source and destination.
- Per-frame values (time, mouse) belong in a uniform buffer updated with `queue.writeBuffer`. No new bind group is needed.
