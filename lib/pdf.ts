// Liest den Text einer PDF im Browser aus (pdf.js, lazy geladen).
// Briefings sind reiner Text → winzig, kein Größen-/CORS-Problem.

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker passend zur Version vom CDN — kein Bundler-Worker-Setup nötig.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ") + "\n";
  }
  return text.replace(/[ \t]+/g, " ").trim();
}

// Rendert die PDF-Seiten zu komprimierten JPEGs (für Gemini-Vision / OCR) — funktioniert
// auch bei PDFs ohne Text-Ebene (gescannt / Text als Outline). Gibt base64 ohne Präfix zurück.
export async function renderPdfToImages(
  file: File,
  maxPages = 6,
  budgetChars = 3_200_000, // base64-Gesamtlänge → JSON-Body bleibt unter Vercels ~4,5-MB-Limit
): Promise<{ data: string; mimeType: string }[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = Math.min(doc.numPages, maxPages);
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
  }
  // Auflösung halten, Bytes über die JPEG-Qualität drücken, bis das Gesamt-Budget passt.
  for (const q of [0.6, 0.5, 0.42, 0.34, 0.26, 0.2]) {
    const uris = canvases.map((c) => c.toDataURL("image/jpeg", q));
    const total = uris.reduce((s, u) => s + u.length, 0);
    if (total <= budgetChars || q === 0.2) {
      return uris.map((u) => ({ data: u.split(",")[1], mimeType: "image/jpeg" }));
    }
  }
  return [];
}
