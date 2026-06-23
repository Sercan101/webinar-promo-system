# 🎥 Loom-Skript (3–5 Min) — Webinar-Promo-System

> **Ziel:** zeigen **wie's gebaut ist** und **wie man es fürs nächste Webinar wiederverwendet**. Kurz, ehrlich, mit Bild.

## So nimmst du auf (Setup)
1. **Live-URL** offen: https://webinar-promo-system.vercel.app — Passwort `scaling-champions`.
2. Zweiter Tab: **GitHub-Repo** (https://github.com/Sercan101/webinar-promo-system) für 10 Sek am Ende.
3. Loom auf **„Screen + Cam"** (kleines Gesicht unten = persönlicher). Querformat, ganzer Bildschirm.
4. **Vorher einmal durchklicken**, damit im Take schon ein generiertes Ergebnis bereitliegt (spart Wartezeit) — oder du sprichst die ~30 Sek Generierung locker über.
5. Tempo: ruhig, nicht alles zeigen — **die Story zählt**, nicht jeder Button.

---

## 1 · Was ist das? (30 Sek)
> „Ich hab die Aufgabe nicht als einmaliges Asset-Set gelöst, sondern als **wiederverwendbares System**: Mit dem lässt sich **jedes** Scaling-Champions-Webinar gleich bewerben. **Webinar rein** — und **fertige Promo-Assets raus**: Angles, Anzeigen mit Bild in 3 Formaten, eine E-Mail-Einladung, ein Qualitäts-Check und ein Posting-Plan — im Stil eurer Beispiele."

*(Startseite zeigen: Hero „Webinar rein → fertige Promo-Assets raus.")*

## 2 · Der Kern: Input ↔ Logik getrennt (40 Sek) — *am wichtigsten*
> „Das Designprinzip war mir wichtig. Es gibt genau **zwei Bausteine:**"
- `inputs/webinar.json` → „**Der einzige Teil, den man pro Webinar tauscht.**"
- `brand/brand.json` → „Die **Marken-DNA** — Farben, Ton, Copy-Regeln. Einmal definiert, oder aus euren Beispielen gelernt."
> „**Neues Webinar = eine Datei tauschen, kein Umbau.** Genau das war der Kern: läuft & wiederverwendbar. Unten auf der Seite zeig ich das auch im ‚Über dieses System'-Block."

## 3 · Marke wird gelernt, nicht geraten (35 Sek)
- Eigene **Beispiel-Anzeigen per Drag & Drop** ins Feld ziehen → **„Aus eigenen Beispielen lernen"** → Paletten-Swatches erscheinen.
> „Das System liest **echte Anzeigen per Vision** (Gemini) und leitet das Brand-Kit ab — Farben, Ton, Copy-Regeln. Man kann die **mitgelieferten Beispiele** nutzen oder **eigene reinziehen** — es liest die Bilder wirklich, statt zu raten. Das ist Kevins ‚Stil lernen', automatisiert und austauschbar."

## 4 · Webinar rein — flexibel (25 Sek)
- Tab **„Aus PDF"** zeigen: ein **Client-Briefing als PDF reinziehen** → Felder füllen sich automatisch.
> „Man muss nichts tippen. Realistischer Fall: der Kunde schickt ein **Briefing als PDF** — ich zieh's rein, das System liest es (Text **oder** per Vision/OCR, falls keine Text-Ebene da ist) und füllt alle Felder. Genauso geht **Transkript, Landingpage-URL oder eine Audio-/Video-Aufnahme** (wird im Browser komprimiert). Umgang mit Lücken: fehlt was, füllt das System plausibel auf, statt abzubrechen."

## 5 · Design + Generieren — die grafische Komponente (70 Sek) — *Show-Piece*
- Im **Design-Schritt**: Vorlage (Bold/Minimal/Editorial), Akzentfarbe, Schrift, Logo/Hintergrund-Upload — **Live-Vorschau** rechts aktualisiert sofort.
> „Wichtig war Kevins Hinweis: **kein Text auf Stock-Foto.** Deshalb ist das ein **Design-System im Code** — euer Look, rotes LIVE-Badge, Speaker-Strip, rot akzentuiertes Keyword. Parametrisiert und als Bild gerendert (Satori)."
- **„Assets generieren"** → durchscrollen. Ein Creative groß zeigen.
- **Format-Tabs**: „Jede Anzeige in **3 Formaten** — 1:1, 4:5, 9:16. Ein kompletter Plattform-Satz."
- **3 Angles**: „Headline für die Krise, Authority für Vertrauen, Proof für die Zahlen."
- **A/B-Button** auf einer Anzeige klicken: „Pro Anzeige erzeuge ich auf Klick eine **alternative Copy-Variante zum Testen** — A/B direkt eingebaut."

## 6 · Qualitäts-Loop — „LLM gezielt & geprüft" (40 Sek)
- **Score-Badges** zeigen (Ø-Score oben).
> „Ein **zweiter KI-Pass** bewertet jedes Asset 0–10 gegen die Marken-Regeln und **bessert schwache automatisch nach**. Im ersten Lauf hat er sogar einen **echten Bug** gefunden — doppelte Häkchen — den ich an der Wurzel gefixt habe. Das ist kein ‚ChatGPT halt', das ist **geprüft**."

## 7 · Posting-Plan + Anbindungen (40 Sek)
- **„Posting-Plan erstellen"** → Timeline zeigen, **.ics/.csv** runterladen.
> „Die KI plant die Sequenz über alle Kanäle, **rückwärts vom Webinar-Termin**, mit kanal-spezifischen Captions — als Kalender exportierbar."
- **Webhook/Slack**-Feld zeigen: „Statt 10 OAuth-Flows selbst zu bauen, feuert das System das Bundle per **Webhook an Make/n8n** — da klinkt sich eure ganze Scheduling-Welt ein. Das ist die echte **Automations-Denke**."

## 8 · Bedienung & Reife (25 Sek)
- **⌘K** drücken → Befehlspalette. Kurz: „Alle Aktionen per Tastatur, ⌘+↵ generiert."
> „Drumherum ist es als **richtiges Produkt** gebaut: geführter Wizard mit Häkchen & Validierung, Hell/Dunkel, Onboarding-Tour, History, Live-Vorschau mit Caching (spart API-Quota), und das Repo ist **öffentlich mit CI & Doku** — klonen, Key rein, läuft."

## 9 · Wiederverwenden + ehrlich nach vorn (20 Sek)
> „Fürs nächste Webinar: **Input tauschen, Knopf drücken — gleicher Output-Satz, kein Code anfassen.** Mit mehr Zeit würde ich native Ad-Plattform-Rezepte über n8n bauen und Speaker-Fotos als direkten Upload statt aus dem Beispiel geschnitten. Aber das System steht und ist wiederverwendbar."

*(Kurz aufs GitHub-Repo schwenken: README mit Screenshots, ‚Deploy'-Button, grünes CI-Badge.)*

---

### 🎯 Spickzettel (ein Satz, falls du den Faden verlierst)
„Ein Webinar als Input, eine gelernte Marken-DNA als Logik, Gemini für Texte mit euren Beispielen als Anker, ein **code-basiertes Design-System** für die Bilder, ein **Qualitäts-Loop** zur Absicherung, ein Posting-Plan + Webhook für die Anbindung — und fürs nächste Webinar tausche ich nur den Input."

### ⏱️ Timing-Check
| Abschnitt | Zeit |
|---|---|
| 1 Was + 2 Kern | 1:10 |
| 3 Marke + 4 Input | 0:50 |
| 5 Design/Generieren | 1:10 |
| 6 QA + 7 Plan | 1:20 |
| 8 Reife + 9 Ausblick | 0:45 |
| **Gesamt** | **≈ 5:00** (bei Bedarf 6/7/8 straffen) |
