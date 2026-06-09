"use client"
/* eslint-disable react-hooks/immutability, react-hooks/purity */

/**
 * HeroScene3D.tsx
 *
 * React Three Fiber canvas that overlays the hero section with:
 *   • 4 floating glass frames (portrait / landscape mix) with gold borders
 *   • Gold Sparkles cloud from @react-three/drei
 *   • Custom gold-dust Points geometry
 *   • Smooth mouse-parallax camera rig
 *   • Atmospheric fog for depth
 *
 * Canvas uses alpha=true so every existing hero layer (photos, grains,
 * overlays) shows through. pointer-events=none keeps all hero interactions
 * on the DOM layer above.
 *
 * Performance:
 *   – antialias=false        (saves fillrate)
 *   – dpr=[1, 1]             (no 1.5× on high-dpi — single biggest fillrate saver)
 *   – powerPreference="high-performance" (discrete GPU hint)
 *   – Geometries created once in useMemo; no per-frame allocations
 *   – EffectComposer REMOVED — was the single most expensive GPU operation
 *     (mipmapBlur Bloom = 5-7 fullscreen render passes per frame)
 *   – Returns null on touch devices — saves all WebGL work on mobile
 */

import { useRef, useMemo, useEffect }    from "react"
import { Canvas, useFrame, useThree }    from "@react-three/fiber"
import { Float, Sparkles }               from "@react-three/drei"
import * as THREE                        from "three"

/*
 * Evaluated once at module-load time on the client.
 * This file is dynamically imported with ssr:false so window is always defined.
 * Returns false during any hypothetical SSR (type guard).
 */
const IS_TOUCH_DEVICE =
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0)

/* ── Frame definitions ──────────────────────────────────────────── */
type FrameDef = {
  pos:   [number, number, number]
  rot:   [number, number, number]
  w:     number
  h:     number
}

const FRAMES: FrameDef[] = [
  // Far-left portrait — warm, slightly tilted toward viewer
  { pos: [-3.8,  0.9, -1.6], rot: [ 0.06,  0.22, -0.03], w: 1.8, h: 2.4 },
  // Right landscape — deeper, tilted away
  { pos: [ 3.4, -0.4, -3.0], rot: [-0.04, -0.20,  0.05], w: 2.6, h: 1.7 },
  // Center-top — deepest, wide
  { pos: [ 0.3,  1.5, -5.5], rot: [ 0.03,  0.01,  0.01], w: 3.4, h: 2.1 },
  // Lower-left — medium depth, portrait
  { pos: [-2.4, -1.7, -3.4], rot: [-0.09,  0.13,  0.06], w: 1.6, h: 2.1 },
]

/* ── Gold frame border (4 thin box edges + corner dots) ─────────── */
function GoldBorder({ w, h }: { w: number; h: number }) {
  const t = 0.015   // border thickness
  const d = 0.003   // border depth

  /* Shared gold emissive material — picked up by Bloom */
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color:             "#ffd700",
      emissive:          "#ffd700",
      emissiveIntensity: 0.55,
      transparent:       true,
      opacity:           0.6,
    }),
    []
  )

  /* Corner accent material — brighter emissive → stronger bloom halo */
  const cornerMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color:             "#ffd700",
      emissive:          "#ffd700",
      emissiveIntensity: 1.1,
      transparent:       true,
      opacity:           0.8,
    }),
    []
  )

  const cs = 0.055   // corner square size

  return (
    <group>
      {/* Top edge */}
      <mesh material={mat} position={[0, h / 2, 0]}>
        <boxGeometry args={[w + t, t, d]} />
      </mesh>
      {/* Bottom edge */}
      <mesh material={mat} position={[0, -h / 2, 0]}>
        <boxGeometry args={[w + t, t, d]} />
      </mesh>
      {/* Left edge */}
      <mesh material={mat} position={[-w / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
      </mesh>
      {/* Right edge */}
      <mesh material={mat} position={[w / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
      </mesh>

      {/* Corner accent dots — high emissive for bright bloom nodes */}
      {(
        [
          [-w / 2 + cs / 2,  h / 2 - cs / 2, 0.001] as [number, number, number],
          [ w / 2 - cs / 2,  h / 2 - cs / 2, 0.001] as [number, number, number],
          [-w / 2 + cs / 2, -h / 2 + cs / 2, 0.001] as [number, number, number],
          [ w / 2 - cs / 2, -h / 2 + cs / 2, 0.001] as [number, number, number],
        ] as Array<[number, number, number]>
      ).map((cpos, i) => (
        <mesh key={i} material={cornerMat} position={cpos}>
          <boxGeometry args={[cs, cs, d * 2]} />
        </mesh>
      ))}
    </group>
  )
}

/* ── Single floating glass frame ────────────────────────────────── */
function GlassFrame({ pos, rot, w, h, index }: FrameDef & { index: number }) {
  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color:       "#ffd700",
        emissive:    "#443300",
        emissiveIntensity: 0.08,
        transparent: true,
        opacity:     0.04,
        roughness:   0.05,
        metalness:   0.2,
        side:        THREE.DoubleSide,
      }),
    []
  )

  return (
    <Float
      speed={0.55 + index * 0.12}
      rotationIntensity={0.10}
      floatIntensity={0.35}
    >
      <group position={pos} rotation={rot}>
        {/* Glass fill — nearly invisible, catches light */}
        <mesh material={glassMat}>
          <planeGeometry args={[w, h]} />
        </mesh>

        {/* Gold border + corners */}
        <GoldBorder w={w} h={h} />
      </group>
    </Float>
  )
}

