@group(0) @binding(0) var<uniform> grid: vec2u;
@group(0) @binding(1) var<storage, read> cells: array<u32>;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VSOut {
  // One oversized triangle that covers the whole screen.
  let p = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  var out: VSOut;
  out.position = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(p.x, 1.0 - p.y);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let scaled = in.uv * vec2f(grid);
  let cell = min(vec2u(floor(scaled)), grid - vec2u(1u));
  let age = f32(cells[cell.y * grid.x + cell.x]);

  let local = fract(scaled);
  let edge = min(min(local.x, local.y), min(1.0 - local.x, 1.0 - local.y));
  let inset = smoothstep(0.0, 0.15, edge);

  let young = vec3f(1.0, 0.85, 0.4);
  let old = vec3f(0.15, 0.7, 0.75);
  let color = mix(young, old, clamp(age / 40.0, 0.0, 1.0));
  let background = vec3f(0.04, 0.05, 0.08);
  return vec4f(mix(background, color, step(0.5, age) * inset), 1.0);
}
