/* eslint-disable @next/next/no-img-element */
// Design-Engine: rendert eine Anzeige (HTML/CSS) als PNG via Satori.
// Individualisierbar: 3 Vorlagen (bold/editorial/minimal), eigene Akzentfarbe,
// eigenes Logo, eigenes Hintergrundbild (mit Overlay -> bleibt on-brand, kein "Text auf Stock-Foto").
import fs from "node:fs";
import path from "node:path";
import type { AdCopy, Brand, CreativeDesign, Speaker, Webinar } from "./types";

type ImageResponseCtor = new (
  element: React.ReactElement,
  options: { width: number; height: number; fonts: typeof fonts },
) => { arrayBuffer(): Promise<ArrayBuffer> };

export interface Format {
  key: string; label: string; w: number; h: number; pad: number; headlineScale: number; gap: number;
}
export const FORMATS: Format[] = [
  { key: "1x1", label: "1:1 Feed", w: 1080, h: 1080, pad: 60, headlineScale: 0.82, gap: 22 },
  { key: "4x5", label: "4:5 Feed", w: 1080, h: 1350, pad: 72, headlineScale: 1.0, gap: 30 },
  { key: "9x16", label: "9:16 Story", w: 1080, h: 1920, pad: 100, headlineScale: 1.14, gap: 42 },
];
export const DEFAULT_FORMAT = FORMATS[1];
export const DEFAULT_DESIGN: CreativeDesign = { template: "bold" };

const ROOT = process.cwd();
const FONT_DIR = path.join(ROOT, "assets", "fonts");
const SPEAKER_DIR = path.join(ROOT, "assets", "speakers");

