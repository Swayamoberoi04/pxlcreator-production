"use client"
/* eslint-disable react-hooks/immutability, react-hooks/rules-of-hooks */

/**
 * StoreScene3D.tsx
 *
 * React Three Fiber 3D scene for the Store page hero.
 *
 * Renders 6 floating preset "panels" — thin glass rectangles with
 * gold gradient fills — drifting at different depths and speeds.
 * The panels represent the preset packs available in the store.
 *
 * Visual concept:
 *   "Entering a digital gallery of cinematic presets floating in space."
 *
 * Technical notes:
 *   • Thin MeshStandardMaterial panels with low opacity + emissive color
 *   • Float() from drei handles the idle bobbing
 *   • Mouse parallax camera rig for interactivity
 *   • Low poly count — 6 planes × 2 tri each. Minimal GPU cost.
 *   • Bloom via EffectComposer lights up the gold emissive panels
 */

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float }                       from "@react-three/drei"
import { EffectComposer, Bloom }       from "@react-three/postprocessing"
import * as THREE                      from "three"

/* ── Panel color palettes — map to preset categories ────────────── */
const PANELS = [
  { pos: [-3.5,  0.8, -2.0], rot: [ 0.06,  0.28, -0.04], w: 2.0, h: 2.8, color: "#ffd700", em: 0.5 },  // Cinematic — gold
  { pos: [ 3.2, -0.6, -3.2], rot: [-0.04, -0.24,  0.06], w: 2.8, h: 1.8, color: "#818cf8", em: 0.4 },  // Portrait — indigo
  { pos: [ 0.2,  1.8, -5.5], rot: [ 0.02,  0.08,  0.02], w: 3.6, h: 2.2, color: "#ffd700", em: 0.35 }, // Film — gold wide
  { pos: [-2.2, -1.5, -3.8], rot: [-0.08,  0.18,  0.05], w: 1.8, h: 2.4, color: "#34d399", em: 0.4 },  // Landscape — teal
  { pos: [ 2.8,  1.4, -4.5], rot: [ 0.05, -0.15, -0.03], w: 1.6, h: 2.0, color: "#f97316", em: 0.4 },  // Street — orange
  { pos: [-1.0, -0.2, -1.4], rot: [ 0.02,  0.12,  0.01], w: 1.4, h: 1.8, color: "#a78bfa", em: 0.45 }, // Bundle — violet
] as const

/* ── Single floating panel ───────────────────────────────────────── */
type PanelProps = typeof PANELS[number] & { index: number }

function FloatingPanel({ pos, rot, w, h, color, em, index }: PanelProps) {
  /* Glass face */
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             color,
    emissive:          color,
    emissiveIntensity: em,
    transparent:       true,
    opacity:           0.08,
    roughness:         0.05,
    metalness:         0.3,
    side:              THREE.DoubleSide,
  }), [color, em])

  /* Gold/colored border */
  const borderMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             color,
    emissive:          color,
    emissiveIntensity: em * 1.8,
    transparent:       true,
    opacity:           0.7,
  }), [color, em])

  /* Corner accent — bright node that Bloom picks up */
  const cornerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             color,
    emissive:          color,
    emissiveIntensity: em * 2.8,
    transparent:       true,
    opacity:           0.9,
  }), [color, em])

  const t  = 0.012   // border thickness
  const d  = 0.002   // depth
  const cs = 0.048   // corner square

  const corners: [number, number, number][] = [
    [-w/2 + cs/2,  h/2 - cs/2, 0.001],
    [ w/2 - cs/2,  h/2 - cs/2, 0.001],
    [-w/2 + cs/2, -h/2 + cs/2, 0.001],
    [ w/2 - cs/2, -h/2 + cs/2, 0.001],
  ]

  return (
    <Float speed={0.45 + index * 0.11} rotationIntensity={0.08} floatIntensity={0.28}>
      <group position={[...pos] as [number, number, number]} rotation={[...rot] as [number, number, number]}>
        {/* Glass face */}
        <mesh material={faceMat}>
          <planeGeometry args={[w, h]} />
        </mesh>

        {/* Borders */}
        <mesh material={borderMat} position={[0, h/2, 0]}>
          <boxGeometry args={[w + t, t, d]} />
        </mesh>
        <mesh material={borderMat} position={[0, -h/2, 0]}>
          <boxGeometry args={[w + t, t, d]} />
        </mesh>
        <mesh material={borderMat} position={[-w/2, 0, 0]}>
          <boxGeometry args={[t, h, d]} />
        </mesh>
        <mesh material={borderMat} position={[w/2, 0, 0]}>
          <boxGeometry args={[t, h, d]} />
        </mesh>

        {/* Corner bloom nodes */}
        {corners.map((cpos, i) => (
          <mesh key={i} material={cornerMat} position={cpos}>
            <boxGeometry args={[cs, cs, d * 2]} />
          </mesh>
        ))}
      </group>
    </Float>
  )
}

/* ── Floating color orbs ─────────────────────────────────────────── */
function StoreOrbs() {
  const orbs = [
    { pos: [-5, 2, -8]  as [number,number,number], color: "#ffd700", size: 3.8, speed: 0.16, off: 0    },
    { pos: [ 6, -3, -10] as [number,number,number], color: "#4433cc", size: 4.8, speed: 0.12, off: 2.4 },
    { pos: [ 0, 4, -14]  as [number,number,number], color: "#115544", size: 6.2, speed: 0.09, off: 4.8 },
  ]

  return (
    <>
      {orbs.map((o, i) => {
        const ref  = useRef<THREE.Mesh>(null)
        const mat  = useMemo(() => new THREE.MeshBasicMaterial({
          color: o.color, transparent: true, opacity: 0,
        }), [o.color])

        useFrame(({ clock }) => {
          if (!ref.current) return
          const t      = clock.elapsedTime * o.speed + o.off
          mat.opacity  = 0.035 + Math.sin(t) * 0.012
          ref.current.position.x = o.pos[0] + Math.sin(t * 0.4) * 0.7
          ref.current.position.y = o.pos[1] + Math.cos(t * 0.3) * 0.5
        })

        return (
          <mesh key={i} ref={ref} position={o.pos} material={mat}>
            {/* 6×6 segments — nearly transparent blobs, geometry res is invisible */}
            <sphereGeometry args={[o.size, 6, 6]} />
          </mesh>
        )
      })}
    </>
  )
}

/* ── Mouse-parallax camera ───────────────────────────────────────── */
function StoreCamera() {
  const mouse    = useRef({ x: 0, y: 0 })
  const { camera } = useThree()

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.current.x * 0.3, 0.025)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, -mouse.current.y * 0.18, 0.025)
  })

  return null
}

/* ── Scene ───────────────────────────────────────────────────────── */
function StoreScene() {
  return (
    <>
      <fog attach="fog" args={["#08090f", 5, 22]} />
      <ambientLight intensity={0.08} />
      <directionalLight position={[3, 4, 3]} color="#ffd700" intensity={0.6} />
      <directionalLight position={[-4, -2, 2]} color="#4433cc" intensity={0.15} />

      {PANELS.map((p, i) => <FloatingPanel key={i} {...p} index={i} />)}
      <StoreOrbs />
      <StoreCamera />

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.08} luminanceSmoothing={0.85} mipmapBlur />
      </EffectComposer>
    </>
  )
}

export function StoreScene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 58 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <StoreScene />
    </Canvas>
  )
}
