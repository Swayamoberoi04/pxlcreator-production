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

import { MAX_SPOTS } from "./adjustments"

/** Injected into the SPOT shader's uniform array sizes + loop bound. */
const MAX_SPOTS_GLSL = MAX_SPOTS

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

/**
 * COPY — trivial passthrough used to present the final masked accumulator FBO
 * onto the screen (the masked path renders into FBOs, then blits here).
 */
export const COPY_SRC = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_tex;
void main() { outColor = texture(u_tex, v_uv); }`

/**
 * SPOT — healing / clone retouch pre-pass.
 *
 * Runs on the source image before any adjustments. For each spot, pixels inside
 * the (feathered) target ellipse are replaced by pixels sampled from the source
 * location. Clone copies verbatim; Heal transfers only the source's texture
 * (high frequency) and keeps the target's own colour (low frequency, from the
 * blurred reference) — the classic gradient-domain heal, cheap enough for live.
 */
export const SPOT_SRC = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform sampler2D u_blur;
uniform float u_aspect;      // width / height
uniform int   u_spotCount;
uniform vec2  u_spotT[${MAX_SPOTS_GLSL}];
uniform vec2  u_spotS[${MAX_SPOTS_GLSL}];
uniform float u_spotR[${MAX_SPOTS_GLSL}];
uniform float u_spotF[${MAX_SPOTS_GLSL}];
uniform float u_spotHeal[${MAX_SPOTS_GLSL}];

void main() {
  vec3 c = texture(u_src, v_uv).rgb;
  vec2 P = vec2(v_uv.x, 1.0 - v_uv.y); // display space (y down)

  for (int i = 0; i < ${MAX_SPOTS_GLSL}; i++) {
    if (i >= u_spotCount) break;
    vec2 t = u_spotT[i];
    float r = u_spotR[i];
    vec2 rn = (u_aspect >= 1.0) ? vec2(r / u_aspect, r) : vec2(r, r * u_aspect);
    float dist = length((P - t) / max(rn, vec2(1e-4)));
    if (dist > 1.0) continue;
    float w = 1.0 - smoothstep(1.0 - u_spotF[i], 1.0, dist);
    vec2 dP = u_spotS[i] - t;
    vec2 srcUV = v_uv + vec2(dP.x, -dP.y);
    vec3 s = texture(u_src, srcUV).rgb;
    if (u_spotHeal[i] > 0.5) {
      // Heal: source texture + target colour.
      s = s - texture(u_blur, srcUV).rgb + texture(u_blur, v_uv).rgb;
    }
    c = mix(c, clamp(s, 0.0, 1.0), w);
  }
  outColor = vec4(c, 1.0);
}`

/**
 * MASK — one local-adjustment layer.
 *
 * Reads the current accumulator (the global result, or the previous mask's
 * output), computes a per-pixel mask weight for its type, applies its local
 * adjustments to the pixel, and mixes the two by the weight. Running this once
 * per enabled mask (ping-ponging FBOs) layers local edits non-destructively.
 */
export const MASK_SRC = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_accum; // previous result
uniform sampler2D u_blur;  // shared low-frequency reference
uniform sampler2D u_brush; // brush mask (R = weight)
uniform vec2 u_texel;

uniform int   u_maskType;   // 0 linear,1 radial,2 brush,3 luminance,4 sky,5 subject
uniform float u_maskInvert; // 0/1
uniform float u_maskOpacity;// 0..1

uniform vec2  u_linA;
uniform vec2  u_linB;
uniform vec2  u_radCenter;
uniform vec2  u_radRadii;
uniform float u_radFeather; // 0..1
uniform vec2  u_lumRange;   // min,max
uniform float u_lumFeather; // 0..1

// Local adjustments (already scaled, like the main pass).
uniform float m_exposure;
uniform float m_contrast;
uniform float m_highlights;
uniform float m_shadows;
uniform float m_whites;
uniform float m_blacks;
uniform float m_temp;
uniform float m_tint;
uniform float m_sat;
uniform float m_clarity;
uniform float m_sharpen;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
float luma(vec3 c) { return dot(c, LUMA); }

