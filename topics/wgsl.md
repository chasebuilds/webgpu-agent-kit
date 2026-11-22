# WGSL cheat sheet

Keywords: wgsl, syntax, types, vec, mat, let, var, const, override, struct, function, builtin, location, select, swizzle

```wgsl
const PI = 3.14159265;          // compile-time constant
override scale: f32 = 1.0;      // set from JS in pipeline `constants`
var<private> counter: u32;      // per-invocation global
let x = 1.0;                    // immutable local
var y = vec3f(1.0);             // mutable local
```

- Types: `f32 i32 u32 bool`, `vec2f vec3f vec4f vec2i vec3u ...`, `mat4x4f`, `array<T, N>`, `array<T>` (runtime-sized, storage only), `texture_2d<f32>`, `sampler`. `f16` needs `enable f16;` and the `shader-f16` feature.
- There is **no implicit conversion** between `i32`, `u32` and `f32`. Write `f32(i)`, `u32(x)`. Literals are flexible: `1` and `1.0` both work where a float is expected, but `1.0` where an integer is expected is an error.
- Declaration order of functions does not matter. Recursion is not allowed.
- Statements end with a semicolon. A `struct` declaration ends with `}` or `};`, both are accepted.
- Entry points: `@vertex fn`, `@fragment fn`, `@compute @workgroup_size(x, y, z) fn`.
- Built-ins: `@builtin(position)` (vertex out, fragment in), `vertex_index`, `instance_index`, `global_invocation_id`, `local_invocation_id`, `workgroup_id`.
- Inter-stage data uses `@location(n)`. Fragment outputs use `@location(n)` per color target.
- Branchless choice: `select(falseValue, trueValue, condition)`. The order is easy to get backwards.
- Swizzles: `v.xyz`, `v.rgb`, `v.xxy`. `for` loops: `for (var i = 0; i < n; i++) { }`. `break`, `continue`, `discard` (fragment only).
- Matrices are column-major. `m * v` multiplies the matrix by a column vector.
- Integer division by zero and out-of-range array indices do not crash. Indices are clamped.
- Uniform control flow matters for `textureSample`, `workgroupBarrier`, and derivatives (`dpdx`, `dpdy`).
- Reserved words cannot be identifiers. If a name fails to parse, try another (naga reports the exact position: run `check`).
