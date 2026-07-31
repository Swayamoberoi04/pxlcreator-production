"use client"

/**
 * src/app/global-error.tsx — root error boundary (Phase 5 §7).
 *
 * Last line of defence: catches errors thrown in the root layout itself
 * (where the segment error.tsx cannot render because the layout failed).
 * Must render its own <html>/<body>. Intentionally dependency-free and
 * self-styled so it works even if the app's CSS/providers are the thing
 * that broke.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0a0a0b", color: "#ededed",
        fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "center", padding: "1.5rem",
      }}>
        <div style={{ maxWidth: 460, display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: "0.9375rem", lineHeight: 1.6, color: "#a1a1aa", margin: 0 }}>
            The application hit an unexpected error. Please reload the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#71717a", margin: 0 }}>
              Reference: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "0.5rem", border: "none", cursor: "pointer",
              background: "#FFD60A", color: "#0a0a0b", fontWeight: 600,
              fontSize: "0.875rem", padding: "0.65rem 1.5rem", borderRadius: 999,
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
