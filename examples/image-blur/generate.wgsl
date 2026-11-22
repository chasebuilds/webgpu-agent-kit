// Draws a sharp test pattern so the blur is easy to see.
@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(output);
  if (id.x >= dims.x || id.y >= dims.y) {
    return;
  }
  let uv = vec2f(id.xy) / vec2f(dims);
  let p = (uv - 0.5) * vec2f(f32(dims.x) / f32(dims.y), 1.0);

  let tile = (i32(floor(uv.x * 32.0)) + i32(floor(uv.y * 18.0))) & 1;
  var color = mix(vec3f(0.10, 0.12, 0.22), vec3f(0.85, 0.86, 0.92), f32(tile) * 0.85);

  let d = length(p);
  if (abs(d - 0.3) < 0.025) {
    color = vec3f(1.0, 0.35, 0.25);
  }
  if (d < 0.12) {
    color = vec3f(0.2, 0.8, 1.0);
  }
  if (abs(p.x - p.y) < 0.012) {
    color = vec3f(1.0, 0.9, 0.3);
  }
  textureStore(output, id.xy, vec4f(color, 1.0));
}
