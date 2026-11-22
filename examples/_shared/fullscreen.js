import { initGPU, loadWGSL, compile, run } from "./gpu.js";

// Runs a fragment shader over the whole canvas. The WGSL file must define entry points
// `vs` and `fs` and a uniform at @group(0) @binding(0):
//   struct U { res: vec2f, mouse: vec2f, time: f32 }
export async function fullscreenShader(canvas, wgslUrl, label) {
  const { device, context, format } = await initGPU(canvas);
  const module = await compile(device, await loadWGSL(wgslUrl), label);
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module, entryPoint: "vs" },
    fragment: { module, entryPoint: "fs", targets: [{ format }] },
  });
  const uniforms = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniforms } }],
  });

  return run(device, canvas, (time, _dt, _resized, pointer) => {
    device.queue.writeBuffer(
      uniforms,
      0,
      new Float32Array([canvas.width, canvas.height, pointer.x, pointer.y, time]),
    );
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
}
