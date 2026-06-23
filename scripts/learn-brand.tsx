// Leitet das Brand-Kit aus assets/examples/ (Beispiel-Anzeigen + Mails) ab
// und speichert es als brand/brand.learned.json.
import fs from "node:fs";
import path from "node:path";
import { learnBrand } from "../lib/learn-brand";
import type { Brand } from "../lib/types";

async function main() {
  try { process.loadEnvFile(path.join(process.cwd(), ".env.local")); } catch { /* optional */ }
  if (!process.env.GEMINI_API_KEY) {
    console.error("✗ GEMINI_API_KEY fehlt. Lege .env.local an (siehe .env.example).");
    process.exit(1);
  }
  const base: Brand = JSON.parse(fs.readFileSync(path.join(process.cwd(), "brand/brand.json"), "utf8"));

  console.log("▶ Lerne Marke aus assets/examples/ (Beispiel-Anzeigen + Mails, Gemini-Vision) …");
  const learned = await learnBrand(process.env.GEMINI_API_KEY, base);

  const out = path.join(process.cwd(), "brand", "brand.learned.json");
  fs.writeFileSync(out, JSON.stringify(learned, null, 2));
  console.log("✓ Marke abgeleitet.");
  console.log("  Palette:", JSON.stringify(learned.palette));
  console.log("  Ton:", learned.voice.tone);
  console.log("  Gespeichert:", path.relative(process.cwd(), out));
}

main().catch((e) => { console.error("✗ Fehler:", e?.message ?? e); process.exit(1); });
