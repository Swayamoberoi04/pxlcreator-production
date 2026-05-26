"use client"

/**
 * GlobalAmbientWrapper.tsx
 *
 * Thin client-component shell that owns the dynamic(ssr:false) import
 * for GlobalAmbientCanvas. This must live in a "use client" file because
 * `ssr: false` is not permitted inside Server Components (layout.tsx).
 *
 * Also wraps in ClientOnly so the canvas only mounts after hydration —
 * preventing any tree-mismatch between server HTML and client render.
 */

import dynamic      from "next/dynamic"
import { ClientOnly } from "@/components/ui/ClientOnly"

const GlobalAmbientCanvas = dynamic(
  () => import("./GlobalAmbientCanvas").then((m) => m.GlobalAmbientCanvas),
  { ssr: false }
)

export function GlobalAmbientWrapper() {
  return (
    <ClientOnly>
      <GlobalAmbientCanvas />
    </ClientOnly>
  )
}
