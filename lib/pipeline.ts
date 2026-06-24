// Orchestrierung: Webinar (Input) + Brand (Logik) -> geprüfter PromoBundle.
// Klar getrennt: nur `webinar` ändert sich pro Lauf, alles andere bleibt.
import { generateAds, generateAngles, generateEmail, MODEL } from "./generate";
import { critiqueAssets, improveAds, improveEmail } from "./critique";
import type { Angle, BundleCritique, PromoBundle, Brand, QAReport, Webinar } from "./types";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function runPipeline(
  brand: Brand,
  webinar: Webinar,
  apiKey?: string,
  preselectedAngles?: Angle[],
  opts?: { qa?: boolean },
): Promise<PromoBundle> {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY fehlt.");
  const runQa = opts?.qa !== false; // QA-Schleife standardmäßig an; im Einfach-Modus abschaltbar.

  // 1) Angles: entweder die im Angle-Lab ausgewählten, sonst frisch ableiten.
  const angles = preselectedAngles && preselectedAngles.length >= 2
    ? preselectedAngles
    : await generateAngles(key, brand, webinar);

  // 2) Assets entlang der Angles erzeugen (parallel)
  const generated = await Promise.all([
    generateAds(key, brand, webinar, angles),
    generateEmail(key, brand, webinar, angles),
  ]);
  const ads = generated[0];
  let email = generated[1];

  // 3) Qualitäts-Loop (optional): bewerten -> schwache Assets nachbessern -> erneut bewerten.
  // Im Einfach-Modus übersprungen → ~3 Aufrufe weniger, schneller, weniger Rate-Limit.
  let qa: QAReport | undefined;
  if (runQa) {
    const THRESHOLD = 7;
    const before = await critiqueAssets(key, brand, webinar, ads, email);
    const revised: string[] = [];

    const weakAds = before.ads
      .map((critique, i) => ({ critique, i }))
      .filter((x) => x.critique.score < THRESHOLD);
    const weakAdIdx = new Set(weakAds.map((w) => w.i));
    if (weakAds.length > 0) {
      const improved = await improveAds(
        key, brand, webinar, angles,
        weakAds.map((w) => ({ ad: ads[w.i], critique: w.critique })),
      );
      weakAds.forEach((w, k) => {
        ads[w.i] = improved[k];
        revised.push(`Anzeige ${w.i + 1}`);
      });
    }
    const emailRevised = before.email.score < THRESHOLD;
    if (emailRevised) {
      email = await improveEmail(key, brand, webinar, email, before.email);
      revised.push("E-Mail");
    }

    let after: BundleCritique | undefined;
    if (revised.length > 0) {
      const recrit = await critiqueAssets(key, brand, webinar, ads, email);
      after = {
        ads: recrit.ads.map((c, i) => (weakAdIdx.has(i) ? c : before.ads[i])),
        email: emailRevised ? recrit.email : before.email,
      };
    }
    qa = { threshold: THRESHOLD, before, after, revised };
  }

  return {
    webinarTitle: webinar.title,
    cycleSlug: slugify(webinar.title),
    angles,
    ads,
    email,
    qa,
    generatedWith: MODEL,
  };
}
