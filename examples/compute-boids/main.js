import { initGPU, loadWGSL, compile, run } from "../_shared/gpu.js";

const COUNT = 2048;

export default async function start(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const computeModule = await compile(device, await loadWGSL(new URL("./compute.wgsl", import.meta.url)), "boids compute");
  const renderModule = await compile(device, await loadWGSL(new URL("./render.wgsl", import.meta.url)), "boids render");

  // Initial state: 4 floats per boid (pos.xy, vel.xy).
  const initial = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    initial.set([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.cos(angle) * 0.3, Math.sin(angle) * 0.3], i * 4);
  }
  // Two buffers: read from one, write to the other, then swap every frame.
  const buffers = [0, 1].map(() =>
    device.createBuffer({
      size: initial.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
  );
  device.queue.writeBuffer(buffers[0], 0, initial);

  // Params: dt (f32), count (u32), bounds (vec2f). Same bytes viewed two ways.
  const paramsBytes = new ArrayBuffer(16);
  const paramsF32 = new Float32Array(paramsBytes);
  const paramsU32 = new Uint32Array(paramsBytes);
  const params = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const computePipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: computeModule, entryPoint: "main" },
  });
  const renderPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: renderModule, entryPoint: "vs" },
    fragment: { module: renderModule, entryPoint: "fs", targets: [{ format }] },
  });

  const computeGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: buffers[i] } },
        { binding: 2, resource: { buffer: buffers[1 - i] } },
      ],
    }),
  );
  const renderGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: buffers[i] } },
      ],
    }),
  );

  let current = 0;
  return run(device, canvas, (_time, dt) => {
    paramsF32[0] = dt;
    paramsU32[1] = COUNT;
    paramsF32[2] = canvas.width / canvas.height;
    paramsF32[3] = 1;
    device.queue.writeBuffer(params, 0, paramsBytes);

    const encoder = device.createCommandEncoder();

    const compute = encoder.beginComputePass();
    compute.setPipeline(computePipeline);
    compute.setBindGroup(0, computeGroups[current]);
    compute.dispatchWorkgroups(Math.ceil(COUNT / 64));
    compute.end();
    current = 1 - current; // the buffer we just wrote is now the one to read and draw

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.03, g: 0.04, b: 0.08, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderGroups[current]);
    pass.draw(3, COUNT);
    pass.end();

    device.queue.submit([encoder.finish()]);
  });
}
