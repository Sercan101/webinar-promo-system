// Browser-Helfer: Datei -> data-URI (für Bild-Uploads).
export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
}
