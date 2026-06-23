// Auto-Brand-Learning: liest die echten Beispiel-Anzeigen (Vision) + Mails
// und leitet daraus das Brand-Kit ab. Strukturelle Felder (Fonts, Creative-Dimensionen)
// bleiben aus der Basis erhalten — gelernt werden Farben, Ton, Copy-/Mail-Regeln.
import fs from "node:fs";
import path from "node:path";
import { geminiJson } from "./gemini";
import { MODELS } from "./generate";
import { learnedBrandJsonSchema, zLearnedBrand } from "./schema";
import type { Brand } from "./types";

const EX_DIR = path.join(process.cwd(), "assets", "examples");
const AD_FILES = ["beispiel-anzeige-1.png", "beispiel-anzeige-2.png", "beispiel-anzeige-3.png"];

export function loadExamples() {
  const images = AD_FILES
    .map((f) => path.join(EX_DIR, f))
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ data: fs.readFileSync(p).toString("base64"), mimeType: "image/png" }));
  const mailsPath = path.join(EX_DIR, "beispiel-mails.txt");
  const mails = fs.existsSync(mailsPath) ? fs.readFileSync(mailsPath, "utf8") : "";
  return { images, mails };
}

export async function learnBrand(
  apiKey: string,
  base: Brand,
  uploaded?: { images?: { data: string; mimeType: string }[]; mails?: string },
): Promise<Brand> {
  // Hochgeladene Beispiele bevorzugen; sonst die mitgelieferten in assets/examples/.
  let images = uploaded?.images ?? [];
  let mails = uploaded?.mails ?? "";
  if (images.length === 0) {
    const ex = loadExamples();
    images = ex.images;
    if (!mails) mails = ex.mails;
  }
  if (images.length === 0) throw new Error("Keine Beispiel-Anzeigen gefunden — lade welche hoch oder lege sie in assets/examples/ ab.");

  const system = "Du bist Brand-Analyst. Du leitest aus echten Werbe-Assets ein präzises Marken-Kit ab.";
  const prompt = `Analysiere die ${images.length} beigefügten Beispiel-Anzeigen (Bilder) und die Beispiel-Mails unten. Leite das Marken-Kit ab:

- palette: die ECHTEN Farben aus den Anzeigen als Hex (#RRGGBB) — dunkler Hintergrund (bg), etwas hellerer Verlaufston (bgGradientTo), Flächen (surface), die Akzentfarbe (accent) und eine etwas hellere Akzentvariante (accentSoft), Textfarbe (text), gedämpfter Text (textMuted), feine Linien (line), Häkchen-Farbe (check).
- voiceTone: der Tonfall in einem Satz. voicePrinciples: 4-6 konkrete, umsetzbare Copy-Leitplanken.
- adHookPattern: das Muster der ersten Anzeigenzeile (mit Platzhaltern). adBulletsLabel: das Label vor den Bullets. adCtaOptions: 2-3 CTA-Varianten, die in den Anzeigen vorkommen.
- emailFromName / emailFromRole / emailGreeting / emailCtaText: aus den Mails. emailStructure: 5-7 Schritte des Mail-Aufbaus.

BEISPIEL-MAILS:
"""
${mails.slice(0, 6000)}
"""

Antworte ausschließlich im vorgegebenen JSON-Schema.`;

  const text = await geminiJson({
    apiKey, models: MODELS, system, prompt,
    schema: learnedBrandJsonSchema, images, temperature: 0.3,
  });
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const r = zLearnedBrand.parse(JSON.parse(raw));

  // Gelerntes auf die Basis mergen (strukturelle Felder bleiben).
  return {
    ...base,
    palette: { ...base.palette, ...r.palette },
    voice: { ...base.voice, tone: r.voiceTone, principles: r.voicePrinciples },
    adCopyFormat: {
      ...base.adCopyFormat,
      hookPattern: r.adHookPattern,
      bulletsLabel: r.adBulletsLabel,
      ctaOptions: r.adCtaOptions,
    },
    emailFormat: {
      ...base.emailFormat,
      fromName: r.emailFromName,
      fromRole: r.emailFromRole,
      greeting: r.emailGreeting,
      ctaText: r.emailCtaText,
      structure: r.emailStructure,
    },
  };
}
