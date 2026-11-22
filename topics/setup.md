# Setup: adapter, device, canvas

Keywords: init, adapter, device, context, configure, canvas, navigator.gpu, feature detection

```js
if (!navigator.gpu) throw new Error("WebGPU is not available in this browser");
const adapter = await navigator.gpu.requestAdapter(); // can be null
if (!adapter) throw new Error("No GPU adapter");
const device = await adapter.requestDevice();
const context = canvas.getContext("webgpu");
const format = navigator.gpu.getPreferredCanvasFormat(); // usually bgra8unorm or rgba8unorm
context.configure({ device, format, alphaMode: "opaque" });
```

Rules that trip agents up:

- Always check `navigator.gpu` and a null adapter. Show the user a message instead of a blank canvas.
- WebGPU needs a secure context: https or http://localhost. `file://` pages cannot fetch modules or shaders, so serve the folder (`npx serve .`).
- Use `getPreferredCanvasFormat()` for the canvas and for the render pipeline target. A mismatch is a validation error.
- Set `canvas.width` and `canvas.height` (drawing buffer) yourself. CSS size does not change them. Multiply by `devicePixelRatio` for sharp output.
- The preferred canvas format is not sRGB. If you do lighting math in linear space, apply `pow(color, vec3f(1.0 / 2.2))` before returning.
- Listen for `device.addEventListener("uncapturederror", e => console.error(e.error.message))`. Without it, mistakes only show as a short console warning.
- `device.lost` is a promise that resolves when the GPU resets or the device is destroyed.
- Optional features (for example `"timestamp-query"`) must be present in `adapter.features` and listed in `requiredFeatures`.
