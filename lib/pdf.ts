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
  maxPages = 8,
  scale = 1.6,
): Promise<{ data: string; mimeType: string }[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: { data: string; mimeType: string }[] = [];
  const pages = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const dataUri = canvas.toDataURL("image/jpeg", 0.7);
    out.push({ data: dataUri.split(",")[1], mimeType: "image/jpeg" });
  }
  return out;
}
