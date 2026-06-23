// Extrahiert ein Webinar aus Transkript-Text oder einer Landingpage-URL.
import { NextResponse } from "next/server";
import { extractWebinar } from "@/lib/extract-webinar";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist nicht gesetzt." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const text: string | undefined = body?.text;
    const url: string | undefined = body?.url;
    if (!text?.trim() && !url?.trim()) {
      return NextResponse.json({ error: "Bitte Transkript-Text oder URL angeben." }, { status: 400 });
    }
    const webinar = await extractWebinar(process.env.GEMINI_API_KEY, { text, url });
    return NextResponse.json({ webinar });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/extract-webinar] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
