"use client"
/* eslint-disable react-hooks/immutability */

/**
 * GlobalAmbientCanvas.tsx
 *
 * A fixed-position, full-viewport R3F canvas that renders a single very
 * subtle atmospheric layer across the entire site — persistent across all
 * pages and route transitions.
 *
 * What it renders:
 *   • ~120 ultra-fine gold/silver dust particles drifting slowly upward
 *   • Very low opacity — they should register subconsciously, never distract
 *   • 3 large, nearly transparent atmospheric orbs breathing slowly
 *
 * Architecture:
 *   • `position: fixed` + `inset: 0` + `z-index: 0` — behind ALL content
 *   • `pointer-events: none` — every click/scroll passes through
 *   • `alpha: true` on the GL context — transparent background
 *   • Mounted in layout.tsx once; survives page navigation
 *   • Dynamically imported with ssr:false — wrapped in ClientOnly
 *
 * Performance:
 *   – dpr capped at [1, 1] — fullscreen canvas at native 1× is plenty
 *   – No per-frame allocations; geometry created once in useMemo
 *   – requestAnimationFrame driven by R3F's internal scheduler
 */

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE            from "three"

/* ── Drifting dust particles ─────────────────────────────────────── */
function AmbientDust() {
  const COUNT = 120

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
      pos[i * 3]     = (s(i * 3    ) - 0.5) * 22   // x: -11 to 11
      pos[i * 3 + 1] = (s(i * 3 + 1) - 0.5) * 14   // y: -7  to 7
      pos[i * 3 + 2] = (s(i * 3 + 2))       * -12   // z: 0 to -12
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  const matRef = useRef<THREE.PointsMaterial>(null)
  const posRef = useRef<Float32Array | null>(null)

  useFrame(({ clock }) => {
    if (!matRef.current) return

    /* Breathing opacity — very faint, 0.06–0.12 */
    matRef.current.opacity = 0.07 + Math.sin(clock.elapsedTime * 0.22) * 0.03

    /* Slow upward drift — wrap around vertically */
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute
    if (!posRef.current) posRef.current = posAttr.array as Float32Array
    const arr = posRef.current
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += 0.0008  // drift up
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = -7  // wrap
    }
    posAttr.needsUpdate = true
  })

  return (
    <points geometry={geo}>
      <pointsMaterial
        ref={matRef}
        color="#ffd700"
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
  { pos: [-6, 2, -8],  color: "#ffd700", size: 4.5, speed: 0.15, offset: 0    },
  { pos: [ 7, -3, -10], color: "#2211aa", size: 5.5, speed: 0.11, offset: 2.8 },
  { pos: [ 1,  4, -14], color: "#113322", size: 7.0, speed: 0.09, offset: 5.2 },
]

function GlobalOrb({ pos, color, size, speed, offset }: OrbData) {
  const meshRef = useRef<THREE.Mesh>(null)

  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
    }),
    [color]
  )

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime * speed + offset
    mat.opacity = 0.018 + Math.sin(t) * 0.006
    meshRef.current.position.x = pos[0] + Math.sin(t * 0.4) * 0.6
    meshRef.current.position.y = pos[1] + Math.cos(t * 0.3) * 0.4
  })

  return (
    <mesh ref={meshRef} position={pos} material={mat}>
      <sphereGeometry args={[size, 12, 12]} />
    </mesh>
  )
}

/* ── Scene ───────────────────────────────────────────────────────── */
function GlobalScene() {
  return (
    <>
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
          powerPreference: "default",
        }}
        dpr={[1, 1]}
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      >
        <GlobalScene />
      </Canvas>
    </div>
  )
}
