"use client"

/**
 * StoreScene3DWrapper.tsx
 *
 * Client-component shell for the store page 3D canvas.
 * Owns the dynamic(ssr:false) import — required because Next.js
 * doesn't allow ssr:false in Server Components (store/page.tsx).
 * ClientOnly ensures the canvas mounts only post-hydration.
 */

import dynamic        from "next/dynamic"
import { ClientOnly } from "@/components/ui/ClientOnly"

const StoreScene3D = dynamic(
  () => import("./StoreScene3D").then((m) => m.StoreScene3D),
  { ssr: false }
)

export function StoreScene3DWrapper() {
  return (
    <ClientOnly>
      <StoreScene3D />
    </ClientOnly>
  )
}
