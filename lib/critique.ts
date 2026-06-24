// Qualitäts-Loop: ein Judge-Pass bewertet alle Assets gegen die Brand-Regeln (0-10 + Mängel),
// schwache Assets werden gezielt mit der Kritik als Feedback nachgebessert.
import type { z } from "zod";
import { geminiJson } from "./gemini";
import { MODELS, brandContext, webinarContext } from "./generate";
import {
  adsJsonSchema, critiqueJsonSchema, emailJsonSchema,
  zAdsAny, zCritique, zEmail,
} from "./schema";
import type {
  AdCopy, Angle, AssetCritique, Brand, BundleCritique, EmailInvite, Webinar,
} from "./types";

async function structured<T>(
  apiKey: string, system: string, prompt: string, jsonSchema: object, zodSchema: z.ZodType<T>,
): Promise<T> {
  const text = await geminiJson({ apiKey, models: MODELS, system, prompt, schema: jsonSchema, temperature: 0.4 });
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return zodSchema.parse(JSON.parse(raw));
}

function adForReview(ad: AdCopy, i: number): string {
  return `Anzeige ${i + 1} (Variante: ${ad.variant}, Angle: ${ad.angleId})
- Headline: ${ad.headline}  [Akzentwort: ${ad.accentWord}]
- Subline: ${ad.subline}${ad.proofStat ? `\n- Proof-Stat: ${ad.proofStat}` : ""}
- Hook: ${ad.hook}
- Body: ${ad.body}
- Bullets: ${ad.bullets.map((b) => `✓ ${b}`).join(" | ")}
- CTA: ${ad.cta}`;
}

function emailForReview(e: EmailInvite): string {
  return `E-Mail
- Betreff: ${e.subject}
- Preheader: ${e.preheader}
- Absätze: ${e.bodyParagraphs.join("  ¶  ")}
- Bullets: ${e.bullets.join(" | ")}
- CTA: ${e.cta}`;
}

const RUBRIK = `BEWERTUNGS-RUBRIK (0-10 je Asset, 10 = man würde es exakt so rausschicken):
- Trifft es Ton & Ansprache der Marke (du, direkt, B2B, KEIN Hype/Buzzwords)?
- Ist der Pain klar adressiert und der Angle erkennbar?
- Anzeigen: zugespitzte Headline, sinnvolles Akzentwort, konkrete (keine floskelhaften) Bullets, passender CTA?
- E-Mail: Problem-Agitate-Solve, erzählerisch mit konkretem Case, kein Clickbait, klarer CTA + Termin?
- Würde ein erfahrener Performance-Marketer bei Northpeak das so freigeben?
verdict = "revise", wenn der Score < 7, sonst "ok". issues = konkrete, umsetzbare Mängel. strengths = was gut ist.`;

// Bewertet alle Anzeigen + E-Mail in EINEM Call.
export async function critiqueAssets(
  apiKey: string, brand: Brand, webinar: Webinar, ads: AdCopy[], email: EmailInvite,
): Promise<BundleCritique> {
  const system = `Du bist Senior Performance-Marketer & strenger Qualitäts-Reviewer bei ${brand.name}.
Du bewertest Webinar-Promo-Assets ehrlich und konkret gegen die Marken-Standards.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

${RUBRIK}

ZU BEWERTENDE ASSETS:

${ads.map(adForReview).join("\n\n")}

${emailForReview(email)}

Bewerte die ${ads.length} Anzeigen (in Reihenfolge) und die E-Mail. Antworte ausschließlich im JSON-Schema.`;

  const result = await structured(apiKey, system, prompt, critiqueJsonSchema, zCritique);

  // Labels serverseitig setzen.
  const adCritiques: AssetCritique[] = result.ads.slice(0, ads.length).map((c, i) => ({
    label: `Anzeige ${i + 1} (${ads[i].variant})`,
    ...c,
  }));
  return {
    ads: adCritiques,
    email: { label: "E-Mail", ...result.email },
  };
}

// Bessert nur die schwachen Anzeigen nach (Kritik als Feedback), Reihenfolge bleibt.
export async function improveAds(
  apiKey: string, brand: Brand, webinar: Webinar, angles: Angle[],
  weak: { ad: AdCopy; critique: AssetCritique }[],
): Promise<AdCopy[]> {
  const system = `Du bist Performance-Marketer & Copywriter bei ${brand.name}.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

ANGLES:
${angles.map((a) => `- [${a.id}] ${a.name}: ${a.bigIdea}`).join("\n")}

AUFGABE: Überarbeite die folgenden ${weak.length} Anzeige(n). Behebe die genannten MÄNGEL,
behalte aber angleId und variant exakt bei. Halte alle Format-Regeln ein:
- headline max ${brand.creative.headlineMaxWords} Wörter; accentWord MUSS wortwörtlich in headline vorkommen
- subline max ${brand.creative.sublineMaxChars} Zeichen
- bei variant "proof": proofStat mit harter Zahl, sonst ""
- hook im Muster "${brand.adCopyFormat.hookPattern}", GENAU 4 Bullets, cta aus ${JSON.stringify(brand.adCopyFormat.ctaOptions)}
Gib die Anzeigen in DERSELBEN Reihenfolge zurück.

${weak.map(({ ad, critique }, i) => `### Anzeige ${i + 1}
${adForReview(ad, i)}
MÄNGEL: ${critique.issues.join("; ") || "—"}`).join("\n\n")}

Antworte ausschließlich im JSON-Schema (Feld "ads").`;

  const { ads } = await structured(apiKey, system, prompt, adsJsonSchema, zAdsAny);
  // Auf erwartete Anzahl/Reihenfolge absichern.
  return weak.map((w, i) => ads[i] ?? w.ad);
}

// Bessert die E-Mail nach.
export async function improveEmail(
  apiKey: string, brand: Brand, webinar: Webinar, email: EmailInvite, critique: AssetCritique,
): Promise<EmailInvite> {
  const system = `Du bist ${brand.emailFormat.fromName}, ${brand.emailFormat.fromRole}.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

AUFGABE: Überarbeite die folgende E-Mail-Einladung. Behebe die MÄNGEL, behalte den Stil
(Problem-Agitate-Solve, erzählerisch, du-Ansprache, kein Hype). Struktur wie bisher
(subject, preheader, greeting "${brand.emailFormat.greeting}", 3-4 bodyParagraphs, 3-4 bullets,
dateLine "📅 ${webinar.date} | ${webinar.time}", cta, signature "${brand.emailFormat.fromName}, ${brand.emailFormat.fromRole}").

AKTUELLE E-MAIL:
${emailForReview(email)}

MÄNGEL: ${critique.issues.join("; ") || "—"}

Antworte ausschließlich im JSON-Schema.`;

  return structured(apiKey, system, prompt, emailJsonSchema, zEmail);
}
