"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles, FileText, Wand2, Calendar, Send, Download, History as HistoryIcon,
  LogOut, Loader2, Palette, MessageSquare, Webhook, RotateCcw, Trash2, ChevronRight, Paintbrush, Info, HelpCircle, Copy, FilePlus2, Eraser,
  ThumbsUp, MessageCircle, Share2, Gauge, ListChecks, Code2, Rocket, Check, Command as CommandIcon, Moon, Sun, X,
} from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import "driver.js/dist/driver.css";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal, gridParent, gridChild } from "@/components/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { readFileAsDataUri, compressImage } from "@/lib/file";
import { Dropzone } from "@/components/dropzone";
import { ActivityLog, type LogEntry } from "@/components/activity-log";
import defaultWebinar from "@/inputs/webinar.json";
import {
  adToMarkdown, anglesToMarkdown, emailToHtml, emailToMarkdown,
  planToCsv, planToIcs, planToMarkdown,
} from "@/lib/format";
import type { AdCopy, Angle, AssetCritique, Brand, CreativeDesign, PostingPlan, PromoBundle, Webinar } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { WebinarForm } from "@/components/webinar-form";
import { DesignEditor } from "@/components/design-editor";

interface Creative { index: number; variant: string; angleId: string; formatKey: string; formatLabel: string; filename: string; dataUri: string; }
interface ApiResult { bundle: PromoBundle; creatives: Creative[]; }
interface HistoryEntry { id: string; savedAt: number; title: string; bundle: PromoBundle; webinar: Webinar; brand: Brand | null; design: CreativeDesign; }

const HISTORY_KEY = "promo-history-v2";
const WEBHOOK_KEY = "promo-webhook-url";
const SLACK_KEY = "promo-slack-url";

const EMPTY_WEBINAR: Webinar = {
  title: "", subtitle: "", format: "Live-Webinar", date: "", time: "", registrationUrl: "", audience: "",
  host: { name: "", role: "" }, guest: undefined, pains: [], coreProblem: "", coreMessage: "",
  solutionPoints: [], freebie: undefined, promise: [], proofCases: undefined,
};

function copyText(text: string, label: string) {
  navigator.clipboard?.writeText(text).then(() => toast.success(`${label} kopiert ✓`)).catch(() => toast.error("Kopieren nicht möglich"));
}
function CopyBtn({ text, label }: { text: string; label: string }) {
  return <Button variant="ghost" size="sm" onClick={() => copyText(text, label)}><Copy className="h-3.5 w-3.5" /></Button>;
}

// Antwort robust parsen: fängt Nicht-JSON-Fehler (z.B. 413 "Request Entity Too Large") ab.
async function jsonOrThrow(res: Response) {
  const text = await res.text();
  if (!res.ok) {
    let msg = `Server-Fehler (${res.status})`;
    try { msg = JSON.parse(text)?.error ?? msg; }
    catch { msg = res.status === 413 ? "Datei/Anfrage zu groß für den Server — bitte eine kleinere Datei verwenden." : (text.slice(0, 140) || msg); }
    throw new Error(msg);
  }
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error("Ungültige Server-Antwort."); }
}

