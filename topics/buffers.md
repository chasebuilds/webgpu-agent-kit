# Buffers and uniform layout

Keywords: buffer, uniform, storage, vertex, index, writeBuffer, alignment, padding, std140

Create and fill:

```js
const buffer = device.createBuffer({
  size: data.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(buffer, 0, data); // data is a typed array
```

Usage flags: `UNIFORM` (small, read-only, fast), `STORAGE` (large, can be read-write), `VERTEX`, `INDEX`, `COPY_SRC` / `COPY_DST` (needed to copy or `writeBuffer`), `MAP_READ` (read back to the CPU, cannot be combined with most other flags), `INDIRECT`.

Alignment rules for `struct` members in `var<uniform>` and `var<storage>` (the same rules apply to both):

| Type | Size | Alignment |
|---|---|---|
| f32, u32, i32 | 4 | 4 |
| vec2f | 8 | 8 |
| vec3f | 12 | **16** |
| vec4f | 16 | 16 |
| mat4x4f | 64 | 16 |

- A `vec3f` takes 12 bytes but the next member may not start until the next 16-byte boundary after its alignment. Prefer `vec4f`, or put an `f32` right after a `vec3f`: it fits in the 4 spare bytes.
- The struct size is rounded up to its largest member alignment.
- Arrays inside a **uniform** struct need an element stride that is a multiple of 16. `array<f32, 4>` fails in a uniform buffer; use `array<vec4f, 1>` or a storage buffer.
- Write f32 and u32 values into the same buffer by creating two views on one `ArrayBuffer`: `new Float32Array(bytes)` and `new Uint32Array(bytes)`.
- `writeBuffer` offsets and sizes must be multiples of 4.
- `minBindingSize` errors mean your buffer is smaller than the struct. Size the buffer to the struct, not to the data you happen to write.

Reading results back to the CPU: copy into a buffer with `MAP_READ | COPY_DST`, then `await buf.mapAsync(GPUMapMode.READ)`, read `buf.getMappedRange()`, and call `buf.unmap()`.
