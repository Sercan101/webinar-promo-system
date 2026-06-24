// LLM-Schicht (Google Gemini, Free-Tier): leitet Angles ab und erzeugt Anzeigen-Copy + E-Mail.
// Gezielt eingesetzt: Marken-Beispiele als Anker, responseJsonSchema -> garantiert valides JSON,
// danach Zod-Pruefung. Kein "ChatGPT halt".
import type { z } from "zod";
import { geminiJson } from "./gemini";
import type { Angle, AdCopy, Brand, EmailInvite, Webinar } from "./types";
import {
  adsJsonSchema, anglesJsonSchema, anglesLabJsonSchema, emailJsonSchema,
  zAdsResult, zAdsAny, zAnglesResult, zAnglesLab, zEmail,
} from "./schema";

// Modell-Fallback-Kette (alle im Free-Tier). Bei Quota/Überlast auf das nächste Modell.
// gemini-2.0-flash wurde von Google abgeschaltet (404) → aktuelle Modelle + zukunftssicherer Alias.
export const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"];
export const MODEL = MODELS[0]; // Anzeige/Doku

// --- Echte Marken-Beispiele als Stil-Anker (aus dem Material-Paket) ---
const EXAMPLE_AD = `Live: Warum 90% der IT-Unternehmen in der Leadgenerierung feststecken – und wie dominierende Teams ihre Kundengewinnung jetzt neu aufsetzen.

Du erhältst:
✓ Trusted Advisor System für eine planbare Kundengewinnung (inkl. Best Practices aus +450 Skalierungsprojekten)
✓ Wie du mit 3 Formaten eine Kundenreise baust, mit der du dominierst und am ersten Touchpoint an Vertrauen gewinnst
✓ Wie du in 90 Tagen Marketing & Sales aufstellst, das Nachfragesog erzeugt (inkl. Roadmap)
✓ Wie du dein Portfolio so strukturierst, dass du nicht mehr vergleichbar bist und kontinuierlich Upsells generierst`;

const EXAMPLE_EMAIL = `Betreff: Die haben ihr Jahresziel im Q1 geknackt

Hi,
die meisten glauben, sie brauchen mehr Leads, damit Vertrieb endlich stabil läuft. Stimmt aber nicht. Ich sehe gerade eher das Gegenteil: Unternehmen mit genug Leads – aber trotzdem keine planbare Pipeline.

Ein Beispiel: Eine Digitalagentur, über 100 Mitarbeitende. Sales lief, Termine waren da. Aber es hat sich nie wirklich stabil angefühlt. Mal kam was rein, dann wieder nicht.

Was sie geändert haben, war kein zusätzlicher Kanal. Sondern das Setup. Ein bezahltes Vorprodukt, das nicht verkauft – sondern den Kunden zwingt, sauber durch seine Situation zu gehen. Durchgeführt von Consultants, nicht von Sales.

Ergebnis: Neukundenumsatz-Ziel für das Jahr im ersten Quartal übererfüllt. Nicht, weil sie besser verkaufen. Sondern weil ihr System anders aufgebaut ist.

📅 08. Mai | 12:00 Uhr
👉 Hier Platz sichern
Viele Grüße, Johannes`;

export function brandContext(brand: Brand): string {
  return `MARKE: ${brand.name} (${brand.url})
TONALITÄT: ${brand.voice.tone}
ANSPRACHE: ${brand.voice.address} (Deutsch)
LEITPLANKEN:
${brand.voice.principles.map((p) => `- ${p}`).join("\n")}

STIL-ANKER ANZEIGE (so klingen die echten Anzeigen):
"""
${EXAMPLE_AD}
"""

STIL-ANKER E-MAIL (so klingen die echten Mails):
"""
${EXAMPLE_EMAIL}
"""`;
}

export function webinarContext(w: Webinar): string {
  return `WEBINAR
Titel: ${w.title}
Subtitle: ${w.subtitle}
Format: ${w.format} | Termin: ${w.date}, ${w.time}
Host: ${w.host.name} (${w.host.role})${w.guest ? `\nGast: ${w.guest.name} (${w.guest.role})` : ""}
Zielgruppe: ${w.audience}

PAINS:
${w.pains.map((p) => `- ${p}`).join("\n")}
URPROBLEM: ${w.coreProblem}
KERNBOTSCHAFT/LÖSUNG: ${w.coreMessage}
LÖSUNGSBAUSTEINE:
${w.solutionPoints.map((p) => `- ${p}`).join("\n")}
ERGEBNIS-VERSPRECHEN:
${w.promise.map((p) => `- ${p}`).join("\n")}${
    w.proofCases?.length
      ? `\nPROOF/CASES:\n${w.proofCases.map((p) => `- ${p}`).join("\n")}`
      : ""
  }${w.freebie ? `\nSOFORT-MEHRWERT: ${w.freebie}` : ""}`;
}

