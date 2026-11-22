# Render pipelines and passes

Keywords: render pipeline, pass, draw, vertex, fragment, depth, blend, instancing, entryPoint, layout auto

```js
const module = device.createShaderModule({ code });
const pipeline = device.createRenderPipeline({
  layout: "auto",
  vertex: { module, entryPoint: "vs", buffers: [/* vertex buffer layouts, or omit */] },
  fragment: { module, entryPoint: "fs", targets: [{ format }] },
  primitive: { topology: "triangle-list", cullMode: "back" },
  depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" }, // optional
});

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  }],
});
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.draw(vertexCount, instanceCount);
pass.end();
device.queue.submit([encoder.finish()]);
```

Rules that trip agents up:

- Call `context.getCurrentTexture()` once per frame. The texture is only valid for that frame.
- Forgetting `pass.end()` or reusing a finished encoder gives an "encoder is finished" error.
- The color target `format` must equal the canvas format (or the texture you render into).
- Triangles are front-facing when counter-clockwise on screen. With `cullMode: "back"`, a clockwise triangle disappears. If the mesh is invisible, swap the winding or set `cullMode: "none"` to test.
- Clip space is x and y in -1..1 with y up, depth in 0..1. Texture and pixel space has y pointing down. This is the usual cause of an upside-down image.
- A depth buffer needs its own texture with `RENDER_ATTACHMENT` usage, the same size as the color target. Recreate it when the canvas resizes.
- Without a vertex buffer you can still draw: use `@builtin(vertex_index)` and `@builtin(instance_index)` and compute positions in the shader. A fullscreen triangle is `draw(3)`.
- Alpha blending goes in the target: `blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } }`. Additive glow uses `dstFactor: "one"`.
- `layout: "auto"` builds bind group layouts from what the shader uses. Get them with `pipeline.getBindGroupLayout(index)`. Bindings the entry point does not use are not in the layout, so adding them to a bind group fails.
