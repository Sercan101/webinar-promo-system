"use client";

import { useRef } from "react";
import { Plus, X, Upload, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { readFileAsDataUri } from "@/lib/file";
import type { Speaker, Webinar } from "@/lib/types";

function Field({ label, hint, tip, children }: { label: string; hint?: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground"><Info className="h-3 w-3" /></button></TooltipTrigger>
            <TooltipContent className="max-w-56 text-xs">{tip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ListField({ label, hint, tip, value, onChange }: { label: string; hint?: string; tip?: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label={label} hint={hint} tip={tip}>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input value={item} onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ""])}><Plus className="h-3.5 w-3.5" /> Hinzufügen</Button>
      </div>
    </Field>
  );
}

function SpeakerFields({ label, speaker, onChange }: { label: string; speaker: Speaker; onChange: (s: Speaker) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isData = speaker.photo?.startsWith("data:");
  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input value={speaker.name} onChange={(e) => onChange({ ...speaker, name: e.target.value })} /></Field>
        <Field label="Rolle"><Input value={speaker.role} onChange={(e) => onChange({ ...speaker, role: e.target.value })} /></Field>
      </div>
      <div className="flex items-center gap-3">
        {isData
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={speaker.photo} alt="" className="h-10 w-10 rounded-full object-cover border border-border" />
          : <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">{speaker.name ? speaker.name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "—"}</div>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange({ ...speaker, photo: await readFileAsDataUri(f) }); }} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Foto hochladen</Button>
        {isData && <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...speaker, photo: undefined })}>Entfernen</Button>}
      </div>
    </div>
  );
}

export function WebinarForm({ webinar, onChange }: { webinar: Webinar; onChange: (w: Webinar) => void }) {
  const up = (patch: Partial<Webinar>) => onChange({ ...webinar, ...patch });
  const guest = webinar.guest ?? { name: "", role: "" };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Titel" tip="Die zentrale Aussage des Webinars — sie wird zur Headline der Anzeigen." hint="Die Hauptzeile des Webinars."><Input value={webinar.title} onChange={(e) => up({ title: e.target.value })} /></Field>
        <Field label="Untertitel"><Input value={webinar.subtitle} onChange={(e) => up({ subtitle: e.target.value })} /></Field>
        <Field label="Format" hint="z.B. Live-Webinar"><Input value={webinar.format} onChange={(e) => up({ format: e.target.value })} /></Field>
        <Field label="Zielgruppe"><Input value={webinar.audience} onChange={(e) => up({ audience: e.target.value })} /></Field>
        <Field label="Datum" hint="TT.MM.JJJJ"><Input value={webinar.date} onChange={(e) => up({ date: e.target.value })} /></Field>
        <Field label="Uhrzeit"><Input value={webinar.time} onChange={(e) => up({ time: e.target.value })} /></Field>
        <Field label="Anmelde-URL"><Input value={webinar.registrationUrl} onChange={(e) => up({ registrationUrl: e.target.value })} /></Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <SpeakerFields label="Host" speaker={webinar.host} onChange={(s) => up({ host: s })} />
        <SpeakerFields label="Gast (optional)" speaker={guest} onChange={(s) => up({ guest: s.name || s.role || s.photo ? s : undefined })} />
      </div>

      <Field label="Kernproblem" hint="Das Urproblem, das das Webinar adressiert."><Textarea value={webinar.coreProblem} onChange={(e) => up({ coreProblem: e.target.value })} className="min-h-16" /></Field>
      <Field label="Kernbotschaft / Lösung"><Textarea value={webinar.coreMessage} onChange={(e) => up({ coreMessage: e.target.value })} className="min-h-16" /></Field>

      <ListField label="Pains" tip="Die konkreten Probleme deiner Zielgruppe. Je präziser, desto besser die Angles." hint="Konkrete Schmerzpunkte der Zielgruppe." value={webinar.pains} onChange={(v) => up({ pains: v })} />
      <ListField label="Lösungsbausteine" tip="Was das Webinar inhaltlich liefert (z.B. die 3 Formate)." value={webinar.solutionPoints} onChange={(v) => up({ solutionPoints: v })} />
      <ListField label="Ergebnis-Versprechen" tip="Was der Teilnehmer am Ende erreicht." value={webinar.promise} onChange={(v) => up({ promise: v })} />
      <ListField label="Cases / Proof (optional)" tip="Konkrete Erfolge mit Zahlen — landen in der Proof-Anzeige." hint="Konkrete Erfolge mit Zahlen." value={webinar.proofCases ?? []} onChange={(v) => up({ proofCases: v.length ? v : undefined })} />
      <Field label="Sofort-Mehrwert / Freebie (optional)" tip="Ein Goodie, das im Webinar mitgegeben wird (z.B. ein Canvas/Template)."><Input value={webinar.freebie ?? ""} onChange={(e) => up({ freebie: e.target.value || undefined })} /></Field>
    </div>
    </TooltipProvider>
  );
}
