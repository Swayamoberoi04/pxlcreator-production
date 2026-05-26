"use client"

/**
 * ClientOnly.tsx
 *
 * Renders children only after client-side hydration is complete.
 * Use this to wrap any component that:
 *   • Uses dynamic(ssr: false) and would cause a tree-position mismatch
 *   • Reads browser APIs (window, document) at render time
 *   • Uses Math.random() or Date.now() without a deterministic seed
 *
 * The fallback (default: null) is rendered during SSR and the initial
 * hydration pass so the DOM tree is identical on both sides.
 * After the first useEffect fires, mounted flips to true and the real
 * children replace the fallback — no mismatch, no console warnings.
 */

import { useState, useEffect, type ReactNode } from "react"

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  return mounted ? <>{children}</> : <>{fallback}</>
}
