// Browser-Helfer: Datei -> data-URI (für Bild-Uploads).
export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
    img.src = src;
  });
}

// Verkleinert & komprimiert ein Bild im Browser VOR dem Upload (Canvas).
// PNG behält Transparenz (Logos), alles andere wird zu JPEG (deutlich kleiner).
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) return readFileAsDataUri(file);
  const dataUri = await readFileAsDataUri(file);
  try {
    const img = await loadImage(dataUri);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUri;
    ctx.drawImage(img, 0, 0, w, h);
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const out = canvas.toDataURL(mime, quality);
    // Nur nehmen, wenn's wirklich kleiner ist.
    return out.length > 0 && out.length < dataUri.length ? out : dataUri;
  } catch {
    return dataUri; // im Zweifel das Original
  }
}
