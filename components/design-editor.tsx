"use client";

import { useRef } from "react";
import { Upload, Check, Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/file";
import type { CreativeDesign, CreativeTemplate } from "@/lib/types";

const TEMPLATES: { key: CreativeTemplate; label: string; desc: string }[] = [
  { key: "bold", label: "Bold", desc: "Kräftig, Glows, gefüllte Buttons" },
  { key: "minimal", label: "Minimal", desc: "Clean, viel Weißraum, Outline" },
  { key: "editorial", label: "Editorial", desc: "Magazin-Look, feine Linien" },
];

const FONTS = [
  { value: "", label: "Inter — Standard (modern, neutral)" },
  { value: "Space Grotesk", label: "Space Grotesk (technisch, modern)" },
  { value: "Playfair Display", label: "Playfair (elegant, Serif)" },
  { value: "Oswald", label: "Oswald (schmal, plakativ)" },
];

const ELEMENTS: { key: "showLogo" | "showBadge" | "showSubline" | "showSpeakers" | "showCta"; label: string }[] = [
  { key: "showLogo", label: "Logo/Marke" },
  { key: "showBadge", label: "Badge" },
  { key: "showSubline", label: "Untertitel" },
  { key: "showSpeakers", label: "Speaker" },
  { key: "showCta", label: "CTA" },
];

function UploadRow({ label, hint, value, onChange, maxDim }: { label: string; hint: string; value?: string; onChange: (v?: string) => void; maxDim: number }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        {value
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={value} alt="" className="h-10 w-16 rounded object-cover border border-border bg-muted" />
          : <div className="h-10 w-16 rounded border border-dashed border-border" />}
        {/* Bild wird im Browser verkleinert & komprimiert, bevor es weitergegeben wird. */}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange(await compressImage(f, maxDim)); e.target.value = ""; }} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}><Upload className="h-3.5 w-3.5" /> Hochladen</Button>
        {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>Entfernen</Button>}
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function ColorRow({ label, value, fallback, onChange, hint }: { label: string; value?: string; fallback: string; onChange: (v?: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        <input type="color" value={value ?? fallback} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer" />
        <span className="text-xs text-muted-foreground font-mono">{value ?? "Marken-Standard"}</span>
        {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>Zurücksetzen</Button>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DesignEditor({ design, onChange }: { design: CreativeDesign; onChange: (d: CreativeDesign) => void }) {
  const up = (patch: Partial<CreativeDesign>) => onChange({ ...design, ...patch });
  return (
    <div className="space-y-5">
      {/* Vorlage */}
      <div className="space-y-1.5">
        <Label className="text-xs">Vorlage</Label>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => {
            const active = design.template === t.key;
            return (
              <button key={t.key} type="button" onClick={() => up({ template: t.key })}
                className={`rounded-lg border p-3 text-left transition ${active ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Farben — frei anpassbar */}
      <ColorRow label="Akzentfarbe" value={design.accent} fallback="#E11D2A" onChange={(v) => up({ accent: v })} hint="Färbt Badge, Linien, CTA & das hervorgehobene Headline-Wort." />
      <ColorRow label="Schriftfarbe (Text)" value={design.textColor} fallback="#FFFFFF" onChange={(v) => up({ textColor: v })} hint="Headline & Texte. Gefällt dir die Standardfarbe nicht — hier ändern." />
      <ColorRow label="Hintergrundfarbe" value={design.bgColor} fallback="#0B0F14" onChange={(v) => up({ bgColor: v })} hint={design.bgImage ? "Wirkt nur ohne Hintergrundbild." : "Einfarbiger Hintergrund der Anzeige."} />

      {/* Schrift */}
      <div className="space-y-1.5">
        <Label className="text-xs">Schrift</Label>
        <select value={design.font ?? ""} onChange={(e) => up({ font: e.target.value || undefined })}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          {FONTS.map((f) => <option key={f.value} value={f.value} className="bg-background">{f.label}</option>)}
        </select>
      </div>

      {/* Headline-Größe */}
      <div className="space-y-1.5">
        <Label className="text-xs">Headline-Größe ({Math.round((design.headlineScale ?? 1) * 100)}%)</Label>
        <input type="range" min={0.7} max={1.3} step={0.05} value={design.headlineScale ?? 1} onChange={(e) => up({ headlineScale: Number(e.target.value) })} className="w-full accent-primary" />
      </div>

      {/* Schrift-Helligkeit */}
      <div className="space-y-1.5">
        <Label className="text-xs">Schrift-Helligkeit ({Math.round((design.textOpacity ?? 1) * 100)}%)</Label>
        <input type="range" min={0.5} max={1} step={0.05} value={design.textOpacity ?? 1} onChange={(e) => up({ textOpacity: Number(e.target.value) })} className="w-full accent-primary" />
      </div>

      {/* Elemente ein-/ausblenden */}
      <div className="space-y-1.5">
        <Label className="text-xs">Elemente ein-/ausblenden</Label>
        <div className="flex flex-wrap gap-2">
          {ELEMENTS.map(({ key, label }) => {
            const on = design[key] !== false;
            return (
              <button key={key} type="button" onClick={() => up({ [key]: on ? false : undefined })}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>
                {on ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Uploads */}
      <UploadRow label="Eigenes Logo (optional)" hint="Ersetzt den Schriftzug oben in der Anzeige. Wird automatisch verkleinert." value={design.logo} onChange={(v) => up({ logo: v })} maxDim={600} />
      <UploadRow label="Eigener Hintergrund (optional)" hint="Wird abgedunkelt, damit der Text lesbar bleibt — kein 'Text auf Stock-Foto'. Wird automatisch komprimiert." value={design.bgImage} onChange={(v) => up({ bgImage: v })} maxDim={1600} />

      {design.bgImage && (
        <div className="space-y-1.5">
          <Label className="text-xs">Hintergrund abdunkeln ({Math.round((design.bgDim ?? 0.62) * 100)}%)</Label>
          <input type="range" min={0.2} max={0.95} step={0.05} value={design.bgDim ?? 0.62} onChange={(e) => up({ bgDim: Number(e.target.value) })} className="w-full accent-primary" />
        </div>
      )}
    </div>
  );
}
