// Auto-Brand-Learning: leitet das Brand-Kit aus den Beispiel-Anzeigen (Vision) + Mails ab.
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { learnBrand } from "@/lib/learn-brand";
import type { Brand } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist nicht gesetzt." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const images: { data: string; mimeType: string }[] | undefined = body?.images;
    const mails: string | undefined = body?.mails;
    const base: Brand = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "brand", "brand.json"), "utf8"),
    );
    const brand = await learnBrand(process.env.GEMINI_API_KEY, base, { images, mails });
    return NextResponse.json({ brand });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/learn-brand] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
