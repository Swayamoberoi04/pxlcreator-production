/**
 * src/lib/editor/renderer.ts
 *
 * The WebGL2 rendering engine.
 *
 * RESPONSIBILITY
 * --------------
 * Own the GL context and all GPU resources, and turn (image + Adjustments)
 * into pixels on a canvas. It knows nothing about React, history, or geometry
 * (crop/rotate) — those live one layer up. This separation is deliberate: the
 * engine is a pure, testable rendering primitive that both the live preview
 * and the full-resolution exporter call into.
 *
 * PIPELINE (per frame)
 *   source texture ──▶ [blur H] ──▶ fboA ──▶ [blur V] ──▶ fboB
 *                └──────────────────────────────────────────┐
 *                                                            ▼
 *                                   [main shader: source + blurred] ──▶ target
 *
 * The target is the default framebuffer for live preview, and the same canvas
 * (temporarily resized) for export. Everything is GPU-accelerated; the CPU only
 * uploads 14 floats per frame.
 */

import { VERTEX_SRC, BLUR_SRC, MAIN_SRC, MASK_SRC, COPY_SRC } from "./shaders"
import {
  DEFAULT_RENDER_SETTINGS,
  type RenderSettings,
  type Mask,
} from "./adjustments"
import { bakeCurveLUT, curvesAreIdentity } from "./curves"
import { rasterizeBrush, brushSignature } from "./masks"

/** Blur radius in source texels — widens the Gaussian for clarity/dehaze. */
const BLUR_RADIUS = 3.0
/** Longest edge of a rasterised brush mask texture. */
const BRUSH_TEX_EDGE = 1024

const MASK_TYPE_CODE: Record<Mask["type"], number> = {
  linear: 0,
  radial: 1,
  brush: 2,
  luminance: 3,
  sky: 4,
  subject: 5,
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return shader
}

function linkProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc)
  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Program link failed: ${log}`)
  }
  return program
}

interface Fbo {
  fbo: WebGLFramebuffer
  tex: WebGLTexture
  width: number
  height: number
}

/** Normalise the Phase-1 slider bag into scalar shader uniforms. */
function scalarUniformsFor(s: RenderSettings) {
  const a = s.adjustments
  const g = s.grain
  return {
    u_exposure: (a.exposure / 100) * 2.5, // ±2.5 stops
    u_contrast: a.contrast / 100,
    u_highlights: a.highlights / 100,
    u_shadows: a.shadows / 100,
    u_whites: a.whites / 100,
    u_blacks: a.blacks / 100,
    u_temperature: a.temperature / 100,
    u_tint: a.tint / 100,
    u_vibrance: a.vibrance / 100,
    u_saturation: a.saturation / 100,
    u_texture: a.texture / 100,
    u_clarity: a.clarity / 100,
    u_dehaze: a.dehaze / 100,
    u_sharpen: a.sharpening / 100,
    // Phase 2 scalars
    u_nrLum: s.noise.luminance / 100,
    u_nrColor: s.noise.color / 100,
    u_vigAmount: s.vignette.amount / 100,
    u_vigMid: s.vignette.midpoint / 100,
    u_vigRound: s.vignette.roundness / 100,
    u_vigFeather: s.vignette.feather / 100,
    u_vigHi: s.vignette.highlights / 100,
    u_grainAmount: g.amount / 100,
    u_grainScale: 200 + (1 - g.size / 100) * 1400, // cells across the image
    u_grainRough: g.roughness / 100,
    u_gradeBlend: s.grading.blending / 100,
    u_gradeBalance: s.grading.balance / 100,
  }
}

/** True when a mask would actually change pixels (enabled, has strength + edits). */
function maskHasEffect(m: Mask): boolean {
  if (!m.enabled || m.opacity <= 0) return false
  const a = m.adjustments
  const anyAdj = (Object.keys(a) as (keyof typeof a)[]).some((k) => a[k] !== 0)
  if (!anyAdj) return false
  if (m.type === "brush" && (!m.brush || m.brush.strokes.length === 0)) return false
  return true
}

interface BrushEntry {
  sig: string
  tex: WebGLTexture
}

export class EditorRenderer {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private blurProgram: WebGLProgram
  private mainProgram: WebGLProgram
  private maskProgram: WebGLProgram
  private copyProgram: WebGLProgram
  private quad: WebGLBuffer
  private sourceTex: WebGLTexture | null = null
  private lutTex: WebGLTexture
  private whiteTex: WebGLTexture
  private srcW = 0
  private srcH = 0
  private fboA: Fbo | null = null
  private fboB: Fbo | null = null
  private accumA: Fbo | null = null
  private accumB: Fbo | null = null
  private brushCache = new Map<string, BrushEntry>()
  private disposed = false

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true, // needed so export can read the canvas back
      antialias: false,
    })
    if (!gl) throw new Error("WebGL2 is not supported in this browser.")
    this.gl = gl
    this.canvas = canvas

    this.blurProgram = linkProgram(gl, VERTEX_SRC, BLUR_SRC)
    this.mainProgram = linkProgram(gl, VERTEX_SRC, MAIN_SRC)
    this.maskProgram = linkProgram(gl, VERTEX_SRC, MASK_SRC)
    this.copyProgram = linkProgram(gl, VERTEX_SRC, COPY_SRC)

    // Fullscreen quad (two triangles) shared by every program.
    this.quad = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )

    // 256×1 tone-curve LUT, seeded with the identity ramp.
    this.lutTex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex)
    const identity = new Uint8Array(256 * 4)
    for (let i = 0; i < 256; i++) {
      identity[i * 4] = identity[i * 4 + 1] = identity[i * 4 + 2] = i
      identity[i * 4 + 3] = 255
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, identity)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    // 1×1 opaque-white texture — bound to u_brush for non-brush masks.
    this.whiteTex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.whiteTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  }

  /** True if the engine is usable (context not lost / not disposed). */
  get ok(): boolean {
    return !this.disposed && !this.gl.isContextLost()
  }

  /** The backing canvas — the exporter reads pixels from it directly. */
  get element(): HTMLCanvasElement {
    return this.canvas
  }

  get imageWidth(): number {
    return this.srcW
  }
  get imageHeight(): number {
    return this.srcH
  }

  /** Upload the AI result as the immutable source texture. */
  setImage(image: HTMLImageElement | ImageBitmap): void {
    const gl = this.gl
    if (this.sourceTex) gl.deleteTexture(this.sourceTex)

    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    this.sourceTex = tex
    this.srcW = image.width
    this.srcH = image.height
  }

  private makeFbo(width: number, height: number): Fbo {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { fbo, tex, width, height }
  }

  private ensureFbos(width: number, height: number): void {
    if (this.fboA && this.fboA.width === width && this.fboA.height === height) return
    this.destroyFbos()
    this.fboA = this.makeFbo(width, height)
    this.fboB = this.makeFbo(width, height)
  }

  private destroyFbos(): void {
    const gl = this.gl
    for (const f of [this.fboA, this.fboB]) {
      if (f) {
        gl.deleteFramebuffer(f.fbo)
        gl.deleteTexture(f.tex)
      }
    }
    this.fboA = null
    this.fboB = null
  }

  private bindQuad(program: WebGLProgram): void {
    const gl = this.gl
    const loc = gl.getAttribLocation(program, "a_pos")
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  }

  private loc(name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(this.mainProgram, name)
  }
  private uloc(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(program, name)
  }

  private ensureAccum(width: number, height: number): void {
    if (this.accumA && this.accumA.width === width && this.accumA.height === height) return
    const gl = this.gl
    for (const f of [this.accumA, this.accumB]) {
      if (f) {
        gl.deleteFramebuffer(f.fbo)
        gl.deleteTexture(f.tex)
      }
    }
    this.accumA = this.makeFbo(width, height)
    this.accumB = this.makeFbo(width, height)
  }

  /**
   * Render one frame at the canvas's current drawing-buffer size.
   *
   * Fast path (no masks): blur → main → screen (unchanged from Phase 2).
   * Masked path: main → accumA, then each enabled mask ping-pongs the
   * accumulator applying its local adjustments, and the final buffer is blitted
   * to the screen. The masked path costs one pass per mask.
   */
  render(settings: RenderSettings, showBefore = false): void {
    if (!this.ok || !this.sourceTex) return
    const gl = this.gl
    const w = this.canvas.width
    const h = this.canvas.height
    if (w === 0 || h === 0) return

    this.ensureFbos(w, h)
    const s = showBefore ? DEFAULT_RENDER_SETTINGS : settings

    // ── Blur passes: source → fboA → fboB ──
    gl.useProgram(this.blurProgram)
    this.bindQuad(this.blurProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA!.fbo)
    gl.viewport(0, 0, w, h)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex)
    gl.uniform1i(this.uloc(this.blurProgram, "u_tex"), 0)
    gl.uniform2f(this.uloc(this.blurProgram, "u_dir"), BLUR_RADIUS / w, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB!.fbo)
    gl.viewport(0, 0, w, h)
    gl.bindTexture(gl.TEXTURE_2D, this.fboA!.tex)
    gl.uniform2f(this.uloc(this.blurProgram, "u_dir"), 0, BLUR_RADIUS / h)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ── Tone-curve LUT (only when curves are active) ──
    const curvesOn = !curvesAreIdentity(s.curves)
    if (curvesOn) {
      const lut = bakeCurveLUT(s.curves)
      gl.bindTexture(gl.TEXTURE_2D, this.lutTex)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, lut)
    }

    // ── Which masks actually change pixels ──
    const masks = s.masks.filter(maskHasEffect)
    const usingMasks = masks.length > 0
    if (usingMasks) this.ensureAccum(w, h)

    // ── Main (global) pass → accumulator or straight to screen ──
    this.runMain(s, w, h, curvesOn, usingMasks ? this.accumA!.fbo : null)

    // ── Mask passes (ping-pong) + present ──
    if (usingMasks) {
      let src = this.accumA!
      let dst = this.accumB!
      for (const m of masks) {
        this.runMaskPass(m, src.tex, dst.fbo, w, h)
        const tmp = src
        src = dst
        dst = tmp
      }
      gl.useProgram(this.copyProgram)
      this.bindQuad(this.copyProgram)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, src.tex)
      gl.uniform1i(this.uloc(this.copyProgram, "u_tex"), 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
  }

  /** The global (Phase 1 + 2) adjustment pass into `targetFbo` (null = screen). */
  private runMain(
    s: RenderSettings,
    w: number,
    h: number,
    curvesOn: boolean,
    targetFbo: WebGLFramebuffer | null
  ): void {
    const gl = this.gl
    gl.useProgram(this.mainProgram)
    this.bindQuad(this.mainProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo)
    gl.viewport(0, 0, w, h)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex)
    gl.uniform1i(this.loc("u_tex"), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.fboB!.tex)
    gl.uniform1i(this.loc("u_blur"), 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex)
    gl.uniform1i(this.loc("u_lut"), 2)
    gl.uniform2f(this.loc("u_texel"), 1 / w, 1 / h)
    gl.uniform1f(this.loc("u_aspect"), this.srcW / this.srcH)
    gl.uniform1f(this.loc("u_curvesOn"), curvesOn ? 1 : 0)

    const u = scalarUniformsFor(s)
    for (const [name, value] of Object.entries(u)) {
      gl.uniform1f(this.loc(name), value)
    }

    const hH = new Float32Array(8)
    const hS = new Float32Array(8)
    const hL = new Float32Array(8)
    for (let i = 0; i < 8; i++) {
      hH[i] = s.hsl[i].h / 100
      hS[i] = s.hsl[i].s / 100
      hL[i] = s.hsl[i].l / 100
    }
    gl.uniform1fv(this.loc("u_hslH"), hH)
    gl.uniform1fv(this.loc("u_hslS"), hS)
    gl.uniform1fv(this.loc("u_hslL"), hL)

    const zone = (z: { hue: number; sat: number; lum: number }): number[] => [
      z.hue / 360,
      z.sat / 100,
      z.lum / 100,
    ]
    gl.uniform3fv(this.loc("u_gradeSh"), zone(s.grading.shadows))
    gl.uniform3fv(this.loc("u_gradeMid"), zone(s.grading.midtones))
    gl.uniform3fv(this.loc("u_gradeHi"), zone(s.grading.highlights))
    gl.uniform3fv(this.loc("u_gradeGlobal"), zone(s.grading.global))

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  /** One mask layer: reads `srcTex`, writes the locally-adjusted result. */
  private runMaskPass(mask: Mask, srcTex: WebGLTexture, targetFbo: WebGLFramebuffer, w: number, h: number): void {
    const gl = this.gl
    const p = this.maskProgram
    gl.useProgram(p)
    this.bindQuad(p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo)
    gl.viewport(0, 0, w, h)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, srcTex)
    gl.uniform1i(this.uloc(p, "u_accum"), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.fboB!.tex)
    gl.uniform1i(this.uloc(p, "u_blur"), 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.brushTexFor(mask))
    gl.uniform1i(this.uloc(p, "u_brush"), 2)

    gl.uniform2f(this.uloc(p, "u_texel"), 1 / w, 1 / h)
    gl.uniform1i(this.uloc(p, "u_maskType"), MASK_TYPE_CODE[mask.type])
    gl.uniform1f(this.uloc(p, "u_maskInvert"), mask.inverted ? 1 : 0)
    gl.uniform1f(this.uloc(p, "u_maskOpacity"), mask.opacity / 100)

    const lin = mask.linear ?? { x1: 0, y1: 0, x2: 1, y2: 1 }
    gl.uniform2f(this.uloc(p, "u_linA"), lin.x1, lin.y1)
    gl.uniform2f(this.uloc(p, "u_linB"), lin.x2, lin.y2)
    const rad = mask.radial ?? { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3, feather: 50 }
    gl.uniform2f(this.uloc(p, "u_radCenter"), rad.cx, rad.cy)
    gl.uniform2f(this.uloc(p, "u_radRadii"), rad.rx, rad.ry)
    gl.uniform1f(this.uloc(p, "u_radFeather"), rad.feather / 100)
    const lum = mask.luminance ?? { min: 0, max: 0.5, feather: 30 }
    gl.uniform2f(this.uloc(p, "u_lumRange"), lum.min, lum.max)
    gl.uniform1f(this.uloc(p, "u_lumFeather"), lum.feather / 100)

    const a = mask.adjustments
    gl.uniform1f(this.uloc(p, "m_exposure"), (a.exposure / 100) * 2.5)
    gl.uniform1f(this.uloc(p, "m_contrast"), a.contrast / 100)
    gl.uniform1f(this.uloc(p, "m_highlights"), a.highlights / 100)
    gl.uniform1f(this.uloc(p, "m_shadows"), a.shadows / 100)
    gl.uniform1f(this.uloc(p, "m_whites"), a.whites / 100)
    gl.uniform1f(this.uloc(p, "m_blacks"), a.blacks / 100)
    gl.uniform1f(this.uloc(p, "m_temp"), a.temperature / 100)
    gl.uniform1f(this.uloc(p, "m_tint"), a.tint / 100)
    gl.uniform1f(this.uloc(p, "m_sat"), a.saturation / 100)
    gl.uniform1f(this.uloc(p, "m_clarity"), a.clarity / 100)
    gl.uniform1f(this.uloc(p, "m_sharpen"), a.sharpness / 100)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  /** Return the (cached) rasterised brush texture, or the white fallback. */
  private brushTexFor(mask: Mask): WebGLTexture {
    if (mask.type !== "brush" || !mask.brush || mask.brush.strokes.length === 0) return this.whiteTex
    const sig = brushSignature(mask)
    const cached = this.brushCache.get(mask.id)
    if (cached && cached.sig === sig) return cached.tex

    const aspect = this.srcW / this.srcH
    let bw = BRUSH_TEX_EDGE
    let bh = BRUSH_TEX_EDGE
    if (aspect >= 1) bh = Math.max(1, Math.round(BRUSH_TEX_EDGE / aspect))
    else bw = Math.max(1, Math.round(BRUSH_TEX_EDGE * aspect))
    const canvas = rasterizeBrush(mask.brush.strokes, bw, bh)

    const gl = this.gl
    const tex = cached?.tex ?? gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    this.brushCache.set(mask.id, { sig, tex })
    return tex
  }

  /** Current drawing-buffer size — the exporter saves this before resizing. */
  get canvasWidth(): number {
    return this.canvas.width
  }
  get canvasHeight(): number {
    return this.canvas.height
  }

  /**
   * Resize the drawing buffer to full image resolution and render the adjusted
   * image with NO geometry. The exporter then reads `this.canvas` directly
   * (preserveDrawingBuffer keeps the pixels) and applies crop/rotate in 2D,
   * then calls `restoreSize` to hand the canvas back to the live preview.
   */
  renderFullResolution(settings: RenderSettings): void {
    this.canvas.width = this.srcW
    this.canvas.height = this.srcH
    this.render(settings, false)
  }

  /** Restore the preview drawing-buffer size after an export readback. */
  restoreSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  dispose(): void {
    if (this.disposed) return
    const gl = this.gl
    this.destroyFbos()
    for (const f of [this.accumA, this.accumB]) {
      if (f) {
        gl.deleteFramebuffer(f.fbo)
        gl.deleteTexture(f.tex)
      }
    }
    for (const entry of this.brushCache.values()) gl.deleteTexture(entry.tex)
    this.brushCache.clear()
    if (this.sourceTex) gl.deleteTexture(this.sourceTex)
    gl.deleteTexture(this.lutTex)
    gl.deleteTexture(this.whiteTex)
    gl.deleteBuffer(this.quad)
    gl.deleteProgram(this.blurProgram)
    gl.deleteProgram(this.mainProgram)
    gl.deleteProgram(this.maskProgram)
    gl.deleteProgram(this.copyProgram)
    this.disposed = true
  }
}
