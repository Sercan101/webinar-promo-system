// JSON-Schemas (fuer Gemini responseSchema -> garantiert valides JSON)
// + Zod-Schemas (fuer Laufzeit-Pruefung nach dem Parsen).
// Zwei kleine Definitionen, damit der Output strukturiert UND geprueft ist.
import { z } from "zod";

// ---------- JSON Schemas (an die API) ----------
// Strukturierte Ausgaben verlangen additionalProperties:false und alle Felder in required.

const str = { type: "string" } as const;

export const anglesJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    angles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: str,
          name: str,
          painAddressed: str,
          coreMessage: str,
          bigIdea: str,
        },
        required: ["id", "name", "painAddressed", "coreMessage", "bigIdea"],
      },
    },
  },
  required: ["angles"],
} as const;

// Angle-Lab: mehr Angles, jede mit Ziehkraft-Score + Begründung.
export const anglesLabJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    angles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: str, name: str, painAddressed: str, coreMessage: str, bigIdea: str,
          pullScore: { type: "integer" },
          pullReason: str,
        },
        required: ["id", "name", "painAddressed", "coreMessage", "bigIdea", "pullScore", "pullReason"],
      },
    },
  },
  required: ["angles"],
} as const;

export const adsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          angleId: str,
          variant: { type: "string", enum: ["headline", "authority", "proof"] },
          headline: str,
          accentWord: str,
          subline: str,
          proofStat: str,
          hook: str,
          body: str,
          bullets: { type: "array", items: str },
          cta: str,
        },
        required: [
          "angleId", "variant", "headline", "accentWord", "subline",
          "proofStat", "hook", "body", "bullets", "cta",
        ],
      },
    },
  },
  required: ["ads"],
} as const;

// Critique: bewertet alle Anzeigen + die E-Mail in einem Call.
const critiqueItem = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer" },
    verdict: { type: "string", enum: ["ok", "revise"] },
    issues: { type: "array", items: str },
    strengths: { type: "array", items: str },
  },
  required: ["score", "verdict", "issues", "strengths"],
} as const;

export const critiqueJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ads: { type: "array", items: critiqueItem },
    email: critiqueItem,
  },
  required: ["ads", "email"],
} as const;

export const emailJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: str,
    preheader: str,
    greeting: str,
    bodyParagraphs: { type: "array", items: str },
    bullets: { type: "array", items: str },
    dateLine: str,
    cta: str,
    signature: str,
  },
  required: [
    "subject", "preheader", "greeting", "bodyParagraphs",
    "bullets", "dateLine", "cta", "signature",
  ],
} as const;

// Auto-Brand-Learning: die aus den Beispielen ABLEITBAREN Teile (Rest bleibt strukturell).
export const learnedBrandJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    palette: {
      type: "object",
      additionalProperties: false,
      properties: {
        bg: str, bgGradientTo: str, surface: str, accent: str, accentSoft: str,
        text: str, textMuted: str, line: str, check: str,
      },
      required: ["bg", "bgGradientTo", "surface", "accent", "accentSoft", "text", "textMuted", "line", "check"],
    },
    voiceTone: str,
    voicePrinciples: { type: "array", items: str },
    adHookPattern: str,
    adBulletsLabel: str,
    adCtaOptions: { type: "array", items: str },
    emailFromName: str,
    emailFromRole: str,
    emailGreeting: str,
    emailCtaText: str,
    emailStructure: { type: "array", items: str },
  },
  required: [
    "palette", "voiceTone", "voicePrinciples", "adHookPattern", "adBulletsLabel",
    "adCtaOptions", "emailFromName", "emailFromRole", "emailGreeting", "emailCtaText", "emailStructure",
  ],
} as const;

// Webinar-Extraktion aus Transkript/URL.
const speakerSchema = {
  type: "object",
  additionalProperties: false,
  properties: { name: str, role: str },
  required: ["name", "role"],
} as const;

export const webinarExtractJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: str, subtitle: str, format: str, date: str, time: str,
    registrationUrl: str, audience: str,
    host: speakerSchema,
    guest: speakerSchema,
    pains: { type: "array", items: str },
    coreProblem: str,
    coreMessage: str,
    solutionPoints: { type: "array", items: str },
    freebie: str,
    promise: { type: "array", items: str },
    proofCases: { type: "array", items: str },
  },
  // guest/freebie/proofCases sind optional:
  required: [
    "title", "subtitle", "format", "date", "time", "registrationUrl", "audience",
    "host", "pains", "coreProblem", "coreMessage", "solutionPoints", "promise",
  ],
} as const;

// ---------- Zod Schemas (Laufzeit-Pruefung) ----------

