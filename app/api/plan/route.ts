// Erstellt einen KI-Posting-Plan (Sequenz + kanal-spezifische Captions) für einen Zyklus.
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { createPostingPlan } from "@/lib/plan";
import type { Brand, PromoBundle, Webinar } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist nicht gesetzt." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const webinar: Webinar = body?.webinar;
    const bundle: PromoBundle = body?.bundle;
    if (!webinar?.title || !bundle?.ads) {
      return NextResponse.json({ error: "Ungültige Plan-Daten (webinar/bundle)." }, { status: 400 });
    }
    const brand: Brand = body?.brand ?? JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "brand", "brand.json"), "utf8"),
    );
    const plan = await createPostingPlan(process.env.GEMINI_API_KEY, brand, webinar, bundle);
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/plan] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
