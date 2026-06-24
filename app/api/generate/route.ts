// Pipeline-Endpunkt für die Web-Oberfläche:
// Webinar rein -> Angles + 3 Anzeigen (Copy + gerendertes Creative) + E-Mail raus.
import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { runPipeline } from "@/lib/pipeline";
import { renderAdSet } from "@/lib/creative";
import type { Angle, Brand, CreativeDesign, Webinar } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY ist nicht gesetzt. In Vercel als Environment Variable hinterlegen (oder lokal in .env.local)." },
        { status: 400 },
      );
    }
    const body = await req.json().catch(() => ({}));
    // Optional ein gelerntes Brand-Kit aus dem Request nutzen, sonst das Standard-Kit.
    const brand: Brand = body?.brand ?? JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "brand", "brand.json"), "utf8"),
    );
    const webinar: Webinar = body?.webinar;
    if (!webinar?.title || !webinar?.host) {
      return NextResponse.json({ error: "Ungültiger Webinar-Input (Titel/Host fehlt)." }, { status: 400 });
    }

    const design: CreativeDesign | undefined = body?.design;
    const selectedAngles: Angle[] | undefined = body?.angles;
    const qa: boolean | undefined = body?.qa; // false = QA-Schleife überspringen (Einfach-Modus)

    const bundle = await runPipeline(brand, webinar, undefined, selectedAngles, { qa });

    // Pro Anzeige alle Formate rendern (3 Anzeigen × 3 Formate = 9 Creatives).
    const creatives = await renderAdSet(ImageResponse, bundle.ads, webinar, brand, design);

    return NextResponse.json({ bundle, creatives });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/generate] generation failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
