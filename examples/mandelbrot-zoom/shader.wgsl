struct Uniforms {
  res: vec2f,
  mouse: vec2f,
  time: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

const MAX_ITER = 400;

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  // Zoom in and back out between a wide view and a 500x closer one.
  // f32 runs out of precision much past this, which shows up as blocky pixels.
  let zoom = exp(-3.0 - 3.2 * (0.5 - 0.5 * cos(u.time * 0.35)));
  let target_point = vec2f(-0.743644, 0.131826);
  let aspect = u.res.x / u.res.y;
  let uv = vec2f((frag.x / u.res.x - 0.5) * aspect, 0.5 - frag.y / u.res.y);
  let c = target_point + uv * zoom * 4.0;

  var z = vec2f(0.0);
  var i = 0;
  for (; i < MAX_ITER; i++) {
    z = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 256.0) {
      break;
    }
  }
  if (i == MAX_ITER) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }
  // Smooth iteration count removes the visible bands between steps.
  let smoothed = f32(i) + 1.0 - log2(log2(dot(z, z)) * 0.5);
  let hue = 0.5 + 0.5 * cos(6.28318 * (smoothed * 0.02 + vec3f(0.0, 0.1, 0.2)));
  return vec4f(pow(hue, vec3f(1.2)), 1.0);
}
