"use client"

import { AuthGuard } from "@/components/auth/AuthGuard"

/**
 * All routes under (protected)/ require an authenticated session.
 * AuthGuard handles the redirect to /login if no user is found.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard>{children}</AuthGuard>
}
