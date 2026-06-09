"use client"

/**
 * src/components/ui/PopupManagerLoader.tsx
 *
 * Thin client-component shell that lazy-loads PopupManager with ssr:false.
 *
 * WHY THIS FILE EXISTS:
 *   Next.js App Router layout.tsx is a Server Component by default.
 *   `dynamic(..., { ssr: false })` is only valid inside a Client Component.
 *   Calling it at the Server Component module level causes a build error:
 *     "App Router does not allow this usage in a Server Component layout."
 *
 * SOLUTION:
 *   Move the dynamic() call here (a "use client" file).
 *   layout.tsx imports this file directly — no dynamic() needed there.
 *   Result: PopupManager still loads client-side only, zero SSR impact,
 *   and the build succeeds.
 */

import dynamic from "next/dynamic"

const PopupManager = dynamic(
  () => import("@/components/ui/PopupManager"),
  { ssr: false },
)

export function PopupManagerLoader() {
  return <PopupManager />
}
