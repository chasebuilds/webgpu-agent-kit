import { initGPU, loadWGSL, compile, run } from "../_shared/gpu.js";

const WIDTH = 640;
const HEIGHT = 360;
const MAX_RADIUS = 24;

export default async function start(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const load = async (name) => compile(device, await loadWGSL(new URL(`./${name}.wgsl`, import.meta.url)), name);
  const [generateModule, blurModule, showModule] = await Promise.all([load("generate"), load("blur"), load("show")]);

  // The same size and usage for all three textures: written by compute, read by compute or the sampler.
  const makeTexture = () =>
    device.createTexture({
      size: [WIDTH, HEIGHT],
      format: "rgba8unorm",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
  const original = makeTexture();
  const halfBlurred = makeTexture();
  const result = makeTexture();

  const generatePipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: generateModule, entryPoint: "main" },
  });
  const blurPipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: blurModule, entryPoint: "main" },
  });
  const showPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: showModule, entryPoint: "vs" },
    fragment: { module: showModule, entryPoint: "fs", targets: [{ format }] },
  });

  // Params: dir (vec2i) and radius (i32). One buffer per pass so both can be written before submit.
  const paramBuffer = () =>
    device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const horizontalParams = paramBuffer();
  const verticalParams = paramBuffer();

  const blurGroup = (params, from, to) =>
    device.createBindGroup({
      layout: blurPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: from.createView() },
        { binding: 2, resource: to.createView() },
      ],
    });
  const horizontalGroup = blurGroup(horizontalParams, original, halfBlurred);
  const verticalGroup = blurGroup(verticalParams, halfBlurred, result);
  const generateGroup = device.createBindGroup({
    layout: generatePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: original.createView() }],
  });
  const showGroup = device.createBindGroup({
    layout: showPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: result.createView() },
      { binding: 1, resource: device.createSampler({ magFilter: "linear", minFilter: "linear" }) },
    ],
  });

  const groupsX = Math.ceil(WIDTH / 8);
  const groupsY = Math.ceil(HEIGHT / 8);

  // The test image never changes, so draw it once.
  {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(generatePipeline);
    pass.setBindGroup(0, generateGroup);
    pass.dispatchWorkgroups(groupsX, groupsY);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  return run(device, canvas, (time) => {
    const radius = Math.round(1 + (0.5 + 0.5 * Math.sin(time * 0.9)) * (MAX_RADIUS - 1));
    device.queue.writeBuffer(horizontalParams, 0, new Int32Array([1, 0, radius, 0]));
    device.queue.writeBuffer(verticalParams, 0, new Int32Array([0, 1, radius, 0]));

    const encoder = device.createCommandEncoder();
    for (const group of [horizontalGroup, verticalGroup]) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(blurPipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(groupsX, groupsY);
      pass.end();
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
    pass.setPipeline(showPipeline);
    pass.setBindGroup(0, showGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
}
