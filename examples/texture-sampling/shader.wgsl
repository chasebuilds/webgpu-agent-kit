struct Uniforms {
  time: f32,
  aspect: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var image: texture_2d<f32>;
@group(0) @binding(2) var nearestSampler: sampler;
@group(0) @binding(3) var linearSampler: sampler;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VSOut {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let p = corners[index];
  let angle = sin(u.time * 0.8) * 0.35;
  let c = cos(angle);
  let s = sin(angle);
  let scaled = p * 0.8;
  let rotated = vec2f(scaled.x * c - scaled.y * s, scaled.x * s + scaled.y * c);

  var out: VSOut;
  out.position = vec4f(rotated.x / u.aspect, rotated.y, 0.0, 1.0);
  // Texture space has y pointing down, clip space has y pointing up.
  out.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  // Sample both ways first: textureSample must run in uniform control flow, so no branch around it.
  let sharp = textureSample(image, nearestSampler, in.uv);
  let smoothed = textureSample(image, linearSampler, in.uv);
  let divider = smoothstep(0.495, 0.5, in.uv.x) - smoothstep(0.5, 0.505, in.uv.x);
  let color = select(smoothed, sharp, in.uv.x < 0.5);
  return mix(color, vec4f(1.0), divider);
}
