// One direction of a separable blur. Run it once with dir = (1, 0), then once with dir = (0, 1).
struct Params {
  dir: vec2i,
  radius: i32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var output: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = vec2i(textureDimensions(source));
  let p = vec2i(id.xy);
  if (p.x >= dims.x || p.y >= dims.y) {
    return;
  }

  var sum = vec4f(0.0);
  var total = 0.0;
  let sigma2 = 0.5 * f32(params.radius * params.radius) + 0.5;
  for (var k = -params.radius; k <= params.radius; k++) {
    // Clamp so samples past the edge reuse the edge pixel.
    let q = clamp(p + params.dir * k, vec2i(0), dims - vec2i(1));
    let weight = exp(-f32(k * k) / sigma2);
    sum += textureLoad(source, q, 0) * weight;
    total += weight;
  }
  textureStore(output, p, sum / total);
}
