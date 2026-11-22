import { initGPU, loadWGSL, compile, run } from "../_shared/gpu.js";

// Column-major 4x4 matrices, which is what WGSL's mat4x4f expects.
function multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}
const rotateY = (a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};
const rotateX = (a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
};
// Perspective for WebGPU: depth runs from 0 (near) to 1 (far), unlike WebGL's -1 to 1.
function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const range = near - far;
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, far / range, -1, 0, 0, (far * near) / range, 0]);
}
const translate = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);

// Six faces. Each is a normal plus two edge directions whose cross product equals the normal,
// which makes the vertices counter-clockwise when seen from outside.
function buildCube() {
  const faces = [
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  const vertices = [];
  const indices = [];
  faces.forEach(([n, u, v], face) => {
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      vertices.push(...[0, 1, 2].map((i) => n[i] + su * u[i] + sv * v[i]), ...n);
    }
    const base = face * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

export default async function start(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const module = await compile(device, await loadWGSL(new URL("./shader.wgsl", import.meta.url)), "cube");

  const cube = buildCube();
  const vertexBuffer = device.createBuffer({
    size: cube.vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, cube.vertices);
  const indexBuffer = device.createBuffer({
    size: cube.indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, cube.indices);

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs",
      buffers: [
        {
          arrayStride: 6 * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" },
            { shaderLocation: 1, offset: 3 * 4, format: "float32x3" },
          ],
        },
      ],
    },
    fragment: { module, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list", cullMode: "back" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
  });

  const uniforms = device.createBuffer({
    size: 128,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniforms } }],
  });

  let depthTexture;
  return run(device, canvas, (time, _dt, resized) => {
    // The depth texture must match the canvas size, so rebuild it when the canvas changes.
    if (resized || !depthTexture) {
      depthTexture?.destroy();
      depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    const model = multiply(rotateX(time * 0.6), rotateY(time * 0.9));
    const viewProjection = multiply(perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 50), translate(0, 0, -4.2));
    device.queue.writeBuffer(uniforms, 0, viewProjection);
    device.queue.writeBuffer(uniforms, 64, model);

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
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");
    pass.drawIndexed(cube.indices.length);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
}
