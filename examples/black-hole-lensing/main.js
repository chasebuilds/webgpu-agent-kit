import { fullscreenShader } from "../_shared/fullscreen.js";

// Move the pointer over the canvas to drag the black hole.
export default function start(canvas) {
  return fullscreenShader(canvas, new URL("./shader.wgsl", import.meta.url), "black-hole-lensing");
}
