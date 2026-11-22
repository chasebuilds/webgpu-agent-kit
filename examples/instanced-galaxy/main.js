import { initGPU, loadWGSL, compile, run } from "../_shared/gpu.js";

const COUNT = 24000;

export default async function start(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const module = await compile(device, await loadWGSL(new URL("./shader.wgsl", import.meta.url)), "galaxy");

  // 4 floats per particle: radius, phase, speed, hue.
  const data = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const radius = Math.pow(Math.random(), 0.7) * 0.9;
    const arm = (i % 3) * ((Math.PI * 2) / 3);
    data.set(
      [radius, radius * 7 + arm + (Math.random() - 0.5) * 0.7, 0.3 + 0.12 / (0.3 + radius), 0.55 + radius * 0.4],
      i * 4,
    );
  }
  const particles = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(particles, 0, data);

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module, entryPoint: "vs" },
    fragment: {
      module,
      entryPoint: "fs",
      targets: [
        {
          format,
          // Additive blending: overlapping particles add up to a glow.
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
          },
        },
      ],
    },
  });
  const uniforms = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniforms } },
      { binding: 1, resource: { buffer: particles } },
    ],
  });

  return run(device, canvas, (time) => {
    device.queue.writeBuffer(uniforms, 0, new Float32Array([canvas.width / canvas.height, time]));
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.01, g: 0.01, b: 0.03, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6, COUNT);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
}
