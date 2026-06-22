"use client"
/* eslint-disable react-hooks/immutability, react-hooks/purity */

/**
 * AmbientOrbs.tsx
 *
 * Lightweight React Three Fiber canvas for non-hero sections.
 * Renders:
 *   â€¢ 3 large, slow-breathing volumetric orbs (gold, indigo, teal)
 *   â€¢ 60 fine gold-dust particles
 *   â€¢ No frames or complex geometry â€” low GPU cost
 *
 * Designed to sit as an absolute-inset background behind section content.
 * Canvas uses alpha=true + pointer-events-none.
 *
 * Import dynamically with ssr:false in client component sections.
 */

import { useRef, useMemo } from "react"
import { Canvas, useFrame, useThree }  from "@react-three/fiber"
import * as THREE                       from "three"

/* â”€â”€ Single breathing orb sphere â”€â”€ */
type OrbProps = {
  position:  [number, number, number]
  color:     string
  size:      number
  speed:     number
  offset:    number
}

function Orb({ position, color, size, speed, offset }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color:       color,
        transparent: true,
        opacity:     0,
        side:        THREE.FrontSide,
      }),
    [color]
  )

  const { invalidate } = useThree()
  const frameRef = useRef(0)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    frameRef.current++
    /* Update every 3rd frame (~20fps) â€” opacity variance at this scale is imperceptible */
    if (frameRef.current % 3 !== 0) { invalidate(); return }
    const t = clock.elapsedTime * speed + offset
    mat.opacity = 0.04 + Math.sin(t) * 0.015
    meshRef.current.position.x = position[0] + Math.sin(t * 0.55) * 0.4
    meshRef.current.position.y = position[1] + Math.cos(t * 0.42) * 0.3
    invalidate()
  })

  return (
    <mesh ref={meshRef} position={position} material={mat}>
      {/* 8Ã—8 segments instead of 16Ã—16 â€” orbs are fully transparent blobs,
          geometry resolution has zero visible impact at opacity 0.04 */}
      <sphereGeometry args={[size, 8, 8]} />
    </mesh>
  )
}

/* â”€â”€ Gold dust particles â”€â”€ */
function Dust() {
  /* Reduced from 60 â†’ 30 â€” at sub-0.25 opacity the halving is invisible */
  const COUNT = 30

  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7
      pos[i * 3 + 2] = (Math.random()       ) * -6
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

  const matRef = useRef<THREE.PointsMaterial>(null)

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.18 + Math.sin(clock.elapsedTime * 0.3) * 0.06
    }
  })

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        color="#FFD60A"
        size={0.018}
        transparent
        opacity={0.18}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function Scene() {
  return (
    <>
      <fog attach="fog" args={["#000000", 5, 20]} />
      <Orb position={[-4,  1.5, -4]} color="#FFD60A" size={3.5} speed={0.28} offset={0} />
      <Orb position={[ 5, -1.0, -6]} color="#4433cc" size={4.0} speed={0.22} offset={2.1} />
      <Orb position={[ 0,  3.0, -8]} color="#115544" size={5.0} speed={0.18} offset={4.5} />
      <Dust />
    </>
  )
}

export function AmbientOrbs() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: false, alpha: true, powerPreference: "default" }}
      dpr={[1, 1]}
      frameloop="demand"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Scene />
    </Canvas>
  )
}

