// Angle-Lab: leitet mehrere Angles ab und bewertet jede nach vorhergesagter "Ziehkraft".
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { generateAngleLab } from "@/lib/generate";
import type { Brand, Webinar } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist nicht gesetzt." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const webinar: Webinar = body?.webinar;
    if (!webinar?.title) return NextResponse.json({ error: "Kein Webinar (Titel fehlt)." }, { status: 400 });
    const brand: Brand = body?.brand ?? JSON.parse(fs.readFileSync(path.join(process.cwd(), "brand", "brand.json"), "utf8"));

    const angles = await generateAngleLab(process.env.GEMINI_API_KEY, brand, webinar);
    return NextResponse.json({ angles });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/angles] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
