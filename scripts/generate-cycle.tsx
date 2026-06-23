// Erzeugt einen kompletten Promo-Zyklus für das in inputs/webinar.json definierte Webinar
// und legt ihn in der vorgegebenen Ordnerstruktur ab:
//   /Zyklus_<webinar>/01_Angles 02_Ad-Copies 03_Creatives 04_Mailing 05_System-Doku
//
// Wiederverwendbar: nur inputs/webinar.json tauschen, dann `npm run generate`.
import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "@vercel/og";
import { runPipeline, slugify } from "../lib/pipeline";
import { FORMATS, renderCreativePng } from "../lib/creative";
import { adToMarkdown, anglesToMarkdown, emailToHtml, emailToMarkdown, qaToMarkdown } from "../lib/format";
import type { Brand, Webinar } from "../lib/types";

const ROOT = process.cwd();

function load<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;
}

async function main() {
  // .env.local laden (Node 21+: loadEnvFile)
  try { process.loadEnvFile(path.join(ROOT, ".env.local")); } catch { /* optional */ }
  if (!process.env.GEMINI_API_KEY) {
    console.error("✗ GEMINI_API_KEY fehlt. Lege .env.local an (siehe .env.example).");
    process.exit(1);
  }

  const brand = load<Brand>("brand/brand.json");
  const webinar = load<Webinar>("inputs/webinar.json");

  console.log(`▶ Generiere Promo-Zyklus für: "${webinar.title}"`);
  console.log("  · Angles ableiten + Anzeigen-Copy + E-Mail (Gemini) …");
  const bundle = await runPipeline(brand, webinar);
  console.log(`  ✓ ${bundle.angles.length} Angles, ${bundle.ads.length} Anzeigen, 1 E-Mail`);
  if (bundle.qa) {
    const ø = [...bundle.qa.before.ads, bundle.qa.before.email];
    const avgBefore = (ø.reduce((s, c) => s + c.score, 0) / ø.length).toFixed(1);
    console.log(`  ✓ Qualitäts-Loop: Ø ${avgBefore}/10 vor Check · nachgebessert: ${bundle.qa.revised.length ? bundle.qa.revised.join(", ") : "nichts"}`);
  }

  const cycleDir = path.join(ROOT, "output", `Zyklus_${slugify(webinar.title)}`);
  const dirs = {
    angles: path.join(cycleDir, "01_Angles"),
    ads: path.join(cycleDir, "02_Ad-Copies"),
    creatives: path.join(cycleDir, "03_Creatives"),
    mailing: path.join(cycleDir, "04_Mailing"),
    doku: path.join(cycleDir, "05_System-Doku"),
  };
  // Frischer Zyklus-Ordner
  fs.rmSync(cycleDir, { recursive: true, force: true });
  Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));

  // 01_Angles
  fs.writeFileSync(path.join(dirs.angles, "angles.md"), anglesToMarkdown(bundle.angles, webinar));
  fs.writeFileSync(path.join(dirs.angles, "angles.json"), JSON.stringify(bundle.angles, null, 2));

  // 02_Ad-Copies + 03_Creatives
  console.log(`  · Creatives rendern (HTML/CSS -> PNG, ${FORMATS.length} Formate/Anzeige) …`);
  for (let i = 0; i < bundle.ads.length; i++) {
    const ad = bundle.ads[i];
    fs.writeFileSync(path.join(dirs.ads, `anzeige-${i + 1}-${ad.variant}.md`), adToMarkdown(ad, i));
    const adDir = path.join(dirs.creatives, `anzeige-${i + 1}-${ad.variant}`);
    fs.mkdirSync(adDir, { recursive: true });
    for (const format of FORMATS) {
      const png = await renderCreativePng(ImageResponse, ad, webinar, brand, format);
      fs.writeFileSync(path.join(adDir, `${format.key}.png`), png);
    }
    console.log(`    ✓ Anzeige ${i + 1} (${ad.variant}) — ${FORMATS.map((f) => f.key).join(", ")}`);
  }
  fs.writeFileSync(path.join(dirs.ads, "ads.json"), JSON.stringify(bundle.ads, null, 2));

  // 04_Mailing
  fs.writeFileSync(path.join(dirs.mailing, "einladung.md"), emailToMarkdown(bundle.email));
  fs.writeFileSync(path.join(dirs.mailing, "einladung.html"), emailToHtml(bundle.email, brand.palette.accent));
  fs.writeFileSync(path.join(dirs.mailing, "einladung.json"), JSON.stringify(bundle.email, null, 2));

  // 05_System-Doku
  if (bundle.qa) {
    fs.writeFileSync(path.join(dirs.doku, "qualitaets-report.md"), qaToMarkdown(bundle.qa));
  }
  fs.writeFileSync(path.join(dirs.doku, "bundle.json"), JSON.stringify(bundle, null, 2));
  fs.copyFileSync(path.join(ROOT, "inputs/webinar.json"), path.join(dirs.doku, "input-webinar.json"));
  fs.writeFileSync(
    path.join(dirs.doku, "README.md"),
    [
      `# Zyklus: ${webinar.title}`,
      "",
      `Erzeugt mit dem Webinar-Promo-System (${bundle.generatedWith}).`,
      "",
      "## Inhalt",
      "- `01_Angles/` — die abgeleiteten Angles (md + json)",
      "- `02_Ad-Copies/` — 3 Anzeigentexte (md) + ads.json",
      "- `03_Creatives/` — 3 gerenderte Anzeigen-Bilder (PNG, 1080×1350)",
      "- `04_Mailing/` — E-Mail-Einladung als md, html und json",
      "- `05_System-Doku/` — dieser Bundle-Export + verwendeter Webinar-Input",
      "",
      "## Wiederverwenden",
      "`inputs/webinar.json` ersetzen → `npm run generate` → neuer Zyklus, gleicher Output-Satz.",
      "",
    ].join("\n"),
  );

  console.log(`\n✓ Fertig. Zyklus liegt in: ${path.relative(ROOT, cycleDir)}/`);
}

main().catch((e) => { console.error("\n✗ Fehler:", e?.message ?? e); process.exit(1); });