vec3 applyLocal(vec3 c, vec3 blur, vec3 hp) {
  c.r += m_temp * 0.10;
  c.b -= m_temp * 0.10;
  c.g -= m_tint * 0.10;
  c = clamp(c, 0.0, 1.0);
  c *= exp2(m_exposure);
  c = clamp(c, 0.0, 4.0);
  float l = clamp(luma(c), 0.0, 1.0);
  c += m_highlights * smoothstep(0.3, 0.95, l) * 0.35;
  c += m_shadows    * (1.0 - smoothstep(0.05, 0.7, l)) * 0.35;
  c += m_whites     * smoothstep(0.6, 1.0, l) * 0.30;
  c += m_blacks     * (1.0 - smoothstep(0.0, 0.4, l)) * 0.30;
  c = clamp(c, 0.0, 1.0);
  c = (c - 0.5) * (1.0 + m_contrast) + 0.5;
  c = clamp(c, 0.0, 1.0);
  float mid = clamp(1.0 - abs(l - 0.5) * 2.0, 0.0, 1.0);
  c += (c - blur) * m_clarity * mid;
  c += hp * m_sharpen * 2.0;
  c = clamp(c, 0.0, 1.0);
  float lu = luma(c);
  c = mix(vec3(lu), c, 1.0 + m_sat);
  return clamp(c, 0.0, 1.0);
}

float maskWeight(vec3 c) {
  // Geometry is authored in display space (y down, 0 = top); the rendered image
  // has v_uv.y = 1 at the top, so flip Y for geometry evaluation.
  vec2 P = vec2(v_uv.x, 1.0 - v_uv.y);
  if (u_maskType == 0) {
    // Linear gradient: 0 on the start line, 1 on the end line.
    vec2 ab = u_linB - u_linA;
    float t = dot(P - u_linA, ab) / max(dot(ab, ab), 1e-5);
    return smoothstep(0.0, 1.0, clamp(t, 0.0, 1.0));
  } else if (u_maskType == 1) {
    // Radial ellipse: 1 inside, feathered to 0 at the edge.
    vec2 d = (P - u_radCenter) / max(u_radRadii, vec2(1e-4));
    float dist = length(d);
    float inner = 1.0 - u_radFeather;
    return 1.0 - smoothstep(inner, 1.0, dist);
  } else if (u_maskType == 2) {
    return texture(u_brush, v_uv).a;
  } else if (u_maskType == 3) {
    // Luminance band pass.
    float L = luma(c);
    float f = max(u_lumFeather, 0.001);
    return smoothstep(u_lumRange.x - f, u_lumRange.x, L) *
           (1.0 - smoothstep(u_lumRange.y, u_lumRange.y + f, L));
  } else if (u_maskType == 4) {
    // Auto sky: bright + blue-dominant, biased to the top.
    float L = luma(c);
    float blueness = clamp((c.b - max(c.r, c.g)) * 3.0 + 0.35, 0.0, 1.0);
    float top = 1.0 - smoothstep(0.15, 0.7, P.y);
    return clamp(smoothstep(0.4, 0.85, L) * blueness * (0.5 + 0.5 * top), 0.0, 1.0);
  } else {
    // Auto subject: not-sky, centre-weighted.
    float L = luma(c);
    float blueness = clamp((c.b - max(c.r, c.g)) * 3.0 + 0.35, 0.0, 1.0);
    float sky = clamp(smoothstep(0.4, 0.85, L) * blueness, 0.0, 1.0);
    float centre = 1.0 - smoothstep(0.25, 0.75, length(P - vec2(0.5)));
    return clamp((1.0 - sky) * centre, 0.0, 1.0);
  }
}

