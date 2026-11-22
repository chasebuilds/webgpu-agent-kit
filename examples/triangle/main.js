import { initGPU, loadWGSL, compile, run } from "../_shared/gpu.js";

export default async function start(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const module = await compile(device, await loadWGSL(new URL("./shader.wgsl", import.meta.url)), "triangle");

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module, entryPoint: "vs" },
    fragment: { module, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  // Two f32 values need 8 bytes; the buffer is padded to 16 for headroom.
  const uniforms = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniforms } }],
  });

  return run(device, canvas, (time) => {
    device.queue.writeBuffer(uniforms, 0, new Float32Array([time, canvas.width / canvas.height]));

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.05, g: 0.06, b: 0.09, a: 1 },
          loadOp: "clear",
          storeOp: "store",
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
