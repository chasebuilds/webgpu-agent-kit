struct Uniforms {
  time: f32,
  aspect: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VSOut {
  var corners = array<vec2f, 3>(
    vec2f(0.0, 0.7),
    vec2f(-0.7, -0.6),
    vec2f(0.7, -0.6),
  );
  var colors = array<vec3f, 3>(
    vec3f(1.0, 0.3, 0.3),
    vec3f(0.3, 1.0, 0.4),
    vec3f(0.3, 0.5, 1.0),
  );
  let c = cos(u.time);
  let s = sin(u.time);
  let p = corners[index];
  let rotated = vec2f(p.x * c - p.y * s, p.x * s + p.y * c);

  var out: VSOut;
  out.position = vec4f(rotated.x / u.aspect, rotated.y, 0.0, 1.0);
  out.color = colors[index];
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(in.color, 1.0);
}