void main() {
  vec3 c = texture(u_accum, v_uv).rgb;
  vec3 blur = texture(u_blur, v_uv).rgb;
  vec3 nb =
      texture(u_accum, v_uv + vec2(u_texel.x, 0.0)).rgb +
      texture(u_accum, v_uv - vec2(u_texel.x, 0.0)).rgb +
      texture(u_accum, v_uv + vec2(0.0, u_texel.y)).rgb +
      texture(u_accum, v_uv - vec2(0.0, u_texel.y)).rgb;
  vec3 hp = c - nb * 0.25;

  float w = clamp(maskWeight(c), 0.0, 1.0);
  w = mix(w, 1.0 - w, u_maskInvert) * u_maskOpacity;

  vec3 local = applyLocal(c, blur, hp);
  outColor = vec4(mix(c, local, w), 1.0);
}`

export const MAIN_SRC = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;   // original AI image
uniform sampler2D u_blur;  // gaussian-blurred reference (low frequency)
uniform sampler2D u_lut;   // 256x1 RGBA tone-curve LUT
uniform vec2 u_texel;      // 1.0 / textureSize, for neighbour taps

// Phase 1 — Light / Colour / Detail
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

// Phase 2 — Detail (noise), Curves, HSL, Grading, Vignette, Grain
uniform float u_nrLum;       // 0..1
uniform float u_nrColor;     // 0..1
uniform float u_curvesOn;    // 0 or 1

uniform float u_hslH[8];     // -1..1
uniform float u_hslS[8];     // -1..1
uniform float u_hslL[8];     // -1..1

uniform vec3  u_gradeSh;     // (hueRad, sat 0..1, lum -1..1)
uniform vec3  u_gradeMid;
uniform vec3  u_gradeHi;
uniform vec3  u_gradeGlobal;
uniform float u_gradeBlend;  // 0..1
uniform float u_gradeBalance;// -1..1

uniform float u_vigAmount;   // -1..1
uniform float u_vigMid;      // 0..1
uniform float u_vigRound;    // -1..1
uniform float u_vigFeather;  // 0..1
uniform float u_vigHi;       // 0..1
uniform float u_aspect;      // width / height

uniform float u_grainAmount; // 0..1
uniform float u_grainScale;  // frequency
uniform float u_grainRough;  // 0..1

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
float luma(vec3 c) { return dot(c, LUMA); }

// Band centres (degrees) for the 8 HSL colour ranges.
const float BAND0=0.0, BAND1=30.0, BAND2=60.0, BAND3=120.0,
            BAND4=180.0, BAND5=240.0, BAND6=270.0, BAND7=300.0;

vec3 rgb2hsl(vec3 c) {
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float d = mx - mn;
  float h = 0.0;
  float l = (mx + mn) * 0.5;
  float s = 0.0;
  if (d > 1e-5) {
    s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}
vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  if (s <= 0.0) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
}

// Smooth weight for how strongly a hue (deg) belongs to a band centre (deg).
float bandWeight(float hueDeg, float centre) {
  float d = abs(hueDeg - centre);
  d = min(d, 360.0 - d);
  return smoothstep(45.0, 0.0, d);
}

// A hue-tint direction for colour grading (hueRad, sat) → signed RGB offset.
vec3 gradeTint(vec3 zone) {
  vec3 col = hsl2rgb(vec3(zone.x, 1.0, 0.5));
  return (col - 0.5) * 2.0 * zone.y;
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  vec3 blur = texture(u_blur, v_uv).rgb;

  // ── Noise reduction (uses the blurred reference) ─────────────
  if (u_nrLum > 0.0 || u_nrColor > 0.0) {
    float lc = luma(c);
    float lb = luma(blur);
    float edge = 1.0 - smoothstep(0.0, 0.12, abs(lc - lb));
    float newL = mix(lc, lb, u_nrLum * edge);
    vec3 chroma = c - vec3(lc);
    vec3 chromaB = blur - vec3(lb);
    c = vec3(newL) + mix(chroma, chromaB, u_nrColor * 0.9);
    c = clamp(c, 0.0, 1.0);
  }

  // ── White balance ────────────────────────────────────────────
  c.r += u_temperature * 0.10;
  c.b -= u_temperature * 0.10;
  c.g -= u_tint * 0.10;
  c = clamp(c, 0.0, 1.0);

  // ── Exposure ─────────────────────────────────────────────────
  c *= exp2(u_exposure);
  c = clamp(c, 0.0, 4.0);

  // ── Tone regions ─────────────────────────────────────────────
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

  // ── Contrast ─────────────────────────────────────────────────
  c = (c - 0.5) * (1.0 + u_contrast) + 0.5;
  c = clamp(c, 0.0, 1.0);

  // ── Detail ───────────────────────────────────────────────────
  vec3 nb =
      texture(u_tex, v_uv + vec2(u_texel.x, 0.0)).rgb +
      texture(u_tex, v_uv - vec2(u_texel.x, 0.0)).rgb +
      texture(u_tex, v_uv + vec2(0.0, u_texel.y)).rgb +
      texture(u_tex, v_uv - vec2(0.0, u_texel.y)).rgb;
  vec3 highpass = texture(u_tex, v_uv).rgb - nb * 0.25;
  float mid = clamp(1.0 - abs(l - 0.5) * 2.0, 0.0, 1.0);
  vec3 localC = c - blur;
  c += localC * u_clarity * mid;
  c += highpass * u_texture * 1.5;
  c += highpass * u_sharpen * 2.0;
  c += localC * u_dehaze * 0.6;
  c = (c - 0.5) * (1.0 + u_dehaze * 0.25) + 0.5;
  c = clamp(c, 0.0, 1.0);

  // ── Saturation / Vibrance ────────────────────────────────────
  float lu = luma(c);
  c = mix(vec3(lu), c, 1.0 + u_saturation);
  c = clamp(c, 0.0, 1.0);
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float vibAmt = u_vibrance * (1.0 - (mx - mn));
  float lu2 = luma(c);
  c = mix(vec3(lu2), c, 1.0 + vibAmt);
  c = clamp(c, 0.0, 1.0);

  // ── Tone curves (LUT) ────────────────────────────────────────
  if (u_curvesOn > 0.5) {
    c = vec3(
      texture(u_lut, vec2(c.r, 0.5)).r,
      texture(u_lut, vec2(c.g, 0.5)).g,
      texture(u_lut, vec2(c.b, 0.5)).b
    );
  }

  // ── HSL (per colour band) ────────────────────────────────────
  vec3 hsl = rgb2hsl(c);
  float hueDeg = hsl.x * 360.0;
  float w0 = bandWeight(hueDeg, BAND0);
  float w1 = bandWeight(hueDeg, BAND1);
  float w2 = bandWeight(hueDeg, BAND2);
  float w3 = bandWeight(hueDeg, BAND3);
  float w4 = bandWeight(hueDeg, BAND4);
  float w5 = bandWeight(hueDeg, BAND5);
  float w6 = bandWeight(hueDeg, BAND6);
  float w7 = bandWeight(hueDeg, BAND7);
  float dH = w0*u_hslH[0]+w1*u_hslH[1]+w2*u_hslH[2]+w3*u_hslH[3]+w4*u_hslH[4]+w5*u_hslH[5]+w6*u_hslH[6]+w7*u_hslH[7];
  float dS = w0*u_hslS[0]+w1*u_hslS[1]+w2*u_hslS[2]+w3*u_hslS[3]+w4*u_hslS[4]+w5*u_hslS[5]+w6*u_hslS[6]+w7*u_hslS[7];
  float dL = w0*u_hslL[0]+w1*u_hslL[1]+w2*u_hslL[2]+w3*u_hslL[3]+w4*u_hslL[4]+w5*u_hslL[5]+w6*u_hslL[6]+w7*u_hslL[7];
  if (hsl.y > 0.02) {
    hsl.x = fract(hsl.x + dH * (30.0 / 360.0));
    hsl.y = clamp(hsl.y * (1.0 + dS), 0.0, 1.0);
    hsl.z = clamp(hsl.z + dL * 0.15, 0.0, 1.0);
    c = hsl2rgb(hsl);
  }

  // ── Colour grading (3-way + global) ──────────────────────────
  float Lg = luma(c);
  float pivot = 0.5 + u_gradeBalance * 0.3;
  float blendW = mix(0.15, 0.45, u_gradeBlend);
  float wSh = 1.0 - smoothstep(0.0, pivot + blendW, Lg);
  float wHi = smoothstep(pivot - blendW, 1.0, Lg);
  float wMid = clamp(1.0 - wSh - wHi, 0.0, 1.0);
  c += gradeTint(u_gradeSh) * wSh * 0.5;
  c += gradeTint(u_gradeMid) * wMid * 0.5;
  c += gradeTint(u_gradeHi) * wHi * 0.5;
  c += gradeTint(u_gradeGlobal) * 0.5;
  c += vec3(u_gradeSh.z * wSh + u_gradeMid.z * wMid + u_gradeHi.z * wHi + u_gradeGlobal.z) * 0.2;
  c = clamp(c, 0.0, 1.0);

  // ── Vignette ─────────────────────────────────────────────────
  if (abs(u_vigAmount) > 0.001) {
    vec2 q = v_uv - 0.5;
    q.x *= u_aspect;
    float maxr = 0.5 * sqrt(1.0 + u_aspect * u_aspect);
    // Roundness blends between elliptical (length) and boxy (max) falloff.
    float dCircle = length(q) / maxr;
    float dBox = max(abs(q.x) / (0.5 * u_aspect), abs(q.y) / 0.5);
    float dist = mix(dCircle, dBox, clamp(-u_vigRound, 0.0, 1.0));
    dist = mix(dist, dCircle * dCircle, clamp(u_vigRound, 0.0, 1.0));
    float inner = u_vigMid;
    float m = smoothstep(inner, inner + u_vigFeather * 0.8 + 0.02, dist);
    float protect = mix(1.0, 1.0 - smoothstep(0.5, 1.0, luma(c)), u_vigHi);
    c *= (1.0 + u_vigAmount * m * protect);
    c = clamp(c, 0.0, 1.0);
  }

  // ── Grain ────────────────────────────────────────────────────
  if (u_grainAmount > 0.0) {
    float n1 = hash(floor(v_uv * u_grainScale));
    float n2 = hash(floor(v_uv * u_grainScale * 2.17) + 3.7);
    float g = mix(n1, n1 * n2 * 2.0, u_grainRough) - 0.5;
    // Grain is stronger in midtones (as with real film).
    float shape = 1.0 - abs(luma(c) - 0.5);
    c += vec3(g) * u_grainAmount * 0.35 * shape;
    c = clamp(c, 0.0, 1.0);
  }

  outColor = vec4(c, 1.0);
}`
