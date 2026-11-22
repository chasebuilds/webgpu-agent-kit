import { initGPU, loadWGSL, compile, run } from "../_shared/gpu.js";

// One character per pixel. Letters index into the palette below.
const PIXELS = [
  "..yyyy..",
  ".yyyyyy.",
  "yykyykyy",
  "yyyyyyyy",
  "ykyyyyky",
  "yykkkkyy",
  ".yyyyyy.",
  "..yyyy..",
];
const PALETTE = { ".": [24, 28, 46, 255], y: [255, 205, 60, 255], k: [30, 20, 20, 255] };

export default async function start(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const module = await compile(device, await loadWGSL(new URL("./shader.wgsl", import.meta.url)), "texture-sampling");

  const bytes = new Uint8Array(8 * 8 * 4);
  PIXELS.forEach((row, y) => {
    [...row].forEach((ch, x) => bytes.set(PALETTE[ch], (y * 8 + x) * 4));
  });
  const texture = device.createTexture({
    size: [8, 8],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture({ texture }, bytes, { bytesPerRow: 8 * 4 }, [8, 8]);

  const nearest = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
  const linear = device.createSampler({ magFilter: "linear", minFilter: "linear" });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module, entryPoint: "vs" },
    fragment: { module, entryPoint: "fs", targets: [{ format }] },
  });
  const uniforms = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniforms } },
      { binding: 1, resource: texture.createView() },
      { binding: 2, resource: nearest },
      { binding: 3, resource: linear },
    ],
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
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
}
