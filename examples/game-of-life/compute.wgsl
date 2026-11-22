// Each cell stores its age: 0 is dead, 1 and up is alive for that many generations.
@group(0) @binding(0) var<uniform> grid: vec2u;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<storage, read_write> dst: array<u32>;

fn aliveAt(x: i32, y: i32) -> u32 {
  let w = i32(grid.x);
  let h = i32(grid.y);
  // The grid wraps around, so add the size before taking the remainder.
  let wx = u32((x + w) % w);
  let wy = u32((y + h) % h);
  return select(0u, 1u, src[wy * grid.x + wx] > 0u);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= grid.x || id.y >= grid.y) {
    return;
  }
  let x = i32(id.x);
  let y = i32(id.y);

  var neighbors = 0u;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      if (dx != 0 || dy != 0) {
        neighbors += aliveAt(x + dx, y + dy);
      }
    }
  }

  let index = id.y * grid.x + id.x;
  let age = src[index];
  var next = 0u;
  if (age > 0u) {
    if (neighbors == 2u || neighbors == 3u) {
      next = min(age + 1u, 255u);
    }
  } else if (neighbors == 3u) {
    next = 1u;
  }
  dst[index] = next;
}
