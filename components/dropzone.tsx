"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

// Wiederverwendbares Drag-&-Drop-Feld (zusätzlich klickbar).
export function Dropzone({
  accept,
  multiple = false,
  disabled = false,
  busy = false,
  title,
  hint,
  maxMB,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  title: string;
  hint?: string;
  maxMB?: number;
  onFiles: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");

  function handle(list: FileList | null) {
    if (!list || list.length === 0) return;
    let files = Array.from(list);
    if (maxMB) {
      const limit = maxMB * 1024 * 1024;
      const tooBig = files.filter((f) => f.size > limit);
      files = files.filter((f) => f.size <= limit);
      setErr(tooBig.length ? `${tooBig.length === 1 ? "Datei" : tooBig.length + " Dateien"} zu groß — max ${maxMB} MB pro Datei.` : "");
    }
    if (files.length) onFiles(files);
  }

  const blocked = disabled || busy;
  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={(e) => { e.preventDefault(); if (!blocked) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!blocked) handle(e.dataTransfer.files); }}
      onClick={() => !blocked && ref.current?.click()}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !blocked) { e.preventDefault(); ref.current?.click(); } }}
      className={`rounded-lg border-2 border-dashed p-6 text-center transition outline-none focus-visible:ring-2 focus-visible:ring-ring ${blocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${over ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"}`}
    >
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
      {busy
        ? <Loader2 className="h-6 w-6 mx-auto text-muted-foreground mb-1.5 animate-spin" />
        : <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />}
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      {maxMB && <p className="text-[11px] font-medium text-muted-foreground mt-1">max. {maxMB} MB pro Datei</p>}
      {err && <p className="text-[11px] text-destructive mt-1">{err}</p>}
    </div>
  );
}
