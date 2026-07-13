"use client"
/* eslint-disable react-hooks/immutability, react-hooks/rules-of-hooks */

/**
 * StoreScene3D.tsx
 *
 * React Three Fiber 3D scene for the Store page hero.
 *
 * Renders 6 floating preset "panels" -- thin glass rectangles with
 * gold gradient fills -- drifting at different depths and speeds.
 *
 * Fix (Phase 5): extracted StoreOrb into its own component so hooks
 * (useRef, useMemo, useFrame) are never called inside a .map() callback,
 * which violates the Rules of Hooks.
 */

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float }                       from "@react-three/drei"
import { EffectComposer, Bloom }       from "@react-three/postprocessing"
import * as THREE                      from "three"

/* -- Panel definitions -- */
const PANELS = [
  { pos: [-3.5,  0.8, -2.0] as [number,number,number], rot: [ 0.06,  0.28, -0.04] as [number,number,number], w: 2.0, h: 2.8, color: "#C9A84C", em: 0.5  },
  { pos: [ 3.2, -0.6, -3.2] as [number,number,number], rot: [-0.04, -0.24,  0.06] as [number,number,number], w: 2.8, h: 1.8, color: "#818cf8", em: 0.4  },
  { pos: [ 0.2,  1.8, -5.5] as [number,number,number], rot: [ 0.02,  0.08,  0.02] as [number,number,number], w: 3.6, h: 2.2, color: "#C9A84C", em: 0.35 },
  { pos: [-2.2, -1.5, -3.8] as [number,number,number], rot: [-0.08,  0.18,  0.05] as [number,number,number], w: 1.8, h: 2.4, color: "#34d399", em: 0.4  },
  { pos: [ 2.8,  1.4, -4.5] as [number,number,number], rot: [ 0.05, -0.15, -0.03] as [number,number,number], w: 1.6, h: 2.0, color: "#f97316", em: 0.4  },
  { pos: [-1.0, -0.2, -1.4] as [number,number,number], rot: [ 0.02,  0.12,  0.01] as [number,number,number], w: 1.4, h: 1.8, color: "#a78bfa", em: 0.45 },
] as const

/* -- Single floating panel -- */
type PanelProps = typeof PANELS[number] & { index: number }

function FloatingPanel({ pos, rot, w, h, color, em, index }: PanelProps) {
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive:          color,
    emissiveIntensity: em,
    transparent:       true,
    opacity:           0.08,
    roughness:         0.05,
    metalness:         0.3,
    side:              THREE.DoubleSide,
  }), [color, em])

  const borderMat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive:          color,
    emissiveIntensity: em * 1.8,
    transparent:       true,
    opacity:           0.7,
  }), [color, em])

  const cornerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive:          color,
    emissiveIntensity: em * 2.8,
    transparent:       true,
    opacity:           0.9,
  }), [color, em])

  const t  = 0.012
  const d  = 0.002
  const cs = 0.048

  const corners: [number, number, number][] = [
    [-w/2 + cs/2,  h/2 - cs/2, 0.001],
    [ w/2 - cs/2,  h/2 - cs/2, 0.001],
    [-w/2 + cs/2, -h/2 + cs/2, 0.001],
    [ w/2 - cs/2, -h/2 + cs/2, 0.001],
  ]

  return (
    <Float speed={0.45 + index * 0.11} rotationIntensity={0.08} floatIntensity={0.28}>
      <group position={[...pos] as [number,number,number]} rotation={[...rot] as [number,number,number]}>
        <mesh material={faceMat}>
          <planeGeometry args={[w, h]} />
        </mesh>
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
        {corners.map((cpos, i) => (
          <mesh key={i} material={cornerMat} position={cpos}>
            <boxGeometry args={[cs, cs, d * 2]} />
          </mesh>
        ))}
      </group>
    </Float>
  )
}

/* -- Single ambient orb (hooks must live in a proper component, not .map()) -- */
type OrbDef = {
  pos:   [number, number, number]
  color: string
  size:  number
  speed: number
  off:   number
}

function StoreOrb({ pos, color, size, speed, off }: OrbDef) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0,
  }), [color])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t     = clock.elapsedTime * speed + off
    mat.opacity = 0.035 + Math.sin(t) * 0.012
    ref.current.position.x = pos[0] + Math.sin(t * 0.4) * 0.7
    ref.current.position.y = pos[1] + Math.cos(t * 0.3) * 0.5
  })

  return (
    <mesh ref={ref} position={pos} material={mat}>
      <sphereGeometry args={[size, 6, 6]} />
    </mesh>
  )
}

const ORB_DEFS: OrbDef[] = [
  { pos: [-5,  2,  -8], color: "#C9A84C", size: 3.8, speed: 0.16, off: 0   },
  { pos: [ 6, -3, -10], color: "#4433cc", size: 4.8, speed: 0.12, off: 2.4 },
  { pos: [ 0,  4, -14], color: "#115544", size: 6.2, speed: 0.09, off: 4.8 },
]

function StoreOrbs() {
  return (
    <>
      {ORB_DEFS.map((o, i) => <StoreOrb key={i} {...o} />)}
    </>
  )
}

/* -- Mouse-parallax camera -- */
function StoreCamera() {
  const mouse      = useRef({ x: 0, y: 0 })
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
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.current.x * 0.3,   0.025)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, -mouse.current.y * 0.18, 0.025)
  })

  return null
}

/* -- Scene -- */
function StoreScene() {
  return (
    <>
      <fog attach="fog" args={["#08090f", 5, 22]} />
      <ambientLight intensity={0.08} />
      <directionalLight position={[3, 4, 3]}  color="#C9A84C" intensity={0.6}  />
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

