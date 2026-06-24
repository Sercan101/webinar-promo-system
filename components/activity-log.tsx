"use client";

import { useState } from "react";
import { Activity, ChevronDown, Check, X, Loader2, Dot, ClipboardCopy } from "lucide-react";
import { Card } from "@/components/ui/card";

export type LogKind = "info" | "working" | "done" | "error";
export interface LogEntry { id: number; time: string; msg: string; kind: LogKind }

function KindIcon({ kind }: { kind: LogKind }) {
  if (kind === "working") return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
  if (kind === "done") return <Check className="h-3 w-3 text-green-600" />;
  if (kind === "error") return <X className="h-3 w-3 text-destructive" />;
  return <Dot className="h-3 w-3 text-muted-foreground" />;
}

// Persistente Anzeige: was gerade passiert + Verlauf + nächster Schritt (Guiding).
export function ActivityLog({ entries, nextStep, busy, onExport }: { entries: LogEntry[]; nextStep: string; busy: boolean; onExport?: () => void }) {
  const [open, setOpen] = useState(true);
  const last = entries[entries.length - 1];

  return (
    <div className="fixed left-4 bottom-[4.75rem] z-40 w-[300px] max-w-[calc(100vw-2rem)]">
      {open ? (
        <Card className="shadow-xl py-0 gap-0 overflow-hidden">
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Activity className="h-3.5 w-3.5 text-primary" />}
              Aktivität &amp; Guide
            </span>
            <span className="flex items-center gap-1">
              {onExport && <button onClick={onExport} title="Support-Log kopieren" className="text-muted-foreground hover:text-foreground p-0.5"><ClipboardCopy className="h-3.5 w-3.5" /></button>}
              <button onClick={() => setOpen(false)} title="Einklappen" className="text-muted-foreground hover:text-foreground p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
            </span>
          </div>
          <div className="px-3 py-2 border-b border-border bg-primary/5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nächster Schritt</p>
            <p className="text-xs mt-0.5 leading-snug">{nextStep}</p>
          </div>
          <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-1">
            {entries.length === 0
              ? <p className="text-[11px] text-muted-foreground">Noch keine Aktivität — leg los: Webinar eingeben.</p>
              : entries.slice(-10).map((e) => (
                <div key={e.id} className="flex items-start gap-1.5 text-[11px] leading-snug">
                  <span className="mt-[2px] shrink-0"><KindIcon kind={e.kind} /></span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{e.time}</span>
                  <span className={e.kind === "error" ? "text-destructive" : "text-foreground"}>{e.msg}</span>
                </div>
              ))}
          </div>
        </Card>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full border border-border bg-background/90 backdrop-blur px-3 py-1.5 shadow-lg text-xs max-w-full">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" /> : <Activity className="h-3.5 w-3.5 text-primary shrink-0" />}
          <span className="truncate">{busy && last ? last.msg : "Aktivität & Guide"}</span>
        </button>
      )}
    </div>
  );
}
