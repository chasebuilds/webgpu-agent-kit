struct Boid {
  pos: vec2f,
  vel: vec2f,
};

struct Params {
  dt: f32,
  count: u32,
  bounds: vec2f,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> boids: array<Boid>;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

@vertex
fn vs(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> VSOut {
  var shape = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(-0.5, -0.6),
    vec2f(0.5, -0.6),
  );
  let b = boids[instance];
  let forward = normalize(b.vel);
  let side = vec2f(-forward.y, forward.x);
  let local = shape[vertex] * 0.02;
  let world = b.pos + forward * local.y + side * local.x;

  var out: VSOut;
  out.position = vec4f(world / params.bounds, 0.0, 1.0);
  out.color = 0.6 + 0.4 * cos(atan2(forward.y, forward.x) + vec3f(0.0, 2.1, 4.2));
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(in.color, 1.0);
}