// Generischer Helfer: strukturierte Ausgabe von Gemini holen + Zod-pruefen.
async function generateStructured<T>(
  apiKey: string,
  system: string,
  prompt: string,
  jsonSchema: object,
  zodSchema: z.ZodType<T>,
): Promise<T> {
  const text = await geminiJson({ apiKey, models: MODELS, system, prompt, schema: jsonSchema });
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Antwort war kein valides JSON:\n${raw.slice(0, 500)}`);
  }
  return zodSchema.parse(parsed); // wirft bei Schemabruch -> sichtbarer Fehler
}

export async function generateAngles(
  apiKey: string,
  brand: Brand,
  webinar: Webinar,
): Promise<Angle[]> {
  const system = `Du bist Performance-Marketer bei ${brand.name} und baust Webinar-Promos.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

AUFGABE: Leite GENAU 3 werbliche Angles für dieses Webinar ab.
Ein Angle = (adressierter Pain) + (Kernbotschaft) + (eine zentrale "Big Idea", die ein Asset tragen kann).
Die 3 Angles sollen sich klar unterscheiden und zusammen das Spektrum abdecken
(z.B. die akute Krise/Pipeline, der Trusted-Advisor-/Vertrauens-Hebel, und die planbaren Ergebnisse/Proof).

Pro Angle:
- id: kebab-case Slug (z.B. "krise-als-weckruf")
- name: kurzer, griffiger Angle-Titel
- painAddressed: welcher konkrete Pain adressiert wird
- coreMessage: die Kernbotschaft in einem Satz
- bigIdea: 1-2 Sätze, die zentrale Idee, aus der sich Headline und Copy ableiten lassen

Antworte ausschließlich im vorgegebenen JSON-Schema.`;

  const { angles } = await generateStructured(
    apiKey, system, prompt,anglesJsonSchema, zAnglesResult,
  );
  return angles;
}

// Angle-Lab: leitet mehr Angles ab und bewertet jede nach vorhergesagter "Ziehkraft".
export async function generateAngleLab(
  apiKey: string,
  brand: Brand,
  webinar: Webinar,
): Promise<Angle[]> {
  const system = `Du bist Senior Performance-Marketer bei ${brand.name} und hast ein scharfes Gespür dafür, welche Werbe-Angles wirklich ziehen.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

AUFGABE: Leite 6 unterschiedliche werbliche Angles für dieses Webinar ab und bewerte jede nach vorhergesagter ZIEHKRAFT.
Ein Angle = (adressierter Pain) + (Kernbotschaft) + (Big Idea).

Pro Angle:
- id: kebab-case Slug
- name: kurzer, griffiger Angle-Titel
- painAddressed: welcher konkrete Pain
- coreMessage: Kernbotschaft in einem Satz
- bigIdea: 1-2 Sätze, die zentrale Idee
- pullScore: 0-10 — wie stark dieser Angle die Zielgruppe stoppt & resoniert (Scroll-Stop, Relevanz, Dringlichkeit, Differenzierung). Sei ehrlich & differenziert, nicht alle 8+.
- pullReason: 1 Satz, warum dieser Score (was zieht / was schwächt).

Decke verschiedene Hebel ab (Krise/Dringlichkeit, Vertrauen/Autorität, konkrete Ergebnisse/Proof, Status/Vergleichbarkeit, Kontrarian/überraschend).
Antworte ausschließlich im JSON-Schema.`;

  const { angles } = await generateStructured(apiKey, system, prompt, anglesLabJsonSchema, zAnglesLab);
  return [...angles].sort((a, b) => (b.pullScore ?? 0) - (a.pullScore ?? 0));
}

export async function generateAds(
  apiKey: string,
  brand: Brand,
  webinar: Webinar,
  angles: Angle[],
): Promise<AdCopy[]> {
  const system = `Du bist Performance-Marketer & Copywriter bei ${brand.name}.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

ANGLES (von dir vorher abgeleitet):
${angles.map((a) => `- [${a.id}] ${a.name}: ${a.bigIdea} (Pain: ${a.painAddressed})`).join("\n")}

AUFGABE: Erzeuge GENAU 3 Anzeigen-Varianten, je eine pro "variant":
1) variant "headline"  -> baue auf den Krisen-/Pipeline-Angle. Headline-getrieben.
2) variant "authority" -> baue auf den Trusted-Advisor-/Vertrauens-Angle. Stellt Kompetenz/Speaker in den Fokus.
3) variant "proof"     -> baue auf den Ergebnis-/Proof-Angle. Enthält EINE harte Zahl/Aussage in "proofStat".

