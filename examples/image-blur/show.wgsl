@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var imageSampler: sampler;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VSOut {
  let p = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  var out: VSOut;
  out.position = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(p.x, 1.0 - p.y);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  return textureSample(image, imageSampler, in.uv);
}
