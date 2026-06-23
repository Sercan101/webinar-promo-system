// Webinar aus Audio/Video: Gemini "hört" die Aufnahme und extrahiert die Webinar-Felder.
import { NextResponse } from "next/server";
import { geminiJson } from "@/lib/gemini";
import { MODELS } from "@/lib/generate";
import { webinarExtractJsonSchema, zWebinarExtract } from "@/lib/schema";
import type { Webinar } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 240;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist nicht gesetzt." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const dataUri: string = body?.dataUri ?? "";
    const m = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return NextResponse.json({ error: "Keine gültige Audio-/Video-Datei." }, { status: 400 });
    const mimeType = m[1];
    const data = m[2];

    const system = "Du extrahierst aus einer Webinar-Aufnahme präzise, strukturierte Felder für ein Promo-System. Deutsch, du-Ansprache.";
    const prompt = `Hier ist die Aufnahme (Audio/Video) eines Webinars. Verstehe den Inhalt und extrahiere die Felder.
Fehlt etwas (z.B. genaues Datum), leite es plausibel ab oder lass optionale Felder weg.

Felder: title, subtitle, format (z.B. "Live-Webinar"), date, time, registrationUrl, audience,
host {name, role}, guest {name, role} (optional), pains[], coreProblem, coreMessage,
solutionPoints[], freebie (optional), promise[], proofCases[] (optional).
Antworte ausschließlich im vorgegebenen JSON-Schema.`;

    const text = await geminiJson({
      apiKey: process.env.GEMINI_API_KEY, models: MODELS, system, prompt,
      schema: webinarExtractJsonSchema, media: [{ data, mimeType }], temperature: 0.4,
    });
    const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const w = zWebinarExtract.parse(JSON.parse(raw));
    if (w.guest && !w.guest.name.trim()) w.guest = undefined;
    if (w.freebie && !w.freebie.trim()) w.freebie = undefined;
    if (w.proofCases && w.proofCases.filter((c) => c.trim()).length === 0) w.proofCases = undefined;

    return NextResponse.json({ webinar: w as Webinar });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/transcribe] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
