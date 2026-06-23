// Erzeugt neutrale Showcase-Creatives (Initialen statt Fotos) für die README.
import fs from "node:fs";
import { ImageResponse } from "@vercel/og";
import { renderCreativePng, DEFAULT_FORMAT } from "../lib/creative";
import type { AdCopy, Brand, CreativeDesign, Webinar } from "../lib/types";

const brand: Brand = JSON.parse(fs.readFileSync("brand/brand.json", "utf8"));
const webinar: Webinar = {
  title: "Volle Pipelines trotz IT-Markt-Krise",
  subtitle: "Wie du im KI-Zeitalter als Trusted Advisor herausstichst",
  format: "Live-Webinar", date: "08.05.2025", time: "12:00 Uhr",
  registrationUrl: "dein-webinar.com", audience: "Entscheider im B2B-/IT-Umfeld",
  host: { name: "Max Muster", role: "CEO Beispiel GmbH" },
  guest: { name: "Eva Demo", role: "Head of Marketing" },
  pains: [], coreProblem: "", coreMessage: "", solutionPoints: [], promise: [],
};
const ad: AdCopy = {
  angleId: "krise", variant: "headline",
  headline: "Volle Pipelines trotz IT-Markt-Krise", accentWord: "IT-Markt-Krise",
  subline: "Wie du im KI-Zeitalter als Trusted Advisor herausstichst.",
  proofStat: "", hook: "", body: "", bullets: [], cta: "Mehr ansehen",
};
const variants: { d: CreativeDesign; name: string }[] = [
  { d: { template: "bold" }, name: "bold" },
  { d: { template: "minimal", font: "Space Grotesk" }, name: "minimal" },
  { d: { template: "editorial", font: "Playfair Display" }, name: "editorial" },
];

async function main() {
  fs.mkdirSync("docs/screenshots", { recursive: true });
  for (const { d, name } of variants) {
    const png = await renderCreativePng(ImageResponse, ad, webinar, brand, DEFAULT_FORMAT, d);
    fs.writeFileSync(`docs/screenshots/creative-${name}.png`, png);
    console.log("wrote docs/screenshots/creative-" + name + ".png");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
