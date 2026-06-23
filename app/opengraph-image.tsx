import { ImageResponse } from "next/og";

export const alt = "Webinar-Promo-System — Webinar rein → fertige Promo-Assets raus";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social-Preview (OG/Twitter). Beim Build statisch erzeugt — Standard-Font genügt.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          backgroundImage: "radial-gradient(1000px 500px at 80% -10%, rgba(225,29,42,0.35), transparent)",
          padding: 76,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#E11D2A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            →
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#a1a1aa" }}>Scaling Champions</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 66, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>
            Webinar rein → fertige Promo-Assets raus.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", maxWidth: 940 }}>
            Angles · Anzeigen (3 Formate) · E-Mail · Qualitäts-Check · Posting-Plan
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#71717a" }}>Next.js · Google Gemini · shadcn/ui</div>
      </div>
    ),
    { ...size }
  );
}
