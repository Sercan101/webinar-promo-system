import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fonts, Brand-Kit und Speaker-Fotos werden zur Laufzeit per fs gelesen.
  // Damit Vercel sie in die Serverless-Function packt, müssen sie ins File-Tracing.
  outputFileTracingIncludes: {
    "/api/generate": [
      "./assets/**/*",
      "./brand/**/*",
      // next/og laedt seine WASM-/Node-Binaries zur Laufzeit -> ins Bundle zwingen.
      "./node_modules/next/dist/compiled/@vercel/og/**/*",
    ],
    "/api/learn-brand": ["./assets/**/*", "./brand/**/*"],
    "/api/plan": ["./brand/**/*"],
    "/api/angles": ["./brand/**/*"],
    "/api/render": [
      "./assets/**/*",
      "./brand/**/*",
      "./node_modules/next/dist/compiled/@vercel/og/**/*",
    ],
    "/api/preview": [
      "./assets/**/*",
      "./brand/**/*",
      "./node_modules/next/dist/compiled/@vercel/og/**/*",
    ],
    "/api/variant": [
      "./assets/**/*",
      "./brand/**/*",
      "./node_modules/next/dist/compiled/@vercel/og/**/*",
    ],
  },
};

export default nextConfig;