const font = (file: string) => fs.readFileSync(path.join(FONT_DIR, file));
const fonts = [
  { name: "Inter", data: font("Inter-Regular.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: font("Inter-Medium.ttf"), weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: font("Inter-SemiBold.ttf"), weight: 600 as const, style: "normal" as const },
  { name: "Inter", data: font("Inter-Bold.ttf"), weight: 700 as const, style: "normal" as const },
  { name: "Inter", data: font("Inter-ExtraBold.ttf"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: font("Inter-Black.ttf"), weight: 900 as const, style: "normal" as const },
  // Alternative Schriften (wählbar im Design-Editor)
  { name: "Space Grotesk", data: font("SpaceGrotesk-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "Space Grotesk", data: font("SpaceGrotesk-500.ttf"), weight: 500 as const, style: "normal" as const },
  { name: "Space Grotesk", data: font("SpaceGrotesk-700.ttf"), weight: 700 as const, style: "normal" as const },
  { name: "Playfair Display", data: font("Playfair-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "Playfair Display", data: font("Playfair-700.ttf"), weight: 700 as const, style: "normal" as const },
  { name: "Playfair Display", data: font("Playfair-900.ttf"), weight: 900 as const, style: "normal" as const },
  { name: "Oswald", data: font("Oswald-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "Oswald", data: font("Oswald-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: "Oswald", data: font("Oswald-700.ttf"), weight: 700 as const, style: "normal" as const },
];

// Im Design-Editor wählbare Schriften.
export const FONT_OPTIONS = ["Inter", "Space Grotesk", "Playfair Display", "Oswald"];

// Speaker-Foto: data-URI direkt nutzen, sonst aus assets/speakers/ laden.
function speakerDataUri(photo?: string): string | null {
  if (!photo) return null;
  if (photo.startsWith("data:")) return photo;
  const p = path.join(SPEAKER_DIR, photo);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).slice(1) || "png";
  return `data:image/${ext};base64,${fs.readFileSync(p).toString("base64")}`;
}

const initials = (name: string) => name.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

type Pal = Brand["palette"];

function Headline({ text, accent, size, pal }: { text: string; accent: string; size: number; pal: Pal }) {
  const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");
  const accentSet = new Set(accent.split(/\s+/).map(norm).filter(Boolean));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: "0.28em", rowGap: "0.02em", fontSize: size, fontWeight: 900, lineHeight: 1.04, letterSpacing: -1.5 }}>
      {text.split(/\s+/).map((w, i) => (
        <span key={i} style={{ color: accentSet.has(norm(w)) ? pal.accentSoft : pal.text }}>{w}</span>
      ))}
    </div>
  );
}

function Avatar({ speaker, size, pal }: { speaker: Speaker; size: number; pal: Pal }) {
  const uri = speakerDataUri(speaker.photo);
  return (
    <div style={{ display: "flex", width: size, height: size, borderRadius: size, border: `4px solid ${pal.accent}`, overflow: "hidden", background: pal.surface, alignItems: "center", justifyContent: "center" }}>
      {uri ? <img src={uri} width={size} height={size} style={{ objectFit: "cover" }} alt={speaker.name} />
        : <div style={{ display: "flex", fontSize: size * 0.36, fontWeight: 800, color: pal.text }}>{initials(speaker.name)}</div>}
    </div>
  );
}

function SpeakerRow({ speakers, pal, big }: { speakers: Speaker[]; pal: Pal; big?: boolean }) {
  const size = big ? 132 : 92;
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
      {speakers.map((s) => (
        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Avatar speaker={s} size={size} pal={pal} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: big ? 30 : 26, fontWeight: 800, color: pal.text }}>{s.name}</div>
            <div style={{ display: "flex", fontSize: big ? 22 : 19, fontWeight: 500, color: pal.textMuted }}>{s.role}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Logo({ design, pal, brand }: { design: CreativeDesign; pal: Pal; brand: Brand }) {
  if (design.logo) return <img src={design.logo} height={42} style={{ objectFit: "contain" }} alt="logo" />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", width: 18, height: 18, borderRadius: 4, background: pal.accent }} />
      <div style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: pal.text }}>{brand.logoText}</div>
    </div>
  );
}

export function CreativeElement({
  ad, webinar, brand, format = DEFAULT_FORMAT, design = DEFAULT_DESIGN,
}: { ad: AdCopy; webinar: Webinar; brand: Brand; format?: Format; design?: CreativeDesign }) {
  const accent = design.accent || brand.palette.accent;
  const pal: Pal = { ...brand.palette, accent, accentSoft: design.accent || brand.palette.accentSoft };
  const tpl = design.template;
  const speakers: Speaker[] = [webinar.host, ...(webinar.guest ? [webinar.guest] : [])];
  const headlineSize = Math.round((ad.headline.length > 34 ? 86 : 104) * format.headlineScale);
  const hasBg = !!design.bgImage;
  const dim = design.bgDim ?? 0.62;

  // Badge je Vorlage
  const badge =
    tpl === "editorial" ? (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", width: 40, height: 4, background: pal.accent }} />
        <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 3, color: pal.accentSoft }}>{brand.creative.badgeText}</div>
      </div>
    ) : tpl === "minimal" ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10, border: `2px solid ${pal.accent}`, padding: "9px 18px", borderRadius: 999 }}>
        <div style={{ display: "flex", width: 11, height: 11, borderRadius: 11, background: pal.accent }} />
        <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 2, color: pal.text }}>{brand.creative.badgeText}</div>
      </div>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: pal.accent, padding: "12px 22px", borderRadius: 999 }}>
        <div style={{ display: "flex", width: 14, height: 14, borderRadius: 14, background: "#fff" }} />
        <div style={{ display: "flex", fontSize: 24, fontWeight: 800, letterSpacing: 2, color: "#fff" }}>{brand.creative.badgeText}</div>
      </div>
    );

  // CTA je Vorlage
  const cta =
    tpl === "editorial" ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 800, color: pal.accentSoft }}>{ad.cta} →</div>
    ) : tpl === "minimal" ? (
      <div style={{ display: "flex", border: `2px solid ${pal.accent}`, color: pal.text, fontSize: 26, fontWeight: 800, padding: "16px 32px", borderRadius: 14 }}>{ad.cta}</div>
    ) : (
      <div style={{ display: "flex", background: pal.accent, color: "#fff", fontSize: 26, fontWeight: 800, padding: "18px 34px", borderRadius: 14 }}>{ad.cta}</div>
    );

  return (
    <div style={{ width: format.w, height: format.h, display: "flex", flexDirection: "column", position: "relative", fontFamily: design.font || "Inter", color: pal.text, padding: format.pad, backgroundColor: pal.bg }}>
      {/* Hintergrund */}
      {hasBg ? (
        <>
          <img src={design.bgImage} width={format.w} height={format.h} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} alt="bg" />
          <div style={{ position: "absolute", top: 0, left: 0, width: format.w, height: format.h, display: "flex", background: `linear-gradient(180deg, rgba(8,10,14,${dim * 0.65}) 0%, rgba(8,10,14,${dim}) 55%, rgba(8,10,14,${Math.min(dim + 0.18, 0.96)}) 100%)` }} />
        </>
      ) : (
        <div style={{ position: "absolute", top: 0, left: 0, width: format.w, height: format.h, display: "flex", background: `linear-gradient(150deg, ${pal.bg} 0%, ${pal.bgGradientTo} 100%)` }} />
      )}
      {/* Dekoration nur bei "bold" */}
      {tpl === "bold" && !hasBg && (
        <>
          <div style={{ display: "flex", position: "absolute", top: -260, right: -200, width: 720, height: 720, borderRadius: 720, background: pal.accent, opacity: 0.16 }} />
          <div style={{ display: "flex", position: "absolute", bottom: -320, left: -220, width: 760, height: 760, borderRadius: 760, background: "#2563EB", opacity: 0.1 }} />
        </>
      )}
      {tpl === "bold" && <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: pal.accent }} />}

      {/* Kopf */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
        <Logo design={design} pal={pal} brand={brand} />
        {badge}
      </div>
      {tpl === "editorial" && <div style={{ display: "flex", height: 2, background: pal.line, marginTop: 24, zIndex: 1 }} />}

      {/* Mitte */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: format.gap, zIndex: 1 }}>
        {ad.variant === "proof" && ad.proofStat ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14, alignSelf: "flex-start", border: `2px solid ${pal.accent}`, borderRadius: 999, padding: "12px 24px" }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 12, background: pal.accentSoft }} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: pal.text }}>{ad.proofStat}</div>
          </div>
        ) : null}
        {ad.variant === "authority" ? (
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 3, color: pal.textMuted }}>MIT DEN EXPERTEN</div>
        ) : null}

        <Headline text={ad.headline} accent={ad.accentWord} size={headlineSize} pal={pal} />
        {tpl === "editorial" && <div style={{ display: "flex", width: 120, height: 6, background: pal.accent }} />}

        <div style={{ display: "flex", fontSize: 34, fontWeight: 500, color: pal.textMuted, lineHeight: 1.25, maxWidth: 860 }}>{ad.subline}</div>

        {ad.variant === "authority" ? <div style={{ display: "flex", marginTop: 12 }}><SpeakerRow speakers={speakers} pal={pal} big /></div> : null}
      </div>

      {/* Fuss */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28, zIndex: 1 }}>
        {ad.variant !== "authority" ? <SpeakerRow speakers={speakers} pal={pal} /> : null}
        <div style={{ display: "flex", height: tpl === "editorial" ? 2 : 1, background: pal.line }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: pal.text }}>{brand.url}</div>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: pal.textMuted }}>{webinar.date} · {webinar.time}</div>
          </div>
          {cta}
        </div>
      </div>
    </div>
  );
}

