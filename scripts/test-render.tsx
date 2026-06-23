import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "@vercel/og";
import { DEFAULT_FORMAT, renderCreativePng } from "../lib/creative";
import type { AdCopy, Brand, CreativeDesign, Webinar } from "../lib/types";

const brand: Brand = JSON.parse(fs.readFileSync(path.join(process.cwd(), "brand/brand.json"), "utf8"));
const webinar: Webinar = JSON.parse(fs.readFileSync(path.join(process.cwd(), "inputs/webinar.json"), "utf8"));

const samples: AdCopy[] = [
  {
    angleId: "krise-als-weckruf", variant: "headline",
    headline: "Volle Pipelines trotz IT-Markt-Krise",
    accentWord: "IT-Markt-Krise",
    subline: "Wie du im KI-Zeitalter als Trusted Advisor herausstichst – statt im Lärm unterzugehen.",
    proofStat: "",
    hook: "Live: Warum 90% der IT-Unternehmen in der Leadgenerierung feststecken",
    body: "Mehr Aktivität löst das Problem nicht.", bullets: ["a", "b", "c", "d"], cta: "Mehr ansehen",
  },
  {
    angleId: "vertrauen-schlaegt-laerm", variant: "authority",
    headline: "Vertrauen schlägt Lärm",
    accentWord: "Vertrauen",
    subline: "Kunden kaufen nicht, weil du 3× täglich postest – sondern weil sie dir vertrauen.",
    proofStat: "",
    hook: "Live: Trusted Advisor statt Klicki-Bunti", body: "x", bullets: ["a", "b", "c", "d"], cta: "Jetzt kostenlos sichern",
  },
  {
    angleId: "planbarkeit-und-proof", variant: "proof",
    headline: "Jahresziel im Q1 geknackt",
    accentWord: "Q1",
    subline: "Nicht mehr Leads – ein besseres Setup. So wird Kundengewinnung planbar.",
    proofStat: "Jahresziel im Q1 übertroffen · 840k€ Auftragseingang",
    hook: "Live: Wie ein besseres Setup das Jahresziel im Q1 knackt", body: "x", bullets: ["a", "b", "c", "d"], cta: "Platz sichern",
  },
];

async function main() {
  const outDir = "/tmp/creative-test";
  fs.mkdirSync(outDir, { recursive: true });
  const designs: { d: CreativeDesign; name: string }[] = [
    { d: { template: "editorial", font: "Playfair Display" }, name: "font-playfair" },
    { d: { template: "bold", font: "Oswald" }, name: "font-oswald" },
    { d: { template: "minimal", font: "Space Grotesk" }, name: "font-spacegrotesk" },
  ];
  for (const { d, name } of designs) {
    const png = await renderCreativePng(ImageResponse, samples[0], webinar, brand, DEFAULT_FORMAT, d);
    const f = path.join(outDir, `${name}.png`);
    fs.writeFileSync(f, png);
    console.log("wrote", f, png.length, "bytes");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
