// Render-only: rendert die Creatives eines gespeicherten Zyklus neu (KEIN LLM).
// Wird von der Browser-History genutzt, um einen Zyklus wieder zu öffnen.
import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { renderAdSet } from "@/lib/creative";
import type { AdCopy, Brand, CreativeDesign, Webinar } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ads: AdCopy[] = body?.ads;
    const webinar: Webinar = body?.webinar;
    if (!Array.isArray(ads) || !webinar?.title) {
      return NextResponse.json({ error: "Ungültige Render-Daten (ads/webinar)." }, { status: 400 });
    }
    const brand: Brand = body?.brand ?? JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "brand", "brand.json"), "utf8"),
    );
    const design: CreativeDesign | undefined = body?.design;
    const creatives = await renderAdSet(ImageResponse, ads, webinar, brand, design);
    return NextResponse.json({ creatives });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/render] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
