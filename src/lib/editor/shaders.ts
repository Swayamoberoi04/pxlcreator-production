/**
 * src/lib/editor/shaders.ts
 *
 * GLSL ES 3.00 shader sources for the WebGL2 rendering engine.
 *
 * There are three programs:
 *   1. VERTEX  — shared fullscreen-quad vertex stage.
 *   2. BLUR    — separable Gaussian, run twice (H then V) into ping-pong FBOs.
 *                Produces the low-frequency reference the detail effects need.
 *   3. MAIN    — the real photo pipeline. Samples the source texture and the
 *                blurred reference, then applies every Light / Color / Detail
 *                adjustment in a fixed, sensible order and writes the final
 *                pixel. This is where "the slider actually moves the image".
 *
 * All maths runs on 0..1 RGB. Uniforms arrive pre-normalised from the JS side
 * (see renderer.ts `uniformsFor`): bipolar sliders as -1..1, exposure in stops,
 * sharpening as 0..1.
 */

export const VERTEX_SRC = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  // a_pos is a fullscreen quad in clip space (-1..1).
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

export const BLUR_SRC = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_tex;
uniform vec2 u_dir; // texel step in one axis, pre-scaled for radius

const float W0 = 0.227027;
const float W1 = 0.1945946;
const float W2 = 0.1216216;
const float W3 = 0.054054;
const float W4 = 0.016216;

void main() {
  vec3 sum = texture(u_tex, v_uv).rgb * W0;
  sum += texture(u_tex, v_uv + u_dir * 1.0).rgb * W1;
  sum += texture(u_tex, v_uv - u_dir * 1.0).rgb * W1;
  sum += texture(u_tex, v_uv + u_dir * 2.0).rgb * W2;
  sum += texture(u_tex, v_uv - u_dir * 2.0).rgb * W2;
  sum += texture(u_tex, v_uv + u_dir * 3.0).rgb * W3;
  sum += texture(u_tex, v_uv - u_dir * 3.0).rgb * W3;
  sum += texture(u_tex, v_uv + u_dir * 4.0).rgb * W4;
  sum += texture(u_tex, v_uv - u_dir * 4.0).rgb * W4;
  outColor = vec4(sum, 1.0);
}`

export const MAIN_SRC = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;   // original AI image
uniform sampler2D u_blur;  // gaussian-blurred reference (low frequency)
uniform vec2 u_texel;      // 1.0 / textureSize, for neighbour taps

uniform float u_exposure;    // stops
uniform float u_contrast;    // -1..1
uniform float u_highlights;  // -1..1
uniform float u_shadows;     // -1..1
uniform float u_whites;      // -1..1
uniform float u_blacks;      // -1..1
uniform float u_temperature; // -1..1
uniform float u_tint;        // -1..1
uniform float u_vibrance;    // -1..1
uniform float u_saturation;  // -1..1
uniform float u_texture;     // -1..1
uniform float u_clarity;     // -1..1
uniform float u_dehaze;      // -1..1
uniform float u_sharpen;     // 0..1

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
float luma(vec3 c) { return dot(c, LUMA); }

void main() {
  vec3 c = texture(u_tex, v_uv).rgb;

  // ── White balance ────────────────────────────────────────────
  // Warm (+temp) lifts red, drops blue; +tint pushes magenta (drops green).
  c.r += u_temperature * 0.10;
  c.b -= u_temperature * 0.10;
  c.g -= u_tint * 0.10;
  c = clamp(c, 0.0, 1.0);

  // ── Exposure (multiplicative, in stops) ──────────────────────
  c *= exp2(u_exposure);
  c = clamp(c, 0.0, 4.0);

  // ── Tone regions: highlights / shadows / whites / blacks ─────
  // Luminance-weighted masks so each control targets its own tonal band.
  float l = clamp(luma(c), 0.0, 1.0);
  float hiMask = smoothstep(0.3, 0.95, l);
  float shMask = 1.0 - smoothstep(0.05, 0.7, l);
  float whMask = smoothstep(0.6, 1.0, l);
  float blMask = 1.0 - smoothstep(0.0, 0.4, l);

  c += u_highlights * hiMask * 0.35;
  c += u_shadows    * shMask * 0.35;
  c += u_whites     * whMask * 0.30;
  c += u_blacks     * blMask * 0.30;
  c = clamp(c, 0.0, 1.0);

  // ── Contrast (S-curve around mid grey) ───────────────────────
  c = (c - 0.5) * (1.0 + u_contrast) + 0.5;
  c = clamp(c, 0.0, 1.0);

  // ── Detail: local-contrast + high-pass effects ───────────────
  vec3 blur = texture(u_blur, v_uv).rgb;

  // Fine-detail high-pass from a 1px neighbourhood of the source.
  vec3 nb =
      texture(u_tex, v_uv + vec2(u_texel.x, 0.0)).rgb +
      texture(u_tex, v_uv - vec2(u_texel.x, 0.0)).rgb +
      texture(u_tex, v_uv + vec2(0.0, u_texel.y)).rgb +
      texture(u_tex, v_uv - vec2(0.0, u_texel.y)).rgb;
  vec3 src = texture(u_tex, v_uv).rgb;
  vec3 highpass = src - nb * 0.25;

  // Clarity: midtone-weighted local contrast (medium radius).
  float mid = clamp(1.0 - abs(l - 0.5) * 2.0, 0.0, 1.0);
  vec3 localC = c - blur;
  c += localC * u_clarity * mid;

  // Texture: fine high-frequency detail.
  c += highpass * u_texture * 1.5;

  // Sharpening: unsharp-mask add (uni-polar).
  c += highpass * u_sharpen * 2.0;

  // Dehaze: local contrast + slight global contrast lift.
  c += localC * u_dehaze * 0.6;
  c = (c - 0.5) * (1.0 + u_dehaze * 0.25) + 0.5;
  c = clamp(c, 0.0, 1.0);

  // ── Saturation ───────────────────────────────────────────────
  float lu = luma(c);
  c = mix(vec3(lu), c, 1.0 + u_saturation);
  c = clamp(c, 0.0, 1.0);

  // ── Vibrance (protects already-saturated pixels) ─────────────
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = mx - mn;
  float vibAmt = u_vibrance * (1.0 - sat);
  float lu2 = luma(c);
  c = mix(vec3(lu2), c, 1.0 + vibAmt);
  c = clamp(c, 0.0, 1.0);

  outColor = vec4(c, 1.0);
}`
