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

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

// Three layers of randomly placed stars on a grid.
fn stars(p: vec2f) -> vec3f {
  var color = vec3f(0.0);
  for (var layer = 0; layer < 3; layer++) {
    let seed = f32(layer) * 17.0;
    let grid = p * (10.0 + f32(layer) * 13.0);
    let cell = floor(grid);
    let local = fract(grid) - 0.5;
    let h = hash21(cell + seed);
    if (h > 0.9) {
      let jitter = vec2f(hash21(cell + 3.1 + seed), hash21(cell + 7.7 + seed)) - 0.5;
      let d = length(local - jitter * 0.6);
      let size = 0.05 + 0.08 * hash21(cell + 1.3);
      let tint = mix(vec3f(0.7, 0.8, 1.0), vec3f(1.0, 0.85, 0.7), hash21(cell + 9.9));
      color += tint * smoothstep(size, 0.0, d) * (0.5 + h);
    }
  }
  return color;
}

// What sits behind the black hole: stars plus a soft, turbulent glowing band.
fn background(p: vec2f) -> vec3f {
  let band = exp(-abs(p.y) * 9.0);
  let swirl = 0.5 + 0.5 * sin(p.x * 7.0 + sin(p.y * 11.0 + u.time * 0.3) * 2.0);
  let glow = vec3f(1.0, 0.55, 0.2) * band * (0.25 + 0.6 * swirl);
  return stars(p) + glow;
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let aspect = u.res.x / u.res.y;
  let uv = vec2f((frag.x / u.res.x - 0.5) * aspect, 0.5 - frag.y / u.res.y);

  // The hole follows the pointer, with a slow drift so it is alive when idle.
  let center = vec2f((u.mouse.x - 0.5) * aspect, 0.5 - u.mouse.y) + vec2f(sin(u.time * 0.4), cos(u.time * 0.3)) * 0.03;
  let theta = uv - center;
  let r = length(theta);

  let einstein = 0.22;
  let horizon = 0.06;

  // Point-mass lens equation: the source position is the image position minus E^2 / theta.
  let source = theta * (1.0 - (einstein * einstein) / (r * r + 0.0004));
  var color = background(source + center + vec2f(u.time * 0.01, 0.0));

  // A thin bright ring where light piles up near the Einstein radius.
  color += vec3f(1.0, 0.7, 0.4) * exp(-abs(r - einstein * 1.02) * 40.0) * 0.35;

  color *= smoothstep(horizon * 0.9, horizon * 1.6, r);
  color = color / (1.0 + color * 0.4);
  return vec4f(pow(color, vec3f(1.0 / 2.2)), 1.0);
}
