# Loom-Skript (3–5 Min) — Webinar-Promo-System v2

> Ziel: zeigen **wie's gebaut ist** und **wie Kevin es fürs nächste Webinar wiederverwendet**. Kurz, ehrlich, mit Bild.
> Tipp: Aufnahme mit der Live-URL offen — https://webinar-promo-system.vercel.app

## 1. Was ist das? (30 Sek)
„Ein wiederverwendbares System, mit dem sich **jedes** Scaling-Champions-Webinar gleich bewerben lässt. Webinar rein — Angles, Anzeigen mit Bild, E-Mail, ein Qualitäts-Check und sogar ein Posting-Plan raus, im Stil eurer Beispiele."

## 2. Input vs. Logik — der Kern (40 Sek)
- `inputs/webinar.json`: „Das ist der **einzige** Teil, den man pro Webinar tauscht."
- `brand/brand.json`: „Die **Marken-DNA** — Farben, Ton, Copy-Regeln — einmal aus euren Beispielen gelernt."
- „Neues Webinar = **eine Datei tauschen**, kein Umbau. Das war der Kern der Aufgabe."

## 3. Marke wird gelernt, nicht geraten (30 Sek)
- Button **„Aus Beispielen lernen"** zeigen → die Palette-Swatches erscheinen.
- „Das System liest eure **echten Anzeigen per Vision** und leitet das Brand-Kit ab. Hier zieht es z.B. die Orange-Töne aus den Grafiken — es liest die Bilder wirklich, statt zu raten. Genau Kevins ‚Stil lernen', automatisiert."

## 4. Webinar rein — flexibel (20 Sek)
- Tab **Transkript / URL** zeigen. „Man muss kein JSON tippen — Transkript oder Landingpage rein, das System extrahiert die Felder."

## 5. Generieren + die grafische Komponente (60 Sek) — *wichtigster Teil*
- **„Assets generieren"** → durchscrollen.
- Ein Creative groß: „Das ist **kein Text auf Stock-Foto**, sondern ein echtes **Design-System im Code** — euer Look, rotes LIVE-Badge, Speaker-Strip, rot akzentuiertes Keyword. Parametrisiert und als Bild gerendert."
- Format-Tabs zeigen: „Jede Anzeige in **3 Formaten** — 1:1, 4:5, 9:16. Ein kompletter Plattform-Satz."
- 3 Varianten: „Headline für die Krise, Authority für Vertrauen, Proof für die Zahlen."

## 6. Qualitäts-Loop — „LLM gezielt & geprüft" (40 Sek)
- Die **Score-Badges** + den **`qualitaets-report.md`** zeigen.
- „Ein zweiter KI-Pass bewertet jedes Asset 0–10 gegen die Marken-Regeln und **bessert schwache automatisch nach**. Im ersten Lauf hat er sogar einen echten Bug gefunden — doppelte Häkchen — den ich dann an der Wurzel gefixt habe. Das ist kein ‚ChatGPT halt', das ist geprüft."

## 7. Posting-Plan + Anbindungen (40 Sek)
- **„Posting-Plan erstellen"** → die Timeline zeigen, **.ics/.csv** runterladen.
- „Die KI plant die Sequenz über alle Kanäle, rückwärts vom Webinar-Termin, mit **kanal-spezifischen Captions** — als Kalender exportierbar."
- Webhook-/Slack-Feld zeigen: „Und statt 10 OAuth-Flows selbst zu bauen, feuert das System das Bundle per **Webhook an Make/n8n** — da klinkt sich eure ganze Scheduling-Welt ein. Das ist die echte Automations-Denke."

## 8. Wiederverwenden + History (20 Sek)
- History-Panel: „Jeder Lauf landet in der History und lässt sich wieder öffnen."
- „Fürs nächste Webinar: Input tauschen, Knopf drücken — gleicher Output-Satz. Kein Code anfassen."

## 9. Ehrlich: was als Nächstes (15 Sek)
„Mit mehr Zeit: native Ad-Plattform-Anbindung über n8n als fertige Rezepte, A/B-Varianten pro Anzeige, und Speaker-Fotos als Upload statt aus dem Beispiel geschnitten."

---

### Spickzettel (ein Satz)
„Ein Webinar als Input, eine gelernte Marken-DNA als Logik, Gemini für Texte mit euren Beispielen als Anker, ein code-basiertes Design-System für die Bilder, ein Qualitäts-Loop zur Absicherung, ein Posting-Plan + Webhook für die Anbindung — und fürs nächste Webinar tausche ich nur den Input."
