// Schlanker Gemini-Client (REST, kein SDK) — robust und ohne fragile Abhängigkeit.
// Nutzt structured output: responseMimeType=application/json + responseSchema,
// damit garantiert valides JSON nach unserem Schema zurückkommt.

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Standard-JSON-Schema -> Gemini-Schema-Format (Typen GROSS, additionalProperties raus,
// propertyOrdering für stabile Reihenfolge).
function toGeminiSchema(s: unknown): unknown {
  if (!s || typeof s !== "object") return s;
  const node = s as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const type = node.type as string | undefined;
  if (type) out.type = type.toUpperCase();
  if (node.enum) out.enum = node.enum;
  if (type === "object" && node.properties) {
    const props = node.properties as Record<string, unknown>;
    out.properties = Object.fromEntries(
      Object.entries(props).map(([k, v]) => [k, toGeminiSchema(v)]),
    );
    const keys = Object.keys(props);
    out.required = (node.required as string[] | undefined) ?? keys;
    out.propertyOrdering = keys;
  }
  if (type === "array" && node.items) out.items = toGeminiSchema(node.items);
  return out;
}

export interface GeminiJsonOptions {
  apiKey: string;
  /** Ein Modell ODER eine Fallback-Kette (bei Quota/Überlast wird das nächste versucht). */
  model?: string;
  models?: string[];
  system: string;
  prompt: string;
  schema: object;
  temperature?: number;
  /** Optionale Bilder (Vision) — z.B. zum Ableiten des Brand-Kits aus Beispiel-Anzeigen. */
  images?: { data: string; mimeType: string }[];
  /** Optionale Medien (z.B. Audio/Video) — als inline_data übergeben. */
  media?: { data: string; mimeType: string }[];
}

const RETRYABLE = new Set([429, 500, 503]);

// Ein einzelnes Modell aufrufen, transiente Fehler (429/500/503) mit Backoff wiederholen.
async function callModel(model: string, opts: GeminiJsonOptions): Promise<string> {
  const url = `${ENDPOINT}/${model}:generateContent`;
  const headers = { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey };
  const imageParts = [...(opts.images ?? []), ...(opts.media ?? [])].map((m) => ({
    inline_data: { mime_type: m.mimeType, data: m.data },
  }));
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [...imageParts, { text: opts.prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: toGeminiSchema(opts.schema),
      temperature: opts.temperature ?? 0.75,
      // „Thinking" aus: für strukturierte Extraktion unnötig — spart massiv Zeit
      // (kein Timeout) und Tokens/Quota. Auf 2.0/2.5/lite kompatibel.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const MAX_ATTEMPTS = 4;

  let res!: Response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(url, { method: "POST", headers, body: payload });
    if (res.ok) break;
    const txt = await res.text().catch(() => "");
    if (RETRYABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
      // Bei 429 (Rate-Limit) Googles vorgeschlagene Wartezeit (retryDelay) abwarten,
      // sonst exponentiell. So „heilt" sich ein Pro-Minute-Limit von selbst.
      let waitMs = 800 * 2 ** (attempt - 1); // 0.8s, 1.6s, 3.2s
      if (res.status === 429) {
        const m = txt.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
        waitMs = m ? Math.min(Math.ceil(Number(m[1]) * 1000) + 600, 22000) : Math.min(6000 * attempt, 20000);
      }
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    throw new Error(`Gemini API ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini hat die Anfrage blockiert: ${data.promptFeedback.blockReason}`);
  }
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  if (!text) throw new Error("Gemini: leere Antwort.");
  return text;
}

// Ruft Gemini auf (mit Modell-Fallback bei Quota/Überlast) und gibt den (JSON-)Text zurück.
export async function geminiJson(opts: GeminiJsonOptions): Promise<string> {
  const models = opts.models ?? (opts.model ? [opts.model] : []);
  if (models.length === 0) throw new Error("Kein Gemini-Modell angegeben.");

  let lastErr: unknown;
  for (const model of models) {
    try {
      return await callModel(model, opts);
    } catch (err) {
      lastErr = err;
      // Bei Quota/Überlast (429/500/503) das nächste Modell der Kette versuchen.
      if (/Gemini API (429|500|503)/.test(String((err as Error)?.message ?? err))) continue;
      throw err;
    }
  }
  throw lastErr;
}
