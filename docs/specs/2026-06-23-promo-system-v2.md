# Spec: Webinar-Promo-System v2

Ziel: Bewerbungs-Version maximal überzeugend machen — Tiefe & gezielte Wow-Funktionen,
schlank statt aufgebläht. Designter Creative-Look bleibt (kein KI-Hintergrund).

## Pipeline (Stufen optional zuschaltbar, Input/Logik getrennt)

```
[0] Marke lernen   Beispiel-Anzeigen (Vision) + Mails (Text) -> brand.json   lib/learn-brand.ts
[1] Webinar rein   JSON | Transkript | URL -> webinar.json                    lib/extract-webinar.ts
[2] Angles                                                                    lib/generate.ts
[3] Copy + E-Mail                                                             lib/generate.ts
[4] Qualitäts-Loop Judge-Score 0-10 + Mängel -> schwache Assets 1x nachbessern lib/critique.ts
[5] Render         3 Formate (1:1, 4:5, 9:16) pro Anzeige                     lib/creative.tsx
[6] UI/Output      polierte Oberfläche, Scores, Format-Galerie, ZIP
```

## Module
- **lib/creative.tsx** — `FORMATS` (1080×1080, 1080×1350, 1080×1920); Template parametrisiert
  (Breite konstant 1080 -> Typo konsistent, Padding/Headline-Scale je Format).
- **lib/critique.ts** — `critique(assets, brand)` -> Scores + Mängel; `improveAd/improveEmail` mit Kritik als Feedback. Schwelle 7, max. 1 Revision.
- **lib/learn-brand.ts** — `learnBrand(images[], mails[])` (Gemini-Vision) -> Brand (zod-geprüft). Handgepflegtes brand.json bleibt Fallback.
- **lib/extract-webinar.ts** — `extractWebinar(text | url)` -> Webinar (zod-geprüft). Video->Transkript (STT) ist out of scope; Input ist Text/URL.
- **lib/gemini.ts** — Vision-Support (inline_data Bildteile) ergänzen.

## Reihenfolge (Deadline Do, 25.06.)
1. Formate ③ · 2. Qualitäts-Loop ④ · 3. Brand-Learning ① · 4. Webinar-Extraktion ② · 5. UX-Politur ⑤.
Jede Stufe ist abgeschlossen & deploybar.

## Nicht im Scope
- Video-Transkription (STT), KI-Bildhintergründe, Datenbank/Multi-Tenant, Auth.
