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
@group(0) @binding(1) var<storage, read> src: array<Boid>;
@group(0) @binding(2) var<storage, read_write> dst: array<Boid>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= params.count) {
    return;
  }
  let me = src[i];

  var separation = vec2f(0.0);
  var alignment = vec2f(0.0);
  var cohesion = vec2f(0.0);
  var neighbors = 0.0;

  // Every boid looks at every other boid. Fine for a couple of thousand on a GPU.
  for (var j = 0u; j < params.count; j++) {
    if (j == i) {
      continue;
    }
    let other = src[j];
    let offset = other.pos - me.pos;
    let dist = length(offset);
    if (dist < 0.12) {
      neighbors += 1.0;
      alignment += other.vel;
      cohesion += other.pos;
      if (dist < 0.035) {
        separation -= offset / max(dist, 0.001);
      }
    }
  }

  var vel = me.vel;
  if (neighbors > 0.0) {
    vel += ((alignment / neighbors - me.vel) * 2.0
      + (cohesion / neighbors - me.pos) * 1.5
      + separation * 0.6) * params.dt;
  }
  let speed = length(vel);
  vel = vel / max(speed, 0.0001) * clamp(speed, 0.2, 0.4);

  var pos = me.pos + vel * params.dt;
  // Wrap around the edges.
  if (pos.x > params.bounds.x) { pos.x -= 2.0 * params.bounds.x; }
  if (pos.x < -params.bounds.x) { pos.x += 2.0 * params.bounds.x; }
  if (pos.y > params.bounds.y) { pos.y -= 2.0 * params.bounds.y; }
  if (pos.y < -params.bounds.y) { pos.y += 2.0 * params.bounds.y; }

  dst[i] = Boid(pos, vel);
}
