import { initGPU, loadWGSL, compile, run } from "../_shared/gpu.js";

const WIDTH = 192;
const HEIGHT = 108;
const STEP_SECONDS = 0.06;

export default async function start(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const computeModule = await compile(device, await loadWGSL(new URL("./compute.wgsl", import.meta.url)), "life compute");
  const renderModule = await compile(device, await loadWGSL(new URL("./render.wgsl", import.meta.url)), "life render");

  const gridSize = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(gridSize, 0, new Uint32Array([WIDTH, HEIGHT]));

  const cells = [0, 1].map(() =>
    device.createBuffer({
      size: WIDTH * HEIGHT * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
  );

  const reseed = () => {
    const state = new Uint32Array(WIDTH * HEIGHT);
    for (let i = 0; i < state.length; i++) state[i] = Math.random() < 0.28 ? 1 : 0;
    device.queue.writeBuffer(cells[0], 0, state);
    current = 0;
    sinceReseed = 0;
  };
  let current = 0; // index of the buffer that holds the latest generation
  let sinceReseed = 0;
  let sinceStep = 0;
  reseed();
  canvas.addEventListener("click", reseed);

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
        { binding: 0, resource: { buffer: gridSize } },
        { binding: 1, resource: { buffer: cells[i] } },
        { binding: 2, resource: { buffer: cells[1 - i] } },
      ],
    }),
  );
  const renderGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: gridSize } },
        { binding: 1, resource: { buffer: cells[i] } },
      ],
    }),
  );

  const handle = run(device, canvas, (_time, dt) => {
    sinceStep += dt;
    sinceReseed += dt;
    // Life settles into still shapes; start over now and then so the demo stays busy.
    if (sinceReseed > 40) reseed();

    const encoder = device.createCommandEncoder();
    if (sinceStep >= STEP_SECONDS) {
      sinceStep = 0;
      const compute = encoder.beginComputePass();
      compute.setPipeline(computePipeline);
      compute.setBindGroup(0, computeGroups[current]);
      compute.dispatchWorkgroups(Math.ceil(WIDTH / 8), Math.ceil(HEIGHT / 8));
      compute.end();
      current = 1 - current;
    }

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderGroups[current]);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
  return {
    ...handle,
    destroy() {
      canvas.removeEventListener("click", reseed);
      handle.destroy();
    },
  };
}
