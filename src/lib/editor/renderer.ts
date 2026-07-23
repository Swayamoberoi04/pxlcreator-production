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

import { VERTEX_SRC, BLUR_SRC, MAIN_SRC } from "./shaders"
import {
  DEFAULT_RENDER_SETTINGS,
  type RenderSettings,
} from "./adjustments"
import { bakeCurveLUT, curvesAreIdentity } from "./curves"

/** Blur radius in source texels — widens the Gaussian for clarity/dehaze. */
const BLUR_RADIUS = 3.0

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

export class EditorRenderer {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private blurProgram: WebGLProgram
  private mainProgram: WebGLProgram
  private quad: WebGLBuffer
  private sourceTex: WebGLTexture | null = null
  private lutTex: WebGLTexture
  private srcW = 0
  private srcH = 0
  private fboA: Fbo | null = null
  private fboB: Fbo | null = null
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

  /**
   * Render one frame at the canvas's current drawing-buffer size.
   * @param settings   the complete non-destructive render state
   * @param showBefore when true, ignore all edits and show the AI original
   */
  render(settings: RenderSettings, showBefore = false): void {
    if (!this.ok || !this.sourceTex) return
    const gl = this.gl
    const w = this.canvas.width
    const h = this.canvas.height
    if (w === 0 || h === 0) return

    this.ensureFbos(w, h)
    const s = showBefore ? DEFAULT_RENDER_SETTINGS : settings

    // ── Blur pass H: source → fboA ──
    gl.useProgram(this.blurProgram)
    this.bindQuad(this.blurProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA!.fbo)
    gl.viewport(0, 0, w, h)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex)
    gl.uniform1i(gl.getUniformLocation(this.blurProgram, "u_tex"), 0)
    gl.uniform2f(gl.getUniformLocation(this.blurProgram, "u_dir"), BLUR_RADIUS / w, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ── Blur pass V: fboA → fboB ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB!.fbo)
    gl.viewport(0, 0, w, h)
    gl.bindTexture(gl.TEXTURE_2D, this.fboA!.tex)
    gl.uniform2f(gl.getUniformLocation(this.blurProgram, "u_dir"), 0, BLUR_RADIUS / h)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ── Update the tone-curve LUT (only when curves are active) ──
    const curvesOn = !curvesAreIdentity(s.curves)
    if (curvesOn) {
      const lut = bakeCurveLUT(s.curves)
      gl.bindTexture(gl.TEXTURE_2D, this.lutTex)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, lut)
    }

    // ── Main pass: source + blurred → target ──
    gl.useProgram(this.mainProgram)
    this.bindQuad(this.mainProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
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
    // Neighbour taps are 1px at the current render resolution.
    gl.uniform2f(this.loc("u_texel"), 1 / w, 1 / h)
    gl.uniform1f(this.loc("u_aspect"), this.srcW / this.srcH)
    gl.uniform1f(this.loc("u_curvesOn"), curvesOn ? 1 : 0)

    // Scalar uniforms.
    const u = scalarUniformsFor(s)
    for (const [name, value] of Object.entries(u)) {
      gl.uniform1f(this.loc(name), value)
    }

    // HSL arrays (8 bands).
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

    // Colour-grading zones → vec3(hue 0..1, sat 0..1, lum -1..1).
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
    if (this.sourceTex) gl.deleteTexture(this.sourceTex)
    gl.deleteTexture(this.lutTex)
    gl.deleteBuffer(this.quad)
    gl.deleteProgram(this.blurProgram)
    gl.deleteProgram(this.mainProgram)
    this.disposed = true
  }
}
