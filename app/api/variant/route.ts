// A/B: erzeugt eine alternative Variante einer einzelnen Anzeige + rendert deren Creatives.
import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { generateVariant } from "@/lib/generate";
import { renderAdSet } from "@/lib/creative";
import type { AdCopy, Brand, CreativeDesign, Webinar } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist nicht gesetzt." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const ad: AdCopy = body?.ad;
    const webinar: Webinar = body?.webinar;
    if (!ad?.headline || !webinar?.title) {
      return NextResponse.json({ error: "Ungültige Daten (ad/webinar)." }, { status: 400 });
    }
    const brand: Brand = body?.brand ?? JSON.parse(fs.readFileSync(path.join(process.cwd(), "brand", "brand.json"), "utf8"));
    const design: CreativeDesign | undefined = body?.design;

    const variant = await generateVariant(process.env.GEMINI_API_KEY, brand, webinar, ad);
    const creatives = await renderAdSet(ImageResponse, [variant], webinar, brand, design);
    return NextResponse.json({ ad: variant, creatives });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/variant] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