export const zAngle = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  painAddressed: z.string().min(1),
  coreMessage: z.string().min(1),
  bigIdea: z.string().min(1),
});

export const zAnglesResult = z.object({
  angles: z.array(zAngle).min(2).max(3),
});

export const zAnglesLab = z.object({
  angles: z.array(zAngle.extend({
    pullScore: z.number().int().min(0).max(10),
    pullReason: z.string().min(1),
  })).min(3),
});

// Führende Aufzählungszeichen (✓ ✔ • · - – —) entfernen — das Häkchen setzt das Layout, nicht der Text.
const cleanBullet = z
  .string()
  .min(1)
  .transform((s) => s.replace(/^[\s✓✔•·‣▪◦\-–—]+/, "").trim());

export const zAdCopy = z.object({
  angleId: z.string().min(1),
  variant: z.enum(["headline", "authority", "proof"]),
  headline: z.string().min(1),
  accentWord: z.string().min(1),
  subline: z.string().min(1),
  proofStat: z.string(),
  hook: z.string().min(1),
  body: z.string().min(1),
  bullets: z.array(cleanBullet).min(3).max(5),
  cta: z.string().min(1),
});

export const zAdsResult = z.object({
  ads: z.array(zAdCopy).min(3).max(3),
});

// Für die Nachbesserung: variable Anzahl (nur die schwachen Anzeigen).
export const zAdsAny = z.object({
  ads: z.array(zAdCopy).min(1),
});

const zCritiqueItem = z.object({
  score: z.number().int().min(0).max(10),
  verdict: z.enum(["ok", "revise"]),
  issues: z.array(z.string()),
  strengths: z.array(z.string()),
});

export const zCritique = z.object({
  ads: z.array(zCritiqueItem).min(1),
  email: zCritiqueItem,
});

const hex = z.string().regex(/^#?[0-9a-fA-F]{6}$/).transform((s) => (s.startsWith("#") ? s : `#${s}`));

export const zLearnedBrand = z.object({
  palette: z.object({
    bg: hex, bgGradientTo: hex, surface: hex, accent: hex, accentSoft: hex,
    text: hex, textMuted: hex, line: hex, check: hex,
  }),
  voiceTone: z.string().min(1),
  voicePrinciples: z.array(z.string().min(1)).min(2),
  adHookPattern: z.string().min(1),
  adBulletsLabel: z.string().min(1),
  adCtaOptions: z.array(z.string().min(1)).min(1),
  emailFromName: z.string().min(1),
  emailFromRole: z.string().min(1),
  emailGreeting: z.string().min(1),
  emailCtaText: z.string().min(1),
  emailStructure: z.array(z.string().min(1)).min(2),
});

// Posting-Plan: KI plant die Sequenz; konkrete Daten rechnet der Server.
export const planJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          daysBeforeWebinar: { type: "integer" },
          channel: { type: "string", enum: ["LinkedIn", "Instagram", "X", "Facebook", "E-Mail"] },
          assetIndex: { type: "integer" },
          format: { type: "string", enum: ["1x1", "4x5", "9x16", "—"] },
          caption: str,
          rationale: str,
        },
        required: ["daysBeforeWebinar", "channel", "assetIndex", "format", "caption", "rationale"],
      },
    },
  },
  required: ["entries"],
} as const;

export const zPlan = z.object({
  entries: z.array(z.object({
    daysBeforeWebinar: z.number().int().min(0).max(60),
    channel: z.string().min(1),
    assetIndex: z.number().int().min(-1).max(10),
    format: z.string().min(1),
    caption: z.string().min(1),
    rationale: z.string().min(1),
  })).min(1),
});

const zSpeakerLoose = z.object({ name: z.string(), role: z.string() });

export const zWebinarExtract = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  format: z.string(),
  date: z.string(),
  time: z.string(),
  registrationUrl: z.string(),
  audience: z.string(),
  host: zSpeakerLoose,
  guest: zSpeakerLoose.optional(),
  pains: z.array(z.string()),
  coreProblem: z.string(),
  coreMessage: z.string(),
  solutionPoints: z.array(z.string()),
  freebie: z.string().optional(),
  promise: z.array(z.string()),
  proofCases: z.array(z.string()).optional(),
});

export const zEmail = z.object({
  subject: z.string().min(1),
  preheader: z.string().min(1),
  greeting: z.string().min(1),
  bodyParagraphs: z.array(z.string().min(1)).min(2),
  bullets: z.array(cleanBullet).min(3).max(5),
  dateLine: z.string().min(1),
  cta: z.string().min(1),
  signature: z.string().min(1),
});
