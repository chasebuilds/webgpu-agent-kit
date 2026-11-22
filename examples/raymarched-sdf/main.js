import { fullscreenShader } from "../_shared/fullscreen.js";

// Move the pointer over the canvas to orbit the camera.
export default function start(canvas) {
  return fullscreenShader(canvas, new URL("./shader.wgsl", import.meta.url), "raymarched-sdf");
}
