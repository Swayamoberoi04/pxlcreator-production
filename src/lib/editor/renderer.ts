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
import { DEFAULT_ADJUSTMENTS, type Adjustments } from "./adjustments"

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

/** Normalise the slider bag into shader-space uniform values. */
function uniformsFor(a: Adjustments) {
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
  }
}

export class EditorRenderer {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private blurProgram: WebGLProgram
  private mainProgram: WebGLProgram
  private quad: WebGLBuffer
  private sourceTex: WebGLTexture | null = null
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

  /**
   * Render one frame at the canvas's current drawing-buffer size.
   * @param adjustments live parameter bag
   * @param showBefore  when true, ignore adjustments and show the AI original
   */
  render(adjustments: Adjustments, showBefore = false): void {
    if (!this.ok || !this.sourceTex) return
    const gl = this.gl
    const w = this.canvas.width
    const h = this.canvas.height
    if (w === 0 || h === 0) return

    this.ensureFbos(w, h)
    const a = showBefore ? DEFAULT_ADJUSTMENTS : adjustments

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

    // ── Main pass: source + blurred → target ──
    gl.useProgram(this.mainProgram)
    this.bindQuad(this.mainProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, w, h)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex)
    gl.uniform1i(gl.getUniformLocation(this.mainProgram, "u_tex"), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.fboB!.tex)
    gl.uniform1i(gl.getUniformLocation(this.mainProgram, "u_blur"), 1)
    // Neighbour taps are 1px at the current render resolution.
    gl.uniform2f(gl.getUniformLocation(this.mainProgram, "u_texel"), 1 / w, 1 / h)

    const u = uniformsFor(a)
    for (const [name, value] of Object.entries(u)) {
      gl.uniform1f(gl.getUniformLocation(this.mainProgram, name), value)
    }
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
  renderFullResolution(adjustments: Adjustments): void {
    this.canvas.width = this.srcW
    this.canvas.height = this.srcH
    this.render(adjustments, false)
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
    gl.deleteBuffer(this.quad)
    gl.deleteProgram(this.blurProgram)
    gl.deleteProgram(this.mainProgram)
    this.disposed = true
  }
}
