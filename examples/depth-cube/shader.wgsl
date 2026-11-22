struct Uniforms {
  viewProjection: mat4x4f,
  model: mat4x4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
};

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
};

@vertex
fn vs(in: VSIn) -> VSOut {
  var out: VSOut;
  out.position = u.viewProjection * u.model * vec4f(in.position, 1.0);
  // w = 0 so the translation part of the matrix is ignored. This is only right for rotation and uniform scale.
  out.normal = (u.model * vec4f(in.normal, 0.0)).xyz;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let n = normalize(in.normal);
  let light = normalize(vec3f(0.5, 0.9, 0.7));
  let diffuse = max(dot(n, light), 0.0);
  let base = 0.5 + 0.5 * n;
  return vec4f(base * (0.5 + 0.7 * diffuse), 1.0);
}
