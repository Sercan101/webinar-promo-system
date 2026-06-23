// Webinar-Extraktion: aus rohem Transkript/Notizen ODER einer Landingpage-URL
// werden die strukturierten Webinar-Felder abgeleitet ("Webinar rein").
import { geminiJson } from "./gemini";
import { MODELS } from "./generate";
import { webinarExtractJsonSchema, zWebinarExtract } from "./schema";
import type { Webinar } from "./types";

// Holt eine URL und reduziert das HTML auf reinen Text.
async function urlToText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; PromoBot/1.0)" } });
  if (!res.ok) throw new Error(`URL nicht erreichbar (HTTP ${res.status}).`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 9000);
}

export async function extractWebinar(
  apiKey: string,
  source: { text?: string; url?: string; images?: { data: string; mimeType: string }[] },
): Promise<Webinar> {
  const images = source.images;
  let material = (source.text ?? "").trim();
  if (!material && !images?.length && source.url) material = await urlToText(source.url.trim());
  if (!material && !images?.length) throw new Error("Kein Material (Text, URL oder Bilder) angegeben.");

  const system = "Du extrahierst aus Webinar-Material präzise, strukturierte Felder für ein Promo-System. Deutsch, du-Ansprache.";
  const fields = `Felder: title, subtitle, format (z.B. "Live-Webinar"), date, time, registrationUrl, audience,
host {name, role}, guest {name, role} (optional), pains[], coreProblem, coreMessage,
solutionPoints[], freebie (optional), promise[], proofCases[] (optional).
Antworte ausschließlich im vorgegebenen JSON-Schema.`;
  const prompt = images?.length
    ? `Die folgenden Bilder sind die Seiten eines Webinar-Briefings (aus einer PDF). Lies den Text auf den Seiten und extrahiere die Felder. Fehlt etwas, leite es plausibel ab; optionale Felder (guest, freebie, proofCases) weglassen, wenn nichts dazu da ist.\n\n${fields}`
    : `Hier ist Material zu einem Webinar (Transkript, Notizen oder Landingpage-Text).
Extrahiere die Felder. Fehlt etwas, leite es plausibel aus dem Inhalt ab; optionale Felder (guest, freebie, proofCases) darfst du weglassen, wenn nichts dazu da ist.

MATERIAL:
"""
${material}
"""

${fields}`;

  const text = await geminiJson({
    apiKey, models: MODELS, system, prompt, schema: webinarExtractJsonSchema, temperature: 0.4,
    images,
  });
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const w = zWebinarExtract.parse(JSON.parse(raw));

  // Leere optionale Felder bereinigen.
  if (w.guest && !w.guest.name.trim()) w.guest = undefined;
  if (w.freebie && !w.freebie.trim()) w.freebie = undefined;
  if (w.proofCases && w.proofCases.filter((c) => c.trim()).length === 0) w.proofCases = undefined;

  return w as Webinar;
}
