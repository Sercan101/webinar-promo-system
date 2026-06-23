// Live-Vorschau: rendert EINE Beispiel-Anzeige (aus den Webinar-Daten) mit dem aktuellen Design.
// Kein LLM — nur Rendering, damit man Vorlage/Farbe/Schrift/Bilder sofort sieht.
import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { renderCreativePng, DEFAULT_FORMAT } from "@/lib/creative";
import type { AdCopy, Brand, CreativeDesign, Webinar } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const webinar: Webinar = body?.webinar;
    if (!webinar) return NextResponse.json({ error: "Kein Webinar." }, { status: 400 });
    const brand: Brand = body?.brand ?? JSON.parse(fs.readFileSync(path.join(process.cwd(), "brand", "brand.json"), "utf8"));
    const design: CreativeDesign = body?.design ?? { template: "bold" };

    const title = webinar.title || "Dein Webinar-Titel";
    const words = title.split(/\s+/);
    const accentWord = [...words].filter((w) => w.length > 3).sort((a, b) => b.length - a.length)[0] ?? words[words.length - 1] ?? "";
    const sample: AdCopy = {
      angleId: "vorschau", variant: "headline", headline: title, accentWord,
      subline: webinar.subtitle || "", proofStat: "", hook: "", body: "", bullets: [], cta: "Mehr ansehen",
    };

    const png = await renderCreativePng(ImageResponse, sample, webinar, brand, DEFAULT_FORMAT, design);
    return NextResponse.json({ dataUri: `data:image/png;base64,${png.toString("base64")}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/preview] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
