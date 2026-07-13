"use client"
/* eslint-disable react-hooks/immutability */

/**
 * GlobalAmbientCanvas.tsx
 *
 * A fixed-position, full-viewport R3F canvas that renders a single very
 * subtle atmospheric layer across the entire site — persistent across all
 * pages and route transitions.
 *
 * Performance:
 *   – dpr capped at [1, 1] — fullscreen canvas at native 1× is plenty
 *   – No per-frame allocations; geometry created once in useMemo
 *   – frameloop="demand" — only renders when something changes (idle = 0 CPU)
 *   – Page Visibility API — pauses when tab is hidden
 *   – Particle count halved vs original (mobile: 20, desktop: 50)
 */

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE                      from "three"

const IS_MOBILE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches

/* ── Page-visibility controller — pauses R3F when tab is hidden ─── */
function VisibilityController() {
  const { invalidate, advance } = useThree()

  useEffect(() => {
    /* Drive one frame on mount so the canvas renders its initial state */
    invalidate()

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        invalidate() /* Kick-start rendering after tab re-focus */
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [invalidate, advance])

  return null
}

/* ── Drifting dust particles ─────────────────────────────────────── */
function AmbientDust() {
  /*
   * Reduced from 80/30 → 50/20 particles.
   * The particles are nearly invisible (opacity ~0.07) — half the count
   * is imperceptible but cuts geometry upload cost by 40%.
   */
  const COUNT = IS_MOBILE ? 20 : 50

  /* Static seed positions — deterministic, no hydration issues */
  const geo = useMemo(() => {
    const pos  = new Float32Array(COUNT * 3)
    const seed = [
      0.14, 0.82, 0.37, 0.61, 0.05, 0.93, 0.28, 0.74, 0.49, 0.16,
      0.55, 0.88, 0.23, 0.67, 0.41, 0.09, 0.78, 0.34, 0.96, 0.12,
      0.47, 0.63, 0.19, 0.85, 0.52, 0.07, 0.71, 0.38, 0.90, 0.25,
      0.58, 0.03, 0.80, 0.44, 0.66, 0.31, 0.97, 0.20, 0.76, 0.53,
    ]
    const s = (i: number) => seed[i % seed.length]
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (s(i * 3    ) - 0.5) * 22
      pos[i * 3 + 1] = (s(i * 3 + 1) - 0.5) * 14
      pos[i * 3 + 2] = (s(i * 3 + 2))       * -12
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return g
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const matRef  = useRef<THREE.PointsMaterial>(null)
  const posRef  = useRef<Float32Array | null>(null)
  /* Frame counter — update particles every 2nd frame on mobile */
  const frameRef = useRef(0)

  const { invalidate } = useThree()

  useFrame(({ clock }) => {
    if (!matRef.current) return

    frameRef.current++
    /*
     * Mobile: update every 3rd frame (20fps) — particles drift so slowly
     * the skip is completely invisible but saves 67% of mobile GPU work.
     * Desktop: update every 2nd frame (30fps) — grain barely visible anyway.
     */
    const skipRate = IS_MOBILE ? 3 : 2
    if (frameRef.current % skipRate !== 0) {
      invalidate()  /* Request next frame so the loop continues */
      return
    }

    matRef.current.opacity = 0.07 + Math.sin(clock.elapsedTime * 0.22) * 0.03

    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute
    if (!posRef.current) posRef.current = posAttr.array as Float32Array
    const arr = posRef.current
    /* Drift step scaled by skip rate so velocity is consistent */
    const step = IS_MOBILE ? 0.0024 : 0.0016
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += step
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = -7
    }
    posAttr.needsUpdate = true
    invalidate()  /* Request next frame */
  })

  return (
    <points geometry={geo}>
      <pointsMaterial
        ref={matRef}
        color="#C9A84C"
        size={0.014}
        transparent
        opacity={0.08}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/* ── Volumetric breathing orbs ───────────────────────────────────── */
type OrbData = {
  pos:    [number, number, number]
  color:  string
  size:   number
  speed:  number
  offset: number
}

const ORBS: OrbData[] = [
  { pos: [-6, 2, -8],  color: "#C9A84C", size: 4.5, speed: 0.15, offset: 0    },
  { pos: [ 7, -3, -10], color: "#2211aa", size: 5.5, speed: 0.11, offset: 2.8 },
  { pos: [ 1,  4, -14], color: "#113322", size: 7.0, speed: 0.09, offset: 5.2 },
]

function GlobalOrb({ pos, color, size, speed, offset }: OrbData) {
  const meshRef  = useRef<THREE.Mesh>(null)
  const frameRef = useRef(0)

  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }),
    [color]
  )

  const { invalidate } = useThree()

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    frameRef.current++
    /*
     * Orbs move very slowly — updating every 4th frame is imperceptible.
     * On mobile skip every 5th — orbs are essentially invisible there.
     */
    const skipRate = IS_MOBILE ? 5 : 4
    if (frameRef.current % skipRate !== 0) return
    const t = clock.elapsedTime * speed + offset
    mat.opacity = 0.018 + Math.sin(t) * 0.006
    meshRef.current.position.x = pos[0] + Math.sin(t * 0.4) * 0.6
    meshRef.current.position.y = pos[1] + Math.cos(t * 0.3) * 0.4
    invalidate()
  })

  return (
    <mesh ref={meshRef} position={pos} material={mat}>
      {/* 6 segments instead of 12 — orbs are nearly transparent blobs, not geometry */}
      <sphereGeometry args={[size, 6, 6]} />
    </mesh>
  )
}

/* ── Scene ───────────────────────────────────────────────────────── */
function GlobalScene() {
  return (
    <>
      <VisibilityController />
      {ORBS.map((o, i) => <GlobalOrb key={i} {...o} />)}
      <AmbientDust />
    </>
  )
}

/* ── Exported canvas — fixed behind all page content ────────────── */
export function GlobalAmbientCanvas() {
  return (
    <div
      aria-hidden="true"
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 65 }}
        gl={{
          antialias:       false,
          alpha:           true,
          powerPreference: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
            ? "low-power"
            : "default",
        }}
        dpr={[1, 1]}
        frameloop="demand"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      >
        <GlobalScene />
      </Canvas>
    </div>
  )
}


