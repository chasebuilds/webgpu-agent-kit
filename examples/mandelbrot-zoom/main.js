import { fullscreenShader } from "../_shared/fullscreen.js";

export default function start(canvas) {
  return fullscreenShader(canvas, new URL("./shader.wgsl", import.meta.url), "mandelbrot-zoom");
}
