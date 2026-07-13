/**
 * src/app/opengraph-image.tsx
 *
 * Generates /opengraph-image (and /twitter-image) at build time.
 * Next.js automatically wires these into the <head> OG meta tags.
 *
 * Also update layout.tsx metadataBase so relative paths resolve
 * correctly to https://pxlcreator.com.
 */

import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt     = "PXL Creator — Premium Cinematic Presets"
export const size    = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           "100%",
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "#08090f",
          fontFamily:      "system-ui, sans-serif",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* Background radial glow — top-left gold */}
        <div
          style={{
            position:   "absolute",
            top:        "-80px",
            left:       "-80px",
            width:      "600px",
            height:     "600px",
            borderRadius: "50%",
            background:  "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)",
          }}
        />
        {/* Background radial glow — bottom-right indigo */}
        <div
          style={{
            position:   "absolute",
            bottom:     "-100px",
            right:      "-100px",
            width:      "500px",
            height:     "500px",
            borderRadius: "50%",
            background:  "radial-gradient(circle, rgba(61,122,138,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Top gold line */}
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            height:     "2px",
            background: "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.6) 50%, transparent 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            gap:            "28px",
            padding:        "0 80px",
            textAlign:      "center",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.9)", textTransform: "uppercase" }}>
              PXL
            </span>
            <span style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.18em", color: "#C9A84C", textTransform: "uppercase", textShadow: "0 0 32px rgba(201,168,76,0.6)" }}>
              {" "}CREATOR
            </span>
          </div>

          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(201,168,76,0.75)", textTransform: "uppercase" }}>
              Premium Cinematic Presets
            </span>
            <div style={{ width: "32px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize:      "64px",
              fontWeight:    800,
              lineHeight:    1.05,
              letterSpacing: "-0.02em",
              color:         "#ffffff",
              maxWidth:      "860px",
            }}
          >
            Edit Like a{" "}
            <span style={{ color: "#C9A84C", textShadow: "0 0 48px rgba(201,168,76,0.4)" }}>
              Filmmaker.
            </span>
          </div>

          {/* Sub */}
          <p
            style={{
              fontSize:   "22px",
              color:      "rgba(170,170,170,0.9)",
              lineHeight: 1.6,
              maxWidth:   "680px",
              margin:     0,
            }}
          >
            Handcrafted Lightroom presets and creator tools for photographers who care about their craft.
          </p>

          {/* CTA pill */}
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "8px",
              background:   "rgba(201,168,76,0.12)",
              border:       "1px solid rgba(201,168,76,0.3)",
              borderRadius: "9999px",
              padding:      "10px 24px",
            }}
          >
            <span style={{ fontSize: "15px", color: "#C9A84C", fontWeight: 600 }}>
              pxlcreator.com
            </span>
          </div>
        </div>

        {/* Bottom gold line */}
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.3) 50%, transparent 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}


