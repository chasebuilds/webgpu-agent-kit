# Textures, samplers and storage textures

Keywords: texture, sampler, writeTexture, copyExternalImageToTexture, mipmap, storage texture, textureSample, textureLoad, textureStore

Make a texture, upload pixels, sample it:

```js
const texture = device.createTexture({
  size: [width, height],
  format: "rgba8unorm",
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});
device.queue.writeTexture({ texture }, bytes, { bytesPerRow: width * 4 }, [width, height]);
const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
```

From an image: `createImageBitmap(blob)` then `device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [w, h])`. That texture needs `COPY_DST | RENDER_ATTACHMENT | TEXTURE_BINDING`.

WGSL:

```wgsl
@group(0) @binding(0) var img: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
// fragment: textureSample(img, samp, uv)       filtered, needs uniform control flow
// any stage: textureLoad(img, vec2i(x, y), 0)  exact texel, no sampler
```

Storage textures (written by compute):

```wgsl
@group(0) @binding(0) var out: texture_storage_2d<rgba8unorm, write>;
// textureStore(out, vec2u(x, y), vec4f(...));
```

The texture needs `STORAGE_BINDING`. Only some formats work as storage (rgba8unorm, rgba16float, rgba32float, r32float and a few more). To read and write the same image, use two textures.

Rules that trip agents up:

- `textureSample` must not sit inside non-uniform control flow (an `if` on a per-pixel value). Sample first, then branch on the result. Use `textureSampleLevel` or `textureLoad` when you cannot avoid it.
- Row padding: `writeTexture` accepts any `bytesPerRow`, but `copyBufferToTexture` and `copyTextureToBuffer` need `bytesPerRow` as a multiple of 256.
- Texture coordinates start at the top left with y pointing down.
- Mipmaps are not generated for you. Set `mipLevelCount` and fill each level yourself, or skip mips and use `minFilter: "linear"`.
- `rgba8unorm` is not sRGB. For gamma-correct color use `rgba8unorm-srgb`.
- A texture bound as storage and as a sampled texture in the same dispatch is an error. Split it into two passes with two textures.