/* ── Custom gold-dust point cloud ───────────────────────────────── */
function GoldDust() {
  const COUNT = 80   // reduced from 180 — imperceptible difference, ~56% less geometry

  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 20   // x spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * 11   // y spread
      pos[i * 3 + 2] = (Math.random()       ) * -9 - 1 // z: behind camera
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

  const matRef = useRef<THREE.PointsMaterial>(null)

  useFrame(({ clock }) => {
    if (matRef.current) {
      // Slow breathing opacity
      matRef.current.opacity =
        0.22 + Math.sin(clock.elapsedTime * 0.45) * 0.08
    }
  })

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        color="#ffd700"
        size={0.022}
        transparent
        opacity={0.25}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/* ── Camera rig — smooth mouse-parallax ─────────────────────────── */
function CameraRig() {
  const mouse      = useRef({ x: 0, y: 0 })
  const { camera } = useThree()

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) return

    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", handleMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMove)
  }, [])

  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      mouse.current.x  * 0.38,
      0.028
    )
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      -mouse.current.y * 0.22,
      0.028
    )
  })

  return null
}

/* ── Scene root ─────────────────────────────────────────────────── */
function Scene() {
  return (
    <>
      {/* Atmospheric fog — frames at z=-1.5 to -5.5 fade gracefully */}
      <fog attach="fog" args={["#000000", 6, 24]} />

      {/* Lighting */}
      <ambientLight intensity={0.12} />
      {/* Warm gold key — emissive surfaces bloom from this */}
      <directionalLight position={[ 4,  3, 4]} color="#ffd700" intensity={0.9} />
      {/* Cool indigo fill */}
      <directionalLight position={[-3, -2, 2]} color="#3322cc" intensity={0.18} />

      {/* Glass frames */}
      {FRAMES.map((f, i) => (
        <GlassFrame key={i} {...f} index={i} />
      ))}

      {/* Sparkle cloud — drei's built-in atmospheric sparks */}
      <Sparkles
        count={45}
        scale={[18, 10, 7]}
        size={1.4}
        speed={0.10}
        color="#ffd700"
        opacity={0.55}
      />

      {/* Fine gold-dust points */}
      <GoldDust />

      {/* Mouse-parallax camera rig */}
      <CameraRig />

      {/*
       * EffectComposer (Bloom + Vignette) REMOVED.
       * mipmapBlur Bloom = 5–7 fullscreen render passes per frame.
       * At dpr=1 on 1080p that was ~1M pixels × 6 passes = ~6M pixel ops/frame.
       * The CSS vignette in HeroSection LAYER 6 provides the darkened edges.
       * Gold emissive materials still add warmth without postprocessing.
       */}
    </>
  )
}

/* ── Exported canvas — dynamically imported with ssr:false ──────── */
export function HeroScene3D() {
  /*
   * Skip WebGL entirely on touch devices.
   * On mobile: no WebGL context, no GPU draw calls, no animation loops.
   * The hero is still visually rich — background images, CinematicBackground
   * orbs, FloatingParticles, and the GrainOverlay all remain.
   */
  if (IS_TOUCH_DEVICE) return null

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 55 }}
      gl={{
        antialias:       false,
        alpha:           true,
        powerPreference: "high-performance",
      }}
      dpr={[1, 1]}   /* was [1, 1.5] — dpr 1.5 = 2.25× pixel work for negligible quality gain */
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Scene />
    </Canvas>
  )
}