export default function Home() {
  const router = useRouter();
  const [webinar, setWebinar] = useState<Webinar>(() => structuredClone(defaultWebinar) as unknown as Webinar);
  const [tab, setTab] = useState("formular");
  const [design, setDesign] = useState<CreativeDesign>({ template: "bold" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [currentWebinar, setCurrentWebinar] = useState<Webinar | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [learning, setLearning] = useState(false);
  const [exampleImages, setExampleImages] = useState<{ data: string; mimeType: string; preview: string }[]>([]);
  const [importValue, setImportValue] = useState("");
  const [importing, setImporting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [plan, setPlan] = useState<PostingPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackUrl, setSlackUrl] = useState("");
  const [sending, setSending] = useState<"webhook" | "slack" | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [angleLab, setAngleLab] = useState<Angle[] | null>(null);
  const [analyzingAngles, setAnalyzingAngles] = useState(false);
  const [selectedAngleIds, setSelectedAngleIds] = useState<string[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { setTheme } = useTheme();
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const logStep = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    setLog((cur) => [...cur, { id: ++logIdRef.current, time: new Date().toLocaleTimeString("de-DE"), msg, kind }].slice(-40));
  }, []);

  // Nur die Felder, die wirklich im Creative landen — sonst feuert jeder Tastendruck in
  // unbeteiligten Feldern (Pains, Lösung …) einen teuren Render-Call.
  const previewSig = useMemo(() => JSON.stringify({
    t: webinar.title, s: webinar.subtitle, f: webinar.format, d: webinar.date, ti: webinar.time,
    u: webinar.registrationUrl, h: webinar.host, g: webinar.guest, design, brand,
  }), [webinar, design, brand]);
  const previewCache = useRef<Map<string, string>>(new Map());

  // Live-Vorschau: debounced, mit Cache (zurückschalten = sofort, kein neuer Call).
  useEffect(() => {
    const cached = previewCache.current.get(previewSig);
    if (cached) { setPreview(cached); return; }
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webinar, design, brand: brand ?? undefined }) });
        const data = await res.json();
        if (res.ok) { setPreview(data.dataUri); previewCache.current.set(previewSig, data.dataUri); }
      } catch { /* still */ } finally { setPreviewing(false); }
    }, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSig]);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY); if (h) setHistory(JSON.parse(h));
      setWebhookUrl(localStorage.getItem(WEBHOOK_KEY) ?? "");
      setSlackUrl(localStorage.getItem(SLACK_KEY) ?? "");
    } catch { /* ignore */ }
  }, []);

  async function startTour() {
    const { driver } = await import("driver.js"); // lazy: hält driver.js aus dem Initial-Bundle
    driver({
      showProgress: true, nextBtnText: "Weiter", prevBtnText: "Zurück", doneBtnText: "Fertig",
      onDestroyed: () => { try { localStorage.setItem("promo-tour-seen-v1", "1"); } catch { /* */ } },
      steps: [
        { popover: { title: "Willkommen 👋", description: "Kurze Tour in 4 Schritten — du kannst jederzeit mit ✕ abbrechen." } },
        { element: "#step-marke", popover: { title: "1 · Marke", description: "Standard-Brand-Kit nutzen oder aus euren echten Anzeigen ableiten lassen." } },
        { element: "#step-webinar", popover: { title: "2 · Webinar", description: "Daten ins Formular eintragen — oder aus Transkript/URL automatisch ausfüllen lassen." } },
        { element: "#step-design", popover: { title: "3 · Design", description: "Vorlage, Akzentfarbe, Schrift und eigene Bilder (Logo/Hintergrund) — alles optional." } },
        { element: "#step-generieren", popover: { title: "4 · Generieren", description: "Ein Klick → Anzeigen, E-Mail, Qualitäts-Check und Posting-Plan erscheinen darunter." } },
      ],
    }).drive();
  }

  useEffect(() => {
    try { if (!localStorage.getItem("promo-tour-seen-v1")) setTimeout(startTour, 700); } catch { /* */ }
  }, []);

  const fail = (e: unknown) => { const m = e instanceof Error ? e.message : String(e); toast.error(m); logStep(m, "error"); };

  function persistHistory(next: HistoryEntry[]) { setHistory(next); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* quota */ } }
  function saveToHistory(bundle: PromoBundle, w: Webinar) {
    persistHistory([{ id: crypto.randomUUID(), savedAt: Date.now(), title: w.title, bundle, webinar: w, brand, design }, ...history].slice(0, 12));
  }
  async function openFromHistory(entry: HistoryEntry) {
    setOpening(entry.id); setPlan(null);
    try {
      const res = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ads: entry.bundle.ads, webinar: entry.webinar, brand: entry.brand ?? undefined, design: entry.design }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Öffnen fehlgeschlagen");
      setWebinar(entry.webinar); setDesign(entry.design ?? { template: "bold" }); setBrand(entry.brand); setCurrentWebinar(entry.webinar);
      setResult({ bundle: entry.bundle, creatives: data.creatives });
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (e) { fail(e); } finally { setOpening(null); }
  }

  async function addExamples(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) { toast.error("Bitte Bilddateien (PNG/JPG) der Beispiel-Anzeigen."); return; }
    const next = await Promise.all(imgs.map(async (f) => {
      const uri = await compressImage(f, 1200, 0.8); // vor dem Senden verkleinern
      return { data: uri.split(",")[1] ?? "", mimeType: uri.match(/^data:(.*?);base64/)?.[1] ?? "image/jpeg", preview: uri };
    }));
    setExampleImages((cur) => [...cur, ...next].slice(0, 6));
    toast.success(`${next.length} Beispiel-Anzeige${next.length > 1 ? "n" : ""} hinzugefügt`);
    logStep(`${next.length} Beispiel-Anzeige(n) hochgeladen & komprimiert — jetzt „Marke lernen" klicken`, "info");
  }

  async function learnBrand() {
    setLearning(true);
    logStep(exampleImages.length ? `Marke wird aus ${exampleImages.length} eigenen Beispielen gelernt …` : "Marke wird aus den Beispiel-Anzeigen gelernt (Vision) …", "working");
    try {
      const payload = exampleImages.length ? { images: exampleImages.map(({ data, mimeType }) => ({ data, mimeType })) } : {};
      const res = await fetch("/api/learn-brand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await jsonOrThrow(res);
      setBrand(data.brand as Brand);
      toast.success(exampleImages.length ? "Marke aus deinen Beispielen gelernt 🎨" : "Marke aus mitgelieferten Beispielen gelernt 🎨");
      logStep("Marke gelernt — Farben, Ton & Copy-Regeln übernommen ✓", "done");
    } catch (e) { fail(e); } finally { setLearning(false); }
  }

  async function extractWebinar(mode: "transkript" | "url") {
    if (!importValue.trim()) return;
    setImporting(true);
    logStep(mode === "url" ? "Webinar wird von der Landingpage-URL extrahiert …" : "Webinar wird aus dem Transkript extrahiert …", "working");
    try {
      const payload = mode === "url" ? { url: importValue } : { text: importValue };
      const res = await fetch("/api/extract-webinar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraktion fehlgeschlagen");
      setWebinar(data.webinar as Webinar); setTab("formular"); toast.success("Webinar extrahiert → ins Formular übernommen 📥");
      logStep("Webinar übernommen — prüf die Felder im Formular ✓", "done");
    } catch (e) { fail(e); } finally { setImporting(false); }
  }

  async function analyzeAngles() {
    setAnalyzingAngles(true);
    logStep("Angles werden abgeleitet & nach Ziehkraft bewertet …", "working");
    try {
      const res = await fetch("/api/angles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webinar, brand: brand ?? undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Angle-Analyse fehlgeschlagen");
      const angles = data.angles as Angle[];
      setAngleLab(angles); setSelectedAngleIds(angles.slice(0, 3).map((a) => a.id));
      toast.success("Angles bewertet — wähle deine Favoriten 🎯");
      logStep("Angles bewertet — bis zu 3 Favoriten wählen, dann generieren ✓", "done");
    } catch (e) { fail(e); } finally { setAnalyzingAngles(false); }
  }
  function toggleAngle(id: string) {
    setSelectedAngleIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : (cur.length < 3 ? [...cur, id] : cur));
  }
  async function transcribeMedia(file: File) {
    const CAN_DECODE_MAX = 150 * 1024 * 1024; // im Browser dekodierbar
    const INLINE_MAX = 3.5 * 1024 * 1024;
    const isAV = file.type.startsWith("audio/") || file.type.startsWith("video/");
    if (isAV && file.size > CAN_DECODE_MAX) {
      toast.error(`Datei ${(file.size / 1024 / 1024).toFixed(0)} MB — zu groß für die Browser-Komprimierung. Bitte vorab die Audiospur extrahieren (Hinweis unten).`);
      return;
    }
    setTranscribing(true);
    logStep("Aufnahme wird komprimiert & ausgewertet (kann etwas dauern) …", "working");
    try {
      let toSend = file;
      if (isAV) {
        // Audio/Video im Browser komprimieren (mono, 16 kHz, ggf. gekürzt) → passt inline.
        const { compressAudio } = await import("@/lib/audio");
        const c = await compressAudio(file);
        toSend = c.file;
        if (c.trimmed) toast.message(`Lange Aufnahme — es werden die ersten ${Math.round(c.usedSeconds / 60)} Min genutzt (enthält meist den ganzen Pitch).`);
      } else if (file.size > INLINE_MAX) {
        toast.error(`Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB).`); return;
      }
      const dataUri = await readFileAsDataUri(toSend);
      const res = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUri }) });
      const data = await jsonOrThrow(res);
      setWebinar(data.webinar as Webinar); setTab("formular"); toast.success("Aus Aufnahme extrahiert → Formular gefüllt 🎙️");
      logStep("Webinar aus Aufnahme übernommen ✓", "done");
    } catch (e) { fail(e); } finally { setTranscribing(false); }
  }

  async function extractFromPdf(file: File) {
    setImporting(true);
    logStep("PDF wird gelesen & Felder extrahiert (Text oder per Vision) …", "working");
    try {
      const { extractPdfText, renderPdfToImages } = await import("@/lib/pdf");
      let payload: Record<string, unknown>;
      const text = await extractPdfText(file).catch(() => "");
      if (text && text.length >= 80) {
        payload = { text }; // PDF mit Text-Ebene → günstig & schnell
      } else {
        // Keine (zuverlässige) Text-Ebene → Seiten als Bilder an Gemini-Vision (OCR).
        const images = await renderPdfToImages(file);
        if (!images.length) throw new Error("PDF konnte nicht gelesen werden.");
        payload = { images };
      }
      const res = await fetch("/api/extract-webinar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await jsonOrThrow(res);
      setWebinar(data.webinar as Webinar); setTab("formular"); toast.success("Aus PDF extrahiert → Formular gefüllt 📄");
      logStep("Webinar aus PDF übernommen — prüf kurz die Felder im Formular ✓", "done");
    } catch (e) { fail(e); } finally { setImporting(false); }
  }

  async function generate() {
    setResult(null); setPlan(null); setLoading(true);
    logStep("Assets werden generiert: Angles → 3 Anzeigen × 3 Formate → E-Mail → Qualitäts-Check …", "working");
    try {
      const chosen = angleLab ? angleLab.filter((a) => selectedAngleIds.includes(a.id)) : undefined;
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webinar, brand: brand ?? undefined, design, angles: chosen && chosen.length >= 2 ? chosen : undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unbekannter Fehler");
      setResult(data as ApiResult); setCurrentWebinar(webinar); saveToHistory((data as ApiResult).bundle, webinar);
      toast.success("Assets generiert ✓"); logStep("Assets generiert — Angles, Anzeigen, E-Mail & Qualitäts-Check fertig ✓", "done");
    } catch (e) { fail(e); } finally { setLoading(false); }
  }

  async function createPlan() {
    if (!result || !currentWebinar) return;
    setPlanning(true);
    logStep("Posting-Plan wird geplant (rückwärts vom Webinar-Termin) …", "working");
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webinar: currentWebinar, bundle: result.bundle, brand: brand ?? undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Plan fehlgeschlagen");
      setPlan(data.plan as PostingPlan); toast.success("Posting-Plan erstellt 🗓️");
      logStep("Posting-Plan fertig — als .ics/.csv exportierbar ✓", "done");
    } catch (e) { fail(e); } finally { setPlanning(false); }
  }

  function download(name: string, content: string | Blob, type: string) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }

  async function sendTo(kind: "webhook" | "slack") {
    if (!result) return;
    const url = kind === "slack" ? slackUrl : webhookUrl;
    if (!url.trim()) { toast.error("Bitte erst eine URL eintragen."); return; }
    try { localStorage.setItem(kind === "slack" ? SLACK_KEY : WEBHOOK_KEY, url); } catch { /* */ }
    setSending(kind);
    try {
      const res = await fetch("/api/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, slack: kind === "slack", bundle: result.bundle, webinarTitle: currentWebinar?.title }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Senden fehlgeschlagen");
      toast.success(kind === "slack" ? "An Slack gesendet ✓" : `An Webhook gesendet ✓ (HTTP ${data.status})`);
    } catch (e) { fail(e); } finally { setSending(null); }
  }

  async function downloadZip() {
    if (!result) return;
    logStep("Zyklus-ZIP wird gepackt (Angles, Anzeigen, Creatives, E-Mail, Plan) …", "working");
    const JSZip = (await import("jszip")).default; // lazy: nur beim ZIP-Export laden
    const { bundle, creatives } = result;
    const w = currentWebinar ?? webinar;
    const zip = new JSZip();
    const root = zip.folder(`Zyklus_${bundle.cycleSlug}`)!;
    const ang = root.folder("01_Angles")!; ang.file("angles.md", anglesToMarkdown(bundle.angles, w)); ang.file("angles.json", JSON.stringify(bundle.angles, null, 2));
    const ads = root.folder("02_Ad-Copies")!; bundle.ads.forEach((ad, i) => ads.file(`anzeige-${i + 1}-${ad.variant}.md`, adToMarkdown(ad, i))); ads.file("ads.json", JSON.stringify(bundle.ads, null, 2));
    const cre = root.folder("03_Creatives")!; for (const c of creatives) { const buf = await (await fetch(c.dataUri)).arrayBuffer(); cre.folder(`anzeige-${c.index + 1}-${c.variant}`)!.file(`${c.formatKey}.png`, buf); }
    const mail = root.folder("04_Mailing")!; mail.file("einladung.md", emailToMarkdown(bundle.email)); mail.file("einladung.html", emailToHtml(bundle.email, "#E11D2A")); mail.file("einladung.json", JSON.stringify(bundle.email, null, 2));
    root.folder("05_System-Export-oder-Doku")!.file("bundle.json", JSON.stringify(bundle, null, 2));
    if (plan) { const p = root.folder("06_Posting-Plan")!; p.file("posting-plan.md", planToMarkdown(plan, w)); p.file("posting-plan.csv", planToCsv(plan)); p.file("posting-plan.ics", planToIcs(plan)); }
    download(`Zyklus_${bundle.cycleSlug}.zip`, await zip.generateAsync({ type: "blob" }), "application/zip");
    logStep("Zyklus als ZIP heruntergeladen ✓", "done");
  }
  function downloadPng(c: Creative) { download(c.filename, dataUriToBlob(c.dataUri), "image/png"); }
  async function requestVariant(ad: AdCopy): Promise<{ ad: AdCopy; creatives: Creative[] } | null> {
    logStep("B-Variante (alternative Copy) wird erzeugt …", "working");
    try {
      const res = await fetch("/api/variant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ad, webinar: currentWebinar ?? webinar, brand: brand ?? undefined, design }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Variante fehlgeschlagen");
      toast.success("B-Variante erzeugt ✓"); logStep("B-Variante erzeugt — per A/B-Schalter umschalten ✓", "done");
      return { ad: data.ad as AdCopy, creatives: data.creatives as Creative[] };
    } catch (e) { fail(e); return null; }
  }
  async function logout() { await fetch("/api/auth", { method: "DELETE" }); router.replace("/login"); router.refresh(); }

  const eff = result?.bundle.qa ? (result.bundle.qa.after ?? result.bundle.qa.before) : null;
  // Pflichtfelder für „Generieren" — Basis für Validierung, Häkchen & Fortschritt.
  const requiredOk = Boolean(
    webinar.title?.trim() && webinar.date?.trim() && webinar.time?.trim() &&
    webinar.host?.name?.trim() && webinar.coreProblem?.trim()
  );
  const progress = plan ? 100 : result ? 85 : requiredOk ? 55 : 30;
  const statusLabel = plan ? "Fertig — inkl. Posting-Plan" : result ? "Assets fertig" : requiredOk ? "Bereit zum Generieren" : "Pflichtfelder ausfüllen (Titel, Datum, Uhrzeit, Host, Kernproblem)";
  const busy = learning || importing || transcribing || loading || planning || analyzingAngles || sending !== null;
  const nextStep = !requiredOk
    ? "Webinar-Eckdaten eingeben (Schritt 2) — per PDF/Transkript/URL/Audio oder direkt im Formular."
    : !result
    ? "Bereit! Optional Marke lernen, Design & Angle-Lab — dann Assets generieren (Schritt 4)."
    : !plan
    ? "Assets fertig. Erstelle den Posting-Plan — oder lade den kompletten Zyklus als ZIP."
    : "Alles fertig 🎉 — als ZIP exportieren oder per Webhook/Slack weitergeben.";

  // Tastenkürzel: ⌘/Ctrl+K = Befehlspalette, ⌘/Ctrl+↵ = Generieren. genRef hält die aktuelle Closure.
  const genRef = useRef<() => void>(() => {});
  useEffect(() => { genRef.current = () => { if (requiredOk && !loading) generate(); }; });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      else if (mod && e.key === "Enter") { e.preventDefault(); genRef.current(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const runCmd = useCallback((fn: () => void) => { setPaletteOpen(false); fn(); }, []);

  return (
    <main className="relative min-h-screen">
      {/* dekorativer Verlauf hinter dem Hero */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px] bg-gradient-to-b from-primary/10 via-primary/[0.035] to-transparent" />
      <div className="mx-auto max-w-5xl px-5 py-8 pb-24">
        {/* Header */}
        <m.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/55 shadow-sm"><Sparkles className="h-4 w-4 text-primary-foreground" /></span>
            <h1 className="text-lg font-bold">Webinar-Promo-System</h1>
            <Badge variant="outline" className="text-muted-foreground">Scaling Champions</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPaletteOpen(true)} className="gap-1.5"><CommandIcon className="h-4 w-4" /><span className="hidden sm:inline">Befehle</span><kbd className="hidden sm:inline rounded border border-border px-1 text-[10px] text-muted-foreground">K</kbd></Button>
            <Button variant="ghost" size="sm" onClick={startTour}><HelpCircle className="h-4 w-4" /><span className="hidden sm:inline"> Tour</span></Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /><span className="hidden sm:inline"> Abmelden</span></Button>
          </div>
        </m.header>

        {/* Hero-Claim */}
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="mt-9">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">Webinar rein → fertige Promo-Assets raus.</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">Angles, markenkonforme Anzeigen (Bild&nbsp;+&nbsp;Text), E-Mail-Einladung, Qualitäts-Check und Posting-Plan — in einem geführten Durchlauf.</p>
        </m.div>

        {/* So funktioniert's */}
        <Card className="mt-5 bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm font-medium flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> So funktioniert's</p>
            <p className="text-sm text-muted-foreground mt-1.5">
              In 4 Schritten von einem Webinar zu fertigen Promo-Assets:
              <span className="text-foreground"> ① Marke</span> wählen →
              <span className="text-foreground"> ② Webinar</span> eingeben (Formular, Transkript oder URL) →
              <span className="text-foreground"> ③ Design</span> anpassen (Vorlage, Farben, eigene Bilder) →
              <span className="text-foreground"> ④ Generieren</span>. Fertige Anzeigen, E-Mail und Posting-Plan erscheinen darunter.
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center gap-3">
          <Progress value={progress} className="h-1.5" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{statusLabel}</span>
        </div>

        {/* Step 1 — Marke */}
        <StepCard id="step-marke" n={1} icon={<Palette className="h-4 w-4" />} title="Marke" desc="Das Brand-Kit bestimmt Farben & Ton. Standard nutzen oder aus euren echten Beispiel-Anzeigen ableiten lassen." done={Boolean(brand)}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Badge variant={brand ? "default" : "secondary"}>{brand ? "Marke gelernt" : "Standard-Kit aktiv"}</Badge>
            <Button variant="outline" size="sm" onClick={learnBrand} disabled={learning}>
              {learning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {exampleImages.length ? `Aus ${exampleImages.length} eigenen Beispielen lernen` : "Aus Beispielen lernen"}
            </Button>
          </div>

          {/* Eigene Beispiel-Anzeigen hochladen (Drag & Drop) */}
          <div className="mt-4 space-y-2.5">
            <Dropzone accept="image/*" multiple busy={learning} maxMB={25}
              title="Eigene Beispiel-Anzeigen hierher ziehen oder klicken"
              hint="PNG/JPG der Scaling-Champions-Anzeigen — daraus lernt das System Farben & Ton. Optional; ohne Upload werden die mitgelieferten Beispiele genutzt. Bilder werden automatisch komprimiert."
              onFiles={addExamples} />
            {exampleImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {exampleImages.map((img, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.preview} alt="" className="h-16 w-16 rounded-md object-cover border border-border" />
                    <button type="button" onClick={() => setExampleImages((c) => c.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {brand && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(brand.palette).map(([k, v]) => (
                  <div key={k} title={`${k}: ${v}`} className="flex flex-col items-center gap-1">
                    <span className="h-8 w-8 rounded-md border border-border" style={{ background: v as string }} />
                    <span className="text-[9px] text-muted-foreground">{k}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Ton:</span> {brand.voice.tone}</p>
            </div>
          )}
        </StepCard>

        {/* Step 2 — Webinar */}
        <StepCard id="step-webinar" n={2} icon={<FileText className="h-4 w-4" />} title="Webinar" desc="Trag die Webinar-Daten ein. Am einfachsten über das Formular — oder lass sie aus einem Transkript / einer Landingpage automatisch ausfüllen." done={requiredOk}>
          <div className="flex gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={() => setWebinar(structuredClone(defaultWebinar) as unknown as Webinar)}><FilePlus2 className="h-3.5 w-3.5" /> Beispiel laden</Button>
            <Button variant="ghost" size="sm" onClick={() => setWebinar(EMPTY_WEBINAR)}><Eraser className="h-3.5 w-3.5" /> Leeren</Button>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="formular">Formular</TabsTrigger>
              <TabsTrigger value="pdf">Aus PDF</TabsTrigger>
              <TabsTrigger value="transkript">Aus Transkript</TabsTrigger>
              <TabsTrigger value="url">Aus URL</TabsTrigger>
              <TabsTrigger value="audio">Aus Audio/Video</TabsTrigger>
              <TabsTrigger value="json">JSON-Ansicht</TabsTrigger>
            </TabsList>
            <TabsContent value="formular" className="mt-4"><WebinarForm webinar={webinar} onChange={setWebinar} /></TabsContent>
            <TabsContent value="pdf" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Ziehe ein <span className="text-foreground">Briefing als PDF</span> hierher — der Text wird im Browser ausgelesen (oder per Vision/OCR), die Felder werden automatisch extrahiert. Ideal für die Client-Briefings von Scaling Champions.</p>
              <Dropzone accept="application/pdf,.pdf" busy={importing} maxMB={30}
                title="PDF-Briefing hierher ziehen oder klicken"
                hint="Funktioniert auch ohne Text-Ebene (gescannt) — dann per Bild/OCR."
                onFiles={(files) => { if (files[0]) extractFromPdf(files[0]); }} />
              {importing && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Lese PDF &amp; extrahiere …</p>}
            </TabsContent>
            <TabsContent value="transkript" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Fügt das Transkript/Briefing ein — die KI füllt das Formular automatisch.</p>
              <Textarea value={importValue} onChange={(e) => setImportValue(e.target.value)} placeholder="Transkript, Briefing oder Notizen einfügen …" className="min-h-32" />
              <Button variant="outline" size="sm" onClick={() => extractWebinar("transkript")} disabled={importing || !importValue.trim()}>{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Extrahieren → füllt Formular</Button>
            </TabsContent>
            <TabsContent value="url" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Gib die Landingpage-URL des Webinars ein.</p>
              <Input value={importValue} onChange={(e) => setImportValue(e.target.value)} placeholder="https://…" />
              <Button variant="outline" size="sm" onClick={() => extractWebinar("url")} disabled={importing || !importValue.trim()}>{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Extrahieren → füllt Formular</Button>
            </TabsContent>
            <TabsContent value="audio" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Ziehe eine <span className="text-foreground">Audio- oder Video-Datei</span> hierher (bis 150 MB) — sie wird im Browser automatisch komprimiert (mono, 16 kHz) und bei Bedarf auf die ersten Minuten gekürzt, damit sie passt. Gemini hört zu und füllt das Formular.</p>
              <Dropzone accept="audio/*,video/*" busy={transcribing} maxMB={150}
                title="Audio-/Video-Datei hierher ziehen oder klicken"
                hint="Wird im Browser komprimiert (mono, 16 kHz) & ggf. gekürzt."
                onFiles={(files) => { if (files[0]) transcribeMedia(files[0]); }} />
              {transcribing
                ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Komprimiere &amp; extrahiere … (kann etwas dauern)</p>
                : <p className="text-[11px] text-muted-foreground leading-relaxed">Mehrstündiges Webinar oder Datei &gt; 150 MB? Vorab die Audiospur extrahieren:<br /><code className="text-foreground">ffmpeg -i webinar.mp4 -vn -ac 1 -ar 16000 -b:a 48k audio.mp3</code></p>}
            </TabsContent>
            <TabsContent value="json" className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Nur-Ansicht (bearbeiten über das Formular).</p>
              <Textarea readOnly value={JSON.stringify(webinar, null, 2)} className="min-h-56 font-mono text-xs" />
            </TabsContent>
          </Tabs>
        </StepCard>

        {/* Step 3 — Design */}
        <StepCard id="step-design" n={3} icon={<Paintbrush className="h-4 w-4" />} title="Design" desc="Wähle Vorlage, Akzentfarbe und Schrift, lade optional Logo / Hintergrund hoch — die Vorschau rechts aktualisiert sich sofort.">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <DesignEditor design={design} onChange={setDesign} />
            <div className="space-y-2 md:sticky md:top-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">Live-Vorschau {previewing && <Loader2 className="h-3 w-3 animate-spin" />}</p>
              <AnimatePresence mode="wait">
                {preview ? (
                  <m.img key={preview} src={preview} alt="Vorschau"
                    initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="w-full rounded-lg border border-border" />
                ) : (
                  <m.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-[4/5] rounded-lg overflow-hidden border border-border">
                    <Skeleton className="h-full w-full" />
                  </m.div>
                )}
              </AnimatePresence>
              <p className="text-[11px] text-muted-foreground">Beispiel mit dem aktuellen Titel & Design — die echten Anzeigen entstehen in Schritt 4.</p>
            </div>
          </div>
        </StepCard>

        {/* Step 4 — Generieren */}
        <StepCard id="step-generieren" n={4} icon={<Sparkles className="h-4 w-4" />} title="Generieren" desc="Erzeugt Angles, 3 Anzeigen × 3 Formate, E-Mail und einen automatischen Qualitäts-Check." done={Boolean(result)}>
          {/* Angle-Lab: optional Angles vorab bewerten & auswählen */}
          <div className="mb-5 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-medium flex items-center gap-1.5"><Gauge className="h-4 w-4 text-primary" /> Angle-Lab <span className="text-muted-foreground font-normal">— optional: Angles vorab nach Ziehkraft bewerten & auswählen</span></p>
              <Button variant="outline" size="sm" onClick={analyzeAngles} disabled={analyzingAngles}>
                {analyzingAngles ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />} {angleLab ? "Neu bewerten" : "Angles ableiten & bewerten"}
              </Button>
            </div>
            {angleLab && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Wähle bis zu 3 Angles ({selectedAngleIds.length}/3) — daraus entstehen die Anzeigen.</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {angleLab.map((a) => {
                    const sel = selectedAngleIds.includes(a.id);
                    return (
                      <button key={a.id} type="button" onClick={() => toggleAngle(a.id)}
                        className={`text-left rounded-lg border p-3 transition ${sel ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{a.name}</span>
                          <ScoreBadge score={a.pullScore ?? 0} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{a.bigIdea}</p>
                        <p className="text-[11px] text-muted-foreground italic mt-1">Ziehkraft: {a.pullReason}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={generate} disabled={loading || !requiredOk} size="lg">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generiere … (≈30 Sek.)</> : <>Assets generieren{angleLab ? ` (${selectedAngleIds.length} Angles)` : ""} <ChevronRight className="h-4 w-4" /></>}
            </Button>
            {result && <Button variant="outline" onClick={downloadZip}><Download className="h-4 w-4" /> Zyklus als ZIP</Button>}
            <span className="text-xs text-muted-foreground hidden sm:inline">Tipp: <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">⌘</kbd><kbd className="rounded border border-border px-1 py-0.5 text-[10px]">↵</kbd> generiert · <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">⌘</kbd><kbd className="rounded border border-border px-1 py-0.5 text-[10px]">K</kbd> Befehle</span>
          </div>
          {!requiredOk && (
            <p className="mt-2.5 text-xs text-muted-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Fülle zuerst die Pflichtfelder in Schritt 2 aus: <span className="text-foreground">Titel, Datum, Uhrzeit, Host-Name, Kernproblem</span>.</p>
          )}
        </StepCard>

        {/* Leerzustand: zeigt, wo der Output landet */}
        {!result && !loading && (
          <Reveal className="mt-10">
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 px-6 text-center">
              <Rocket className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Deine fertigen Assets erscheinen hier</p>
              <p className="text-xs text-muted-foreground mt-1">Angles · 3 Anzeigen × 3 Formate · E-Mail · Qualitäts-Check · Posting-Plan</p>
            </div>
          </Reveal>
        )}

        {/* Lade-Skelett während des Generierens */}
        <AnimatePresence>
          {loading && (
            <m.div key="gen-skel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-12">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><Loader2 className="h-4 w-4 animate-spin" /> Generiere Angles, Anzeigen, E-Mail &amp; Qualitäts-Check …</div>
              <div className="grid gap-5 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                    <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <section className="mt-8">
            <SectionTitle icon={<HistoryIcon className="h-4 w-4" />}>History ({history.length})</SectionTitle>
            <div className="space-y-2">
              {history.map((h) => (
                <Card key={h.id} className="py-0">
                  <CardContent className="flex items-center justify-between gap-3 py-3 px-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{h.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.savedAt).toLocaleString("de-DE")}{h.brand ? " · gelernte Marke" : ""}{h.design?.template ? ` · ${h.design.template}` : ""}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openFromHistory(h)} disabled={opening === h.id}>{opening === h.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Öffnen"}</Button>
                      <Button variant="ghost" size="icon" onClick={() => persistHistory(history.filter((x) => x.id !== h.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        {result && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="mt-14 space-y-12">
            <Reveal>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium whitespace-nowrap">Fertige Assets</span>
                <Separator className="flex-1" />
              </div>
            </Reveal>
            {eff && (
              <section>
                <SectionTitle>Qualitäts-Check (Self-Critique)</SectionTitle>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-2xl font-bold">Ø {(([...eff.ads, eff.email].reduce((s, c) => s + c.score, 0)) / (eff.ads.length + 1)).toFixed(1)}/10</span>
                    <span className="text-sm text-muted-foreground">{result.bundle.qa!.revised.length ? `${result.bundle.qa!.revised.join(", ")} automatisch nachgebessert (Schwelle ${result.bundle.qa!.threshold}/10)` : `alle Assets über Schwelle ${result.bundle.qa!.threshold}/10`}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...eff.ads, eff.email].map((c, i) => (
                      <div key={i} className="flex items-center gap-2 border border-border rounded-md px-2.5 py-1.5"><ScoreBadge score={c.score} /><span className="text-sm">{c.label}</span></div>
                    ))}
                  </div>
                </CardContent></Card>
              </section>
            )}

            <section>
              <SectionTitle>Angles</SectionTitle>
              <m.div variants={gridParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} className="grid gap-4 md:grid-cols-3">
                {result.bundle.angles.map((a) => (
                  <m.div key={a.id} variants={gridChild}>
                    <Card className="h-full transition-colors duration-300 hover:border-primary/30">
                      <CardHeader><p className="text-xs text-primary font-semibold">{a.id}</p><CardTitle className="text-base">{a.name}</CardTitle></CardHeader>
                      <CardContent className="text-sm text-muted-foreground space-y-1.5"><p><span className="text-foreground font-medium">Pain:</span> {a.painAddressed}</p><p>{a.bigIdea}</p></CardContent>
                    </Card>
                  </m.div>
                ))}
              </m.div>
            </section>

            <section>
              <SectionTitle>Anzeigen (Bild + Text) · 3 Formate je Anzeige</SectionTitle>
              <m.div variants={gridParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} className="grid gap-5 md:grid-cols-3">
                {result.bundle.ads.map((ad, i) => (
                  <m.div key={i} variants={gridChild}>
                    <AdCard ad={ad} creatives={result.creatives.filter((c) => c.index === i)} critique={eff?.ads[i]} onDownload={downloadPng} onVariant={requestVariant} />
                  </m.div>
                ))}
              </m.div>
            </section>

            <section>
              <SectionTitle>E-Mail-Einladung</SectionTitle>
              <Card className="max-w-3xl"><CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  {eff?.email ? <ScoreBadge score={eff.email.score} /> : <span />}
                  <CopyBtn text={`${result.bundle.email.greeting}\n\n${result.bundle.email.bodyParagraphs.join("\n\n")}\n\nIm Webinar bekommst du:\n${result.bundle.email.bullets.map((b) => `• ${b}`).join("\n")}\n\n${result.bundle.email.dateLine}\n\n👉 ${result.bundle.email.cta}\n\n${result.bundle.email.signature}`} label="E-Mail" />
                </div>
                <p className="text-xs text-muted-foreground">Betreff</p>
                <p className="font-bold text-lg">{result.bundle.email.subject}</p>
                <p className="text-sm text-muted-foreground mb-3">{result.bundle.email.preheader}</p>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {result.bundle.email.greeting}{"\n\n"}{result.bundle.email.bodyParagraphs.join("\n\n")}{"\n\n"}
                  <b>Im Webinar bekommst du:</b>{"\n"}{result.bundle.email.bullets.map((b) => `• ${b}`).join("\n")}{"\n\n"}
                  {result.bundle.email.dateLine}{"\n\n"}👉 {result.bundle.email.cta}{"\n\n"}{result.bundle.email.signature}
                </div>
              </CardContent></Card>
            </section>

            <section>
              <SectionTitle icon={<Calendar className="h-4 w-4" />}>Posting-Plan (Content-Kalender)</SectionTitle>
              {!plan ? (
                <Card><CardContent className="flex items-center justify-between gap-3 flex-wrap pt-6">
                  <span className="text-sm text-muted-foreground">KI plant die Sequenz über alle Kanäle (rückwärts vom Webinar-Termin) — inkl. kanal-spezifischer Captions.</span>
                  <Button variant="outline" onClick={createPlan} disabled={planning}>{planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />} Posting-Plan erstellen</Button>
                </CardContent></Card>
              ) : (
                <Card><CardContent className="pt-6">
                  <div className="flex gap-2 flex-wrap mb-4">
                    <Button variant="outline" size="sm" onClick={() => download("posting-plan.ics", planToIcs(plan), "text/calendar")}><Download className="h-4 w-4" /> .ics</Button>
                    <Button variant="outline" size="sm" onClick={() => download("posting-plan.csv", planToCsv(plan), "text/csv")}><Download className="h-4 w-4" /> .csv</Button>
                    <Button variant="outline" size="sm" onClick={() => download("posting-plan.md", planToMarkdown(plan, currentWebinar!), "text/markdown")}><Download className="h-4 w-4" /> .md</Button>
                    <Button variant="ghost" size="sm" onClick={createPlan} disabled={planning}><RotateCcw className="h-4 w-4" /> neu</Button>
                  </div>
                  <div className="space-y-3">
                    {plan.entries.map((e, i) => (
                      <div key={i} className="flex gap-3.5 border-l-2 border-primary pl-3.5">
                        <div className="w-24 shrink-0"><p className="text-sm font-semibold">{e.date}</p><p className="text-[11px] text-muted-foreground">T-{e.daysBeforeWebinar}</p></div>
                        <div className="min-w-0">
                          <p className="text-sm mb-1"><Badge variant="secondary">{e.channel}</Badge> <span className="text-muted-foreground text-xs">{e.assetLabel}{e.format !== "—" ? ` · ${e.format}` : ""}</span></p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{e.caption}</p>
                          <p className="text-xs text-muted-foreground italic mt-0.5">{e.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
            </section>

            <section>
              <button onClick={() => setShowAdvanced((v) => !v)} className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5 cursor-pointer">
                <Webhook className="h-4 w-4" /> Erweitert: Export & Anbindungen <ChevronRight className={`h-3.5 w-3.5 transition ${showAdvanced ? "rotate-90" : ""}`} />
              </button>
              {showAdvanced && (
                <Card><CardContent className="pt-6 space-y-4">
                  <Button variant="outline" onClick={downloadZip}><Download className="h-4 w-4" /> Kompletter Zyklus als ZIP{plan ? " (inkl. Posting-Plan)" : ""}</Button>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1.5"><Webhook className="h-3.5 w-3.5" /> Automations-Webhook (Make / n8n / Zapier)</p>
                    <p className="text-xs text-muted-foreground mb-2">Schickt das Asset-Bundle als JSON an deine URL — von dort weiter in jeden Scheduling-/Drive-/Ad-Flow.</p>
                    <div className="flex gap-2 flex-wrap">
                      <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hook.eu2.make.com/…" className="flex-1 min-w-60" />
                      <Button variant="outline" onClick={() => sendTo("webhook")} disabled={sending === "webhook"}>{sending === "webhook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Senden</Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Slack-Benachrichtigung</p>
                    <p className="text-xs text-muted-foreground mb-2">Postet „neues Promo-Set fertig" mit Angles + Score in einen Slack-Channel.</p>
                    <div className="flex gap-2 flex-wrap">
                      <Input value={slackUrl} onChange={(e) => setSlackUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…" className="flex-1 min-w-60" />
                      <Button variant="outline" onClick={() => sendTo("slack")} disabled={sending === "slack"}>{sending === "slack" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Senden</Button>
                    </div>
                  </div>
                </CardContent></Card>
              )}
            </section>
          </m.div>
        )}

        {/* Über dieses System — macht die System-Denke sichtbar */}
        <Reveal className="mt-16">
          <SectionTitle icon={<Info className="h-4 w-4" />}>Über dieses System</SectionTitle>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="transition-colors duration-300 hover:border-primary/30"><CardContent className="pt-5">
              <p className="text-sm font-medium flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5 text-primary" /> Wiederverwendbar</p>
              <p className="text-xs text-muted-foreground mt-1.5">Neues Webinar = nur <code className="text-foreground">inputs/webinar.json</code> tauschen. Gleiches System, neuer Output.</p>
            </CardContent></Card>
            <Card className="transition-colors duration-300 hover:border-primary/30"><CardContent className="pt-5">
              <p className="text-sm font-medium flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-primary" /> Input ↔ Logik getrennt</p>
              <p className="text-xs text-muted-foreground mt-1.5">Marken-DNA (Farben, Ton, Copy-Regeln) liegt separat in <code className="text-foreground">brand/brand.json</code> — oder wird aus Beispielen gelernt.</p>
            </CardContent></Card>
            <Card className="transition-colors duration-300 hover:border-primary/30"><CardContent className="pt-5">
              <p className="text-sm font-medium flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Robust &amp; geprüft</p>
              <p className="text-xs text-muted-foreground mt-1.5">LLM-Output per Schema = garantiert valides JSON, mit Zod geprüft, Modell-Fallback gegen Quota — plus KI-Qualitäts-Loop.</p>
            </CardContent></Card>
          </div>
        </Reveal>

        {/* Footer */}
        <footer className="mt-16 border-t border-border pt-6 flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
          <span>Webinar-Promo-System · wiederverwendbar — neues Webinar = neuer Input</span>
          <a href="https://github.com/Sercan101/webinar-promo-system" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Code2 className="h-3.5 w-3.5" /> Quellcode &amp; Doku
          </a>
        </footer>
      </div>

      {/* Aktivitäts-/Guide-Anzeige — zeigt immer, was läuft + den nächsten Schritt */}
      <ActivityLog entries={log} nextStep={nextStep} busy={busy} />

      {/* Sticky Aktionsleiste — Hauptaktion immer erreichbar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
            <Progress value={progress} className="h-1.5 w-40" />
            <span className="text-xs text-muted-foreground truncate">{statusLabel}</span>
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1 sm:hidden">{statusLabel}</span>
          {result && <Button variant="outline" size="sm" onClick={downloadZip}><Download className="h-4 w-4" /><span className="hidden sm:inline">ZIP</span></Button>}
          <Button size="sm" onClick={generate} disabled={loading || !requiredOk}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generieren
          </Button>
        </div>
      </div>

      {/* Befehlspalette (⌘/Ctrl+K) */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} title="Befehle" description="Schnellzugriff auf alle Aktionen">
        <CommandInput placeholder="Befehl suchen … (Generieren, Marke, Plan, Theme …)" />
        <CommandList>
          <CommandEmpty>Kein Befehl gefunden.</CommandEmpty>
          <CommandGroup heading="Aktionen">
            <CommandItem disabled={!requiredOk || loading} onSelect={() => runCmd(() => genRef.current())}><Sparkles /> Assets generieren <CommandShortcut>⌘↵</CommandShortcut></CommandItem>
            <CommandItem onSelect={() => runCmd(learnBrand)}><Palette /> Marke aus Beispielen lernen</CommandItem>
            <CommandItem onSelect={() => runCmd(analyzeAngles)}><Gauge /> Angle-Lab: Angles bewerten</CommandItem>
            {result && <CommandItem onSelect={() => runCmd(createPlan)}><Calendar /> Posting-Plan erstellen</CommandItem>}
            {result && <CommandItem onSelect={() => runCmd(downloadZip)}><Download /> Zyklus als ZIP herunterladen</CommandItem>}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Webinar">
            <CommandItem onSelect={() => runCmd(() => setWebinar(structuredClone(defaultWebinar) as unknown as Webinar))}><FilePlus2 /> Beispiel-Webinar laden</CommandItem>
            <CommandItem onSelect={() => runCmd(() => setWebinar(EMPTY_WEBINAR))}><Eraser /> Formular leeren</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ansicht">
            <CommandItem onSelect={() => runCmd(startTour)}><HelpCircle /> Tour starten</CommandItem>
            <CommandItem onSelect={() => runCmd(() => setTheme("light"))}><Sun /> Heller Modus</CommandItem>
            <CommandItem onSelect={() => runCmd(() => setTheme("dark"))}><Moon /> Dunkler Modus</CommandItem>
            <CommandItem onSelect={() => runCmd(logout)}><LogOut /> Abmelden</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </main>
  );
}

function dataUriToBlob(uri: string): Blob {
  const [meta, b64] = uri.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function StepCard({ n, icon, title, desc, children, id, done }: { n: number; icon: React.ReactNode; title: string; desc: string; children: React.ReactNode; id?: string; done?: boolean }) {
  return (
    <m.div className="mt-4" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <Card id={id} className="transition-colors duration-300 hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${done ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
            <CardTitle className="text-base flex items-center gap-1.5">{icon} {title}</CardTitle>
          </div>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </m.div>
  );
}
function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">{icon}{children}</h2>;
}
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? "#22C55E" : score >= 7 ? "#EAB308" : "#E11D2A";
  return <span className="text-xs font-bold rounded-full px-2.5 py-0.5 border" style={{ color, borderColor: color }}>{score}/10</span>;
}
function AdCard({ ad, creatives, critique, onDownload, onVariant }: { ad: AdCopy; creatives: Creative[]; critique?: AssetCritique; onDownload: (c: Creative) => void; onVariant: (ad: AdCopy) => Promise<{ ad: AdCopy; creatives: Creative[] } | null> }) {
  const [fmt, setFmt] = useState(creatives[0]?.formatKey ?? "");
  const [feedView, setFeedView] = useState(false);
  const [variant, setVariant] = useState<{ ad: AdCopy; creatives: Creative[] } | null>(null);
  const [side, setSide] = useState<"A" | "B">("A");
  const [making, setMaking] = useState(false);

  const activeAd = side === "B" && variant ? variant.ad : ad;
  const activeCreatives = side === "B" && variant ? variant.creatives : creatives;
  const current = activeCreatives.find((c) => c.formatKey === fmt) ?? activeCreatives[0];
  const caption = `${activeAd.hook}\n\n${activeAd.body}\n\nDu erhältst:\n${activeAd.bullets.map((b) => `✓ ${b}`).join("\n")}\n\n👉 ${activeAd.cta}`;

  async function makeVariant() {
    setMaking(true);
    const v = await onVariant(ad);
    if (v) { setVariant(v); setSide("B"); }
    setMaking(false);
  }

  return (
    <Card className="h-full transition-colors duration-300 hover:border-primary/30"><CardContent className="pt-6">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        {variant ? (
          <div className="flex gap-0.5 rounded-md border border-border p-0.5">
            <button onClick={() => setSide("A")} className={`text-xs px-3 py-1 rounded ${side === "A" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>A</button>
            <button onClick={() => setSide("B")} className={`text-xs px-3 py-1 rounded ${side === "B" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>B</button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={makeVariant} disabled={making}>{making ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} B-Variante</Button>
        )}
        <div className="flex gap-0.5 rounded-md border border-border p-0.5">
          <button onClick={() => setFeedView(false)} className={`text-xs px-2.5 py-1 rounded ${!feedView ? "bg-secondary" : "text-muted-foreground"}`}>Anzeige</button>
          <button onClick={() => setFeedView(true)} className={`text-xs px-2.5 py-1 rounded ${feedView ? "bg-secondary" : "text-muted-foreground"}`}>Im Feed</button>
        </div>
      </div>
      <Tabs value={fmt} onValueChange={setFmt} className="mb-3"><TabsList>{activeCreatives.map((c) => <TabsTrigger key={c.formatKey} value={c.formatKey}>{c.formatLabel}</TabsTrigger>)}</TabsList></Tabs>
      <AnimatePresence mode="wait">
        <m.div key={`${feedView}-${side}-${current.dataUri}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {feedView
            ? <FeedMockup img={current.dataUri} caption={activeAd.hook} />
            /* eslint-disable-next-line @next/next/no-img-element */
            : <img src={current.dataUri} alt={activeAd.headline} className="w-full rounded-lg border border-border block" />}
        </m.div>
      </AnimatePresence>
      <div className="flex items-center justify-between gap-2 mt-3 mb-2">
        <div className="flex items-center gap-2"><span className="text-[11px] text-primary font-semibold uppercase">{activeAd.variant} · {activeAd.angleId}{variant ? ` · ${side}` : ""}</span>{side === "A" && critique && <ScoreBadge score={critique.score} />}</div>
        <div className="flex items-center gap-1">
          <CopyBtn text={caption} label="Anzeigentext" />
          <Button variant="ghost" size="sm" onClick={() => onDownload(current)}><Download className="h-3.5 w-3.5" /> {current.formatLabel}</Button>
        </div>
      </div>
      <div className="text-sm leading-relaxed">
        <p className="font-medium">{activeAd.hook}</p>
        <p className="text-muted-foreground my-1.5">{activeAd.body}</p>
        <p className="font-medium mt-2">Du erhältst:</p>
        <ul className="list-disc pl-5 text-muted-foreground mt-1 space-y-0.5">{activeAd.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
        <p className="mt-2.5 text-primary font-semibold">👉 {activeAd.cta}</p>
      </div>
    </CardContent></Card>
  );
}

function FeedMockup({ img, caption }: { img: string; caption: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="flex items-center gap-2 p-3">
        <span className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">SC</span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Scaling Champions</p>
          <p className="text-[11px] text-muted-foreground">Gesponsert · 4.812 Follower:innen</p>
        </div>
      </div>
      <p className="px-3 pb-2 text-sm">{caption} <span className="text-muted-foreground">…mehr</span></p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="w-full block" />
      <div className="flex items-center justify-around px-3 py-2 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> Gefällt mir</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Kommentieren</span>
        <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> Teilen</span>
      </div>
    </div>
  );
}