Pro Anzeige liefere:
- angleId: die passende Angle-id von oben
- variant: "headline" | "authority" | "proof"
- headline: fette Bild-Headline, max ${brand.creative.headlineMaxWords} Wörter, zugespitzt
- accentWord: EIN Wort oder kurze Phrase, die WORTWÖRTLICH in headline vorkommt (wird im Bild rot hervorgehoben)
- subline: eine Zeile unter der Headline, max ${brand.creative.sublineMaxChars} Zeichen
- proofStat: nur bei variant "proof" eine harte Zahl/Aussage (z.B. "Jahresziel im Q1 übertroffen"); sonst leerer String ""
- hook: erste Zeile des Anzeigentexts im Muster "${brand.adCopyFormat.hookPattern}"
- body: 1-2 Sätze Kontext (du-Ansprache)
- bullets: GENAU 4 Häkchen-Bullets ("${brand.adCopyFormat.bulletsLabel}"), je ein konkreter Nutzen, kurz
- cta: einer aus ${JSON.stringify(brand.adCopyFormat.ctaOptions)}

Wichtig: accentWord MUSS exakt als Teilstring in headline enthalten sein.
Antworte ausschließlich im vorgegebenen JSON-Schema.`;

  const { ads } = await generateStructured(
    apiKey, system, prompt,adsJsonSchema, zAdsResult,
  );
  return ads;
}

// A/B: erzeugt eine deutlich andere Variante einer einzelnen Anzeige.
export async function generateVariant(
  apiKey: string,
  brand: Brand,
  webinar: Webinar,
  ad: AdCopy,
): Promise<AdCopy> {
  const system = `Du bist Performance-Marketer & Copywriter bei ${brand.name}.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

Hier ist eine bestehende Anzeige (Variante A):
- angleId: ${ad.angleId} | variant: ${ad.variant}
- Headline: ${ad.headline} (Akzent: ${ad.accentWord})
- Subline: ${ad.subline}
- Hook: ${ad.hook}
- Bullets: ${ad.bullets.join(" | ")}
- CTA: ${ad.cta}

AUFGABE: Erzeuge GENAU 1 deutlich ANDERE Variante B für dieselbe Anzeige (neuer Blickwinkel,
andere Headline & Bullets, frischer Hook) — zum A/B-Testen. Behalte angleId="${ad.angleId}" und variant="${ad.variant}".
Halte die Format-Regeln ein: headline max ${brand.creative.headlineMaxWords} Wörter; accentWord MUSS wortwörtlich in headline vorkommen;
subline max ${brand.creative.sublineMaxChars} Zeichen; ${ad.variant === "proof" ? "proofStat mit harter Zahl" : 'proofStat = ""'}; GENAU 4 Bullets; cta aus ${JSON.stringify(brand.adCopyFormat.ctaOptions)}.
Antworte ausschließlich im JSON-Schema (Feld "ads" mit genau einer Anzeige).`;

  const { ads } = await generateStructured(apiKey, system, prompt, adsJsonSchema, zAdsAny);
  return ads[0];
}

export async function generateEmail(
  apiKey: string,
  brand: Brand,
  webinar: Webinar,
  angles: Angle[],
): Promise<EmailInvite> {
  const system = `Du bist ${brand.emailFormat.fromName}, ${brand.emailFormat.fromRole}, und schreibst die Webinar-Einladung.
${brandContext(brand)}`;

  const prompt = `${webinarContext(webinar)}

ANGLES:
${angles.map((a) => `- ${a.name}: ${a.coreMessage}`).join("\n")}

AUFGABE: Schreibe EINE E-Mail-Einladung zum Webinar, im Stil der echten Beispiel-Mails
(Problem-Agitate-Solve, erzählerisch, konkrete Beobachtung/Mini-Case, du-Ansprache, kein Hype).

Liefere:
- subject: zugespitzter Betreff, neugierig, ohne Clickbait-Lüge
- preheader: ein Satz, der die Spannung des Betreffs aufnimmt
- greeting: "${brand.emailFormat.greeting}"
- bodyParagraphs: 3-4 kurze Absätze (Story/Beobachtung -> warum mehr Aktivität nicht reicht -> Lösung/Setup)
- bullets: 3-4 Punkte "Im Webinar bekommst du:"
- dateLine: "📅 ${webinar.date} | ${webinar.time}"
- cta: kurzer Button-Text (z.B. "${brand.emailFormat.ctaText}")
- signature: "${brand.emailFormat.fromName}, ${brand.emailFormat.fromRole}"

Antworte ausschließlich im vorgegebenen JSON-Schema.`;

  return generateStructured(apiKey, system, prompt, emailJsonSchema, zEmail);
}