export async function renderCreativePng(
  ImageResponse: ImageResponseCtor, ad: AdCopy, webinar: Webinar, brand: Brand,
  format: Format = DEFAULT_FORMAT, design: CreativeDesign = DEFAULT_DESIGN,
): Promise<Buffer> {
  const img = new ImageResponse(
    <CreativeElement ad={ad} webinar={webinar} brand={brand} format={format} design={design} />,
    { width: format.w, height: format.h, fonts },
  );
  return Buffer.from(await img.arrayBuffer());
}

export interface RenderedCreative {
  index: number; variant: string; angleId: string; formatKey: string; formatLabel: string; filename: string; dataUri: string;
}

export async function renderAdSet(
  ImageResponse: ImageResponseCtor, ads: AdCopy[], webinar: Webinar, brand: Brand, design: CreativeDesign = DEFAULT_DESIGN,
): Promise<RenderedCreative[]> {
  const out: RenderedCreative[] = [];
  for (let i = 0; i < ads.length; i++) {
    const ad = ads[i];
    for (const format of FORMATS) {
      const png = await renderCreativePng(ImageResponse, ad, webinar, brand, format, design);
      out.push({
        index: i, variant: ad.variant, angleId: ad.angleId,
        formatKey: format.key, formatLabel: format.label,
        filename: `anzeige-${i + 1}-${ad.variant}-${format.key}.png`,
        dataUri: `data:image/png;base64,${png.toString("base64")}`,
      });
    }
  }
  return out;
}
