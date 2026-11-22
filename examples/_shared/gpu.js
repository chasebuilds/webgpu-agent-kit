// Small helpers shared by every example. `examples pull` copies this file next to the example.

export class WebGPUUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = "WebGPUUnavailable";
  }
}

// Ask for an adapter, a device and a configured canvas context.
export async function initGPU(canvas, { features = [] } = {}) {
  if (!navigator.gpu) {
    throw new WebGPUUnavailable(
      "This browser does not expose WebGPU (navigator.gpu is missing). Try a current Chrome or Edge, or Safari 26 or Firefox 141+ where WebGPU is enabled.",
    );
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new WebGPUUnavailable(
      "WebGPU is present but no graphics adapter was returned. The GPU may be blocklisted or hardware acceleration may be off.",
    );
  }
  const device = await adapter.requestDevice({
    requiredFeatures: features.filter((f) => adapter.features.has(f)),
  });
  // Without this listener, validation errors only show up as a vague console warning.
  device.addEventListener("uncapturederror", (event) => {
    console.error("WebGPU validation error:", event.error.message);
  });
  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });
  return { device, context, format };
}

// Fetch a .wgsl file next to the example.
export async function loadWGSL(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.text();
}

// Create a shader module and throw with line numbers if the compiler reports errors.
export async function compile(device, code, label) {
  const module = device.createShaderModule({ code, label });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === "error");
  if (errors.length) {
    throw new Error(`${label}: ${errors.map((e) => `line ${e.lineNum}: ${e.message}`).join("; ")}`);
  }
  return module;
}

// Keep the drawing buffer in step with the CSS size. Returns true when it changed.
export function fitCanvas(canvas) {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * scale));
  const height = Math.max(1, Math.floor(canvas.clientHeight * scale));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

// Run `frame(seconds, deltaSeconds, resized, pointer)` once per animation frame.
// Returns a handle: pause(), resume(), destroy().
export function run(device, canvas, frame) {
  const pointer = { x: 0.5, y: 0.5, down: false };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width;
    pointer.y = (e.clientY - r.top) / r.height;
  };
  const onDown = () => (pointer.down = true);
  const onUp = () => (pointer.down = false);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);

  let id = 0;
  let running = false;
  let elapsed = 0;
  let last = 0;
  let first = true;
  const tick = (now) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;
    const resized = fitCanvas(canvas) || first;
    first = false;
    frame(elapsed, dt, resized, pointer);
    id = requestAnimationFrame(tick);
  };
  const resume = () => {
    if (running) return;
    running = true;
    last = performance.now();
    id = requestAnimationFrame(tick);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(id);
  };
  const destroy = () => {
    pause();
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    device.destroy();
  };
  resume();
  return { pause, resume, destroy };
}
