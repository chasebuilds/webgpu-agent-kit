# Debugging WebGPU

Keywords: error, validation, getCompilationInfo, pushErrorScope, blank canvas, black screen, invalid, lost

1. **Validate shaders before running them.** `webgpu-agent-kit check shader.wgsl` prints line-numbered errors without a browser. In the browser, read `await module.getCompilationInfo()`; each message has `lineNum`, `linePos` and `type`.
2. **Catch validation errors.** Either listen once for `uncapturederror` on the device, or wrap a block:
   ```js
   device.pushErrorScope("validation");
   // ... create pipelines, submit work ...
   const error = await device.popErrorScope();
   if (error) console.error(error.message);
   ```
3. **Label things.** Pass `label: "particles"` to buffers, textures and pipelines. Error messages quote the label.

Blank or black canvas checklist:

- Did `requestAdapter()` return null, or is `navigator.gpu` missing? Check the console first.
- Is the canvas `width` and `height` set (not zero)?
- Is `pass.end()` called and `queue.submit` given `encoder.finish()`?
- Is the pipeline format equal to `getPreferredCanvasFormat()`?
- Is geometry culled? Set `cullMode: "none"` to test. Does the vertex shader output a `w` of 1?
- Is `draw` given a vertex count and (for instancing) an instance count?
- Are uniforms written before submit, and is the struct layout right? See the `buffers` topic.
- Is a depth buffer missing from the pass while the pipeline has `depthStencil`? They must match.
- Is the page served over http://localhost or https, not opened as a file?

Common error text and what it means:

- "Binding size ... is smaller than the minimum binding size": the buffer is smaller than the WGSL struct.
- "Bind group layout ... does not match": the bind group entries do not match what the shader uses. With `layout: "auto"`, unused bindings are dropped.
- "Destroyed texture used in a submit": `getCurrentTexture()` was called in an earlier frame; call it each frame.
- "Device is lost": the GPU reset or `device.destroy()` ran. Request a new device.
