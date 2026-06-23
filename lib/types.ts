// Zentrale Typen fuer das Webinar-Promo-System.
// Input (Webinar) und Logik sind bewusst getrennt: nur `Webinar` wird pro Lauf getauscht.

export interface Speaker {
  name: string;
  role: string;
  photo?: string; // Dateiname in assets/speakers/ (optional -> Initialen-Fallback)
}

export interface Webinar {
  title: string;
  subtitle: string;
  format: string;
  date: string;
  time: string;
  registrationUrl: string;
  audience: string;
  host: Speaker;
  guest?: Speaker;
  pains: string[];
  coreProblem: string;
  coreMessage: string;
  solutionPoints: string[];
  freebie?: string;
  promise: string[];
  proofCases?: string[];
}

export interface Brand {
  name: string;
  url: string;
  logoText: string;
  palette: {
    bg: string;
    bgGradientTo: string;
    surface: string;
    accent: string;
    accentSoft: string;
    text: string;
    textMuted: string;
    line: string;
    check: string;
  };
  fonts: { display: string; body: string };
  voice: {
    language: string;
    address: string;
    tone: string;
    principles: string[];
  };
  adCopyFormat: {
    hookPattern: string;
    bulletsLabel: string;
    bulletCount: number;
    bulletStyle: string;
    ctaOptions: string[];
  };
  creative: {
    badgeText: string;
    footerCtaText: string;
    sublineMaxChars: number;
    headlineMaxWords: number;
  };
  emailFormat: {
    fromName: string;
    fromRole: string;
    greeting: string;
    structure: string[];
    ctaText: string;
  };
}

// ---- Vom LLM erzeugte, strukturierte & gepruefte Outputs ----

export interface Angle {
  id: string; // kebab-case slug, z.B. "krise-als-weckruf"
  name: string; // kurzer Angle-Titel
  painAddressed: string; // welcher Pain adressiert wird
  coreMessage: string; // Kernbotschaft dieses Angles
  bigIdea: string; // 1-2 Saetze: die zentrale Idee, die das Asset traegt
  pullScore?: number; // Angle-Lab: vorhergesagte "Ziehkraft" 0-10
  pullReason?: string; // Angle-Lab: Begruendung der Bewertung
}

// Eine Variante fuer das Creative-Layout. Jede Anzeige nutzt eine.
export type CreativeVariant = "headline" | "authority" | "proof";

// Individualisierung der Creatives (eigene Bilder, Akzent, Vorlage).
export type CreativeTemplate = "bold" | "editorial" | "minimal";
export interface CreativeDesign {
  template: CreativeTemplate;
  accent?: string; // ueberschreibt die Marken-Akzentfarbe
  textColor?: string; // ueberschreibt die Schrift-/Textfarbe
  bgColor?: string; // ueberschreibt die Hintergrundfarbe (wenn kein Hintergrundbild)
  bgImage?: string; // data-URI: eigenes Hintergrundbild
  bgDim?: number; // 0..1 Abdunkelung des Hintergrundbilds (Lesbarkeit)
  logo?: string; // data-URI: eigenes Logo
  font?: string; // Schrift-Familie (z.B. "Oswald"); leer = Inter
}

export interface AdCopy {
  angleId: string;
  variant: CreativeVariant;
  // Fuer das Creative (Bild):
  headline: string; // fette Hauptzeile, kurz
  accentWord: string; // EIN Wort/kurze Phrase aus der Headline, das rot hervorgehoben wird
  subline: string; // eine Zeile unter der Headline
  proofStat?: string; // nur fuer variant "proof": eine harte Zahl/Aussage
  // Fuer den Anzeigentext (Caption):
  hook: string; // erste Zeile, zugespitzt
  body: string; // 1-2 Saetze Kontext
  bullets: string[]; // 4 Haekchen-Bullets
  cta: string; // Call to action
}

export interface EmailInvite {
  subject: string;
  preheader: string;
  greeting: string;
  bodyParagraphs: string[]; // Story -> Agitation -> Loesung
  bullets: string[]; // was man im Webinar bekommt
  dateLine: string; // z.B. "📅 08.05.2025 | 12:00 Uhr"
  cta: string;
  signature: string; // Name + Rolle
}

// ---- Qualitäts-Loop (Self-Critique) ----

export type Verdict = "ok" | "revise";

export interface AssetCritique {
  label: string; // z.B. "Anzeige 1 (headline)" / "E-Mail" — serverseitig gesetzt
  score: number; // 0-10
  verdict: Verdict;
  issues: string[];
  strengths: string[];
}

export interface BundleCritique {
  ads: AssetCritique[];
  email: AssetCritique;
}

export interface QAReport {
  threshold: number; // Schwelle, ab der nachgebessert wird
  before: BundleCritique; // Bewertung vor Nachbesserung
  after?: BundleCritique; // Bewertung nach Nachbesserung (nur wenn revidiert)
  revised: string[]; // welche Assets nachgebessert wurden, z.B. ["Anzeige 2", "E-Mail"]
}

// ---- Posting-Plan / Content-Kalender (inkl. kanal-spezifischer Captions) ----

export interface PlanEntry {
  daysBeforeWebinar: number; // 0 = am Webinar-Tag
  date: string; // wird serverseitig aus Webinar-Datum berechnet (DD.MM.YYYY)
  channel: string; // LinkedIn | Instagram | X | Facebook | E-Mail
  assetIndex: number; // welche Anzeige (0-basiert); -1 = E-Mail
  assetLabel: string; // z.B. "Anzeige 2 (authority)" / "E-Mail-Einladung"
  format: string; // empfohlenes Format (1x1 / 4x5 / 9x16 / —)
  caption: string; // kanal-spezifisch zugeschnittene Caption
  rationale: string; // warum dieser Slot
}

export interface PostingPlan {
  entries: PlanEntry[];
}

export interface PromoBundle {
  webinarTitle: string;
  cycleSlug: string;
  angles: Angle[];
  ads: AdCopy[];
  email: EmailInvite;
  qa?: QAReport;
  generatedWith: string; // Modell
}
