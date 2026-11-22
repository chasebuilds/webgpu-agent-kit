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

fn sdSphere(p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}

fn sdBox(p: vec3f, size: vec3f) -> f32 {
  let q = abs(p) - size;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Smooth minimum: blends two shapes where they get close.
fn smin(a: f32, b: f32, k: f32) -> f32 {
  let h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

fn scene(p: vec3f) -> f32 {
  let swing = sin(u.time) * 0.9;
  let ball = sdSphere(p - vec3f(swing, 0.0, 0.0), 0.6);
  let block = sdBox(p - vec3f(-swing, 0.0, 0.0), vec3f(0.45)) - 0.08;
  let ground = p.y + 0.9;
  return min(smin(ball, block, 0.5), ground);
}

fn normalAt(p: vec3f) -> vec3f {
  let e = vec2f(0.001, 0.0);
  return normalize(vec3f(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx),
  ));
}

fn softShadow(origin: vec3f, dir: vec3f) -> f32 {
  var shade = 1.0;
  var t = 0.03;
  for (var i = 0; i < 48; i++) {
    let h = scene(origin + dir * t);
    shade = min(shade, 8.0 * h / t);
    t += clamp(h, 0.01, 0.3);
    if (h < 0.0005 || t > 6.0) {
      break;
    }
  }
  return clamp(shade, 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  // Pixel to screen space: y up, x scaled by aspect ratio.
  let uv = vec2f(frag.x * 2.0 - u.res.x, u.res.y - frag.y * 2.0) / u.res.y;

  let yaw = 0.5 + (u.mouse.x - 0.5) * 4.0;
  let height = 1.0 + (0.5 - u.mouse.y) * 2.5;
  let origin = vec3f(sin(yaw) * 3.8, height, cos(yaw) * 3.8);
  let forward = normalize(vec3f(0.0, -0.1, 0.0) - origin);
  let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, forward);
  let dir = normalize(uv.x * right + uv.y * up + 1.8 * forward);

  var t = 0.0;
  var hit = false;
  for (var i = 0; i < 100; i++) {
    let d = scene(origin + dir * t);
    if (d < 0.001) {
      hit = true;
      break;
    }
    t += d;
    if (t > 20.0) {
      break;
    }
  }

  let sky = mix(vec3f(0.55, 0.7, 0.9), vec3f(0.12, 0.16, 0.3), clamp(dir.y * 1.5 + 0.2, 0.0, 1.0));
  var color = sky;
  if (hit) {
    let p = origin + dir * t;
    let n = normalAt(p);
    let light = normalize(vec3f(0.6, 0.8, 0.3));
    let diffuse = max(dot(n, light), 0.0) * softShadow(p + n * 0.01, light);
    let ambient = 0.18 + 0.12 * n.y;

    var albedo = vec3f(0.95, 0.5, 0.3);
    if (p.y < -0.88) {
      let checker = (i32(floor(p.x * 1.5)) + i32(floor(p.z * 1.5))) & 1;
      albedo = mix(vec3f(0.25), vec3f(0.8), f32(checker));
    }
    color = albedo * (diffuse * 1.1 + ambient);
    color = mix(color, sky, 1.0 - exp(-0.015 * t * t));
  }
  // The canvas format is not sRGB, so encode gamma by hand.
  return vec4f(pow(color, vec3f(1.0 / 2.2)), 1.0);
}
