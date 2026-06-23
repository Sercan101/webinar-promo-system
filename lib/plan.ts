// KI-Posting-Plan: plant die Sequenz (Kanal, Asset, Zeitpunkt) + kanal-spezifische Captions.
// Konkrete Daten rechnet der Server (zuverlässig), nicht das LLM.
import { geminiJson } from "./gemini";
import { MODELS, brandContext, webinarContext } from "./generate";
import { planJsonSchema, zPlan } from "./schema";
import type { Brand, PlanEntry, PostingPlan, PromoBundle, Webinar } from "./types";

function parseGermanDate(s: string): Date | null {
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export async function createPostingPlan(
  apiKey: string, brand: Brand, webinar: Webinar, bundle: PromoBundle,
): Promise<PostingPlan> {
  const system = `Du bist Social-Media- & Performance-Marketer bei ${brand.name} und planst die Bewerbung eines Webinars über mehrere Kanäle.
${brandContext(brand)}`;

  const adsList = bundle.ads
    .map((a, i) => `- assetIndex ${i}: Anzeige ${i + 1} (${a.variant}) — Headline "${a.headline}", Angle ${a.angleId}`)
    .join("\n");

  const prompt = `${webinarContext(webinar)}

VERFÜGBARE ASSETS:
${adsList}
- assetIndex -1: E-Mail-Einladung (Betreff "${bundle.email.subject}")

AUFGABE: Erstelle einen Posting-Plan für die ~2-3 Wochen VOR dem Webinar (Termin ${webinar.date}).
Sinnvolle Sequenz über LinkedIn, Instagram, X, Facebook und E-Mail
(früh: Teaser/Pipeline-Angle → Mitte: Authority/Trust → spät: Proof/Zahlen → kurz davor: Last-Call + E-Mail).

Pro Slot:
- daysBeforeWebinar: Tage vor dem Webinar (1-21; 0 = am Tag)
- channel: LinkedIn | Instagram | X | Facebook | E-Mail
- assetIndex: welches Asset (0-basiert; -1 = E-Mail)
- format: 1x1 (Feed), 4x5 (Feed hoch), 9x16 (Story), "—" für E-Mail
- caption: KANAL-SPEZIFISCH zugeschnitten — LinkedIn: 2-4 Sätze, seriös; Instagram: knackig + 2-3 Hashtags; X: 1-2 knappe Sätze; Facebook: mittel; E-Mail: Betreff-artig. du-Ansprache, kein Hype.
- rationale: 1 Satz, warum dieser Slot/Kanal/Zeitpunkt.

Plane 7-10 Slots. Antworte ausschließlich im JSON-Schema.`;

  const text = await geminiJson({ apiKey, models: MODELS, system, prompt, schema: planJsonSchema, temperature: 0.6 });
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = zPlan.parse(JSON.parse(raw));

  const base = parseGermanDate(webinar.date);
  const entries: PlanEntry[] = parsed.entries
    .sort((a, b) => b.daysBeforeWebinar - a.daysBeforeWebinar)
    .map((e) => {
      let date = `T-${e.daysBeforeWebinar}`;
      if (base) {
        const d = new Date(base);
        d.setDate(d.getDate() - e.daysBeforeWebinar);
        date = fmtDate(d);
      }
      const assetLabel = e.assetIndex === -1
        ? "E-Mail-Einladung"
        : `Anzeige ${e.assetIndex + 1} (${bundle.ads[e.assetIndex]?.variant ?? "?"})`;
      return { ...e, date, assetLabel };
    });

  return { entries };
}
