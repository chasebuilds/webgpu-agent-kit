struct Uniforms {
  aspect: f32,
  time: f32,
};

struct Particle {
  radius: f32,
  phase: f32,
  speed: f32,
  hue: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec3f,
};

@vertex
fn vs(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> VSOut {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let p = particles[instance];
  let angle = p.phase + u.time * p.speed;
  let breathe = 1.0 + 0.06 * sin(u.time * 1.5 + p.phase * 3.0);
  let center = vec2f(cos(angle), sin(angle)) * p.radius * breathe;
  let corner = corners[vertex];

  var out: VSOut;
  out.position = vec4f((center + corner * 0.011) * vec2f(1.0 / u.aspect, 1.0), 0.0, 1.0);
  out.local = corner;
  out.color = 0.55 + 0.45 * cos(6.28318 * (p.hue + vec3f(0.0, 0.33, 0.67)));
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let falloff = smoothstep(1.0, 0.0, length(in.local));
  return vec4f(in.color, falloff * falloff * 0.55);
}
