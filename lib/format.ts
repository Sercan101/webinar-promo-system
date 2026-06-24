// Markdown-/HTML-Formatierung der Outputs für die saubere Ordner-Ablage.
import type { AdCopy, Angle, AssetCritique, BundleCritique, EmailInvite, PostingPlan, QAReport, Webinar } from "./types";

export function anglesToMarkdown(angles: Angle[], webinar: Webinar): string {
  const lines = [`# Angles — ${webinar.title}`, ""];
  angles.forEach((a, i) => {
    lines.push(
      `## ${i + 1}. ${a.name}  \`[${a.id}]\``,
      "",
      `- **Adressierter Pain:** ${a.painAddressed}`,
      `- **Kernbotschaft:** ${a.coreMessage}`,
      `- **Big Idea:** ${a.bigIdea}`,
      "",
    );
  });
  return lines.join("\n");
}

const VARIANT_LABEL: Record<AdCopy["variant"], string> = {
  headline: "Headline-fokussiert (Krise/Pipeline)",
  authority: "Autorität/Vertrauen (Trusted Advisor)",
  proof: "Proof/Ergebnis (Case & Zahl)",
};

export function adToMarkdown(ad: AdCopy, index: number): string {
  return [
    `# Anzeige ${index + 1} — ${VARIANT_LABEL[ad.variant]}`,
    `> Angle: \`${ad.angleId}\` · Variante: \`${ad.variant}\``,
    "",
    "## Creative (Bild)",
    `- **Headline:** ${ad.headline}`,
    `- **Akzentwort (rot):** ${ad.accentWord}`,
    `- **Subline:** ${ad.subline}`,
    ...(ad.proofStat ? [`- **Proof-Stat:** ${ad.proofStat}`] : []),
    `- **Creatives:** ../03_Creatives/anzeige-${index + 1}-${ad.variant}/ — Formate: 1x1.png, 4x5.png, 9x16.png`,
    "",
    "## Anzeigentext (Caption)",
    "",
    ad.hook,
    "",
    ad.body,
    "",
    "**Du erhältst:**",
    ...ad.bullets.map((b) => `- ✓ ${b}`),
    "",
    `👉 **${ad.cta}**`,
    "",
  ].join("\n");
}

export function emailToMarkdown(email: EmailInvite): string {
  return [
    `# E-Mail-Einladung`,
    "",
    `**Betreff:** ${email.subject}`,
    `**Preheader:** ${email.preheader}`,
    "",
    "---",
    "",
    `${email.greeting}`,
    "",
    ...email.bodyParagraphs.flatMap((p) => [p, ""]),
    "**Im Webinar bekommst du:**",
    ...email.bullets.map((b) => `- ${b}`),
    "",
    email.dateLine,
    "",
    `👉 **${email.cta}**`,
    "",
    "---",
    "",
    email.signature,
    "",
  ].join("\n");
}

function critiqueLines(c: AssetCritique): string {
  return [
    `### ${c.label} — **${c.score}/10** \`${c.verdict}\``,
    c.strengths.length ? `- 👍 ${c.strengths.join(" · ")}` : "",
    c.issues.length ? `- 🔧 ${c.issues.join(" · ")}` : "",
  ].filter(Boolean).join("\n");
}

function bundleCritiqueMd(b: BundleCritique): string {
  return [...b.ads.map(critiqueLines), critiqueLines(b.email)].join("\n\n");
}

export function qaToMarkdown(qa: QAReport): string {
  const avg = (b: BundleCritique) =>
    (([...b.ads, b.email].reduce((s, c) => s + c.score, 0) / (b.ads.length + 1))).toFixed(1);
  const lines = [
    "# Qualitäts-Report (Self-Critique)",
    "",
    `Ein zweiter KI-Pass bewertet jedes Asset 0–10 gegen die Marken-Regeln. Assets unter **${qa.threshold}/10** werden automatisch einmal nachgebessert.`,
    "",
    `**Nachgebessert:** ${qa.revised.length ? qa.revised.join(", ") : "nichts — alle Assets über der Schwelle"}`,
    "",
    `## Bewertung vor Nachbesserung (Ø ${avg(qa.before)})`,
    "",
    bundleCritiqueMd(qa.before),
    "",
  ];
  if (qa.after) {
    lines.push(`## Bewertung nach Nachbesserung (Ø ${avg(qa.after)})`, "", bundleCritiqueMd(qa.after), "");
  }
  return lines.join("\n");
}

// ---- Posting-Plan Exporte ----

function icsDateFromGerman(s: string): string | null {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}${m[2]}${m[1]}` : null;
}
function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function planToIcs(plan: PostingPlan): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Scaling Champions//Webinar-Promo//DE", "CALSCALE:GREGORIAN"];
  plan.entries.forEach((e, i) => {
    const dt = icsDateFromGerman(e.date);
    if (!dt) return;
    lines.push(
      "BEGIN:VEVENT",
      `UID:promo-${i}-${dt}@scaling-champions`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:${icsEscape(`${e.channel}: ${e.assetLabel}`)}`,
      `DESCRIPTION:${icsEscape(`${e.caption}\n\n(${e.rationale})`)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ---- Kalender-Anbindung: das Webinar selbst als Termin ----
const pad2 = (n: number) => String(n).padStart(2, "0");
function parseGermanDateTime(date: string, time: string) {
  const dm = date.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!dm) return null;
  const tm = time.match(/(\d{1,2})[:.](\d{2})/);
  return { y: +dm[3], mo: +dm[2], d: +dm[1], h: tm ? +tm[1] : 12, mi: tm ? +tm[2] : 0 };
}

export function webinarToCalendar(w: Webinar): { ics: string; google: string; outlook: string } | null {
  const p = parseGermanDateTime(w.date, w.time);
  if (!p) return null;
  const endH = (p.h + 1) % 24;
  const stamp = (h: number) => `${p.y}${pad2(p.mo)}${pad2(p.d)}T${pad2(h)}${pad2(p.mi)}00`;
  const iso = (h: number) => `${p.y}-${pad2(p.mo)}-${pad2(p.d)}T${pad2(h)}:${pad2(p.mi)}:00`;
  const start = stamp(p.h), end = stamp(endH);
  const title = `${w.title}${w.subtitle ? " — " + w.subtitle : ""}`;
  const desc = `${w.subtitle}\n\nHost: ${w.host?.name ?? ""}${w.guest ? " & " + w.guest.name : ""}\nAnmeldung: ${w.registrationUrl ?? ""}`;
  const loc = w.registrationUrl || "Online";

  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Scaling Champions//Webinar-Promo//DE", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:webinar-${start}@scaling-champions`,
    `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${icsEscape(title)}`, `DESCRIPTION:${icsEscape(desc)}`, `LOCATION:${icsEscape(loc)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const google = "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE", text: title, dates: `${start}/${end}`, details: desc, location: loc,
  }).toString();
  const outlook = "https://outlook.live.com/calendar/0/deeplink/compose?" + new URLSearchParams({
    path: "/calendar/action/compose", rru: "addevent", subject: title, startdt: iso(p.h), enddt: iso(endH), body: desc, location: loc,
  }).toString();
  return { ics, google, outlook };
}

export function planToCsv(plan: PostingPlan): string {
  const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const head = ["Datum", "Tage vorher", "Kanal", "Asset", "Format", "Caption", "Begründung"].map(esc).join(",");
  const rows = plan.entries.map((e) =>
    [e.date, e.daysBeforeWebinar, e.channel, e.assetLabel, e.format, e.caption, e.rationale].map(esc).join(","),
  );
  return [head, ...rows].join("\r\n");
}

export function planToMarkdown(plan: PostingPlan, webinar: Webinar): string {
  const lines = [
    `# Posting-Plan — ${webinar.title}`,
    "",
    `Webinar-Termin: ${webinar.date}, ${webinar.time}`,
    "",
    "| Datum | Kanal | Asset | Format | Caption |",
    "|---|---|---|---|---|",
  ];
  plan.entries.forEach((e) =>
    lines.push(`| ${e.date} | ${e.channel} | ${e.assetLabel} | ${e.format} | ${e.caption.replace(/\n/g, " ").replace(/\|/g, "/")} |`),
  );
  return lines.join("\n");
}

export function emailToHtml(email: EmailInvite, accent: string, bannerCid?: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const banner = bannerCid ? `<tr><td><img src="cid:${bannerCid}" alt="" style="width:100%;display:block;border:0;"></td></tr>` : "";
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>${esc(email.subject)}</title></head>
<body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1f29;">
  <div style="display:none;max-height:0;overflow:hidden;">${esc(email.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:${accent};height:6px;"></td></tr>
      ${banner}
      <tr><td style="padding:36px 40px;">
        <p style="font-size:17px;line-height:1.6;margin:0 0 18px;">${esc(email.greeting)}</p>
        ${email.bodyParagraphs.map((p) => `<p style="font-size:17px;line-height:1.6;margin:0 0 18px;">${esc(p)}</p>`).join("\n        ")}
        <p style="font-size:17px;font-weight:700;margin:24px 0 8px;">Im Webinar bekommst du:</p>
        <ul style="font-size:17px;line-height:1.7;margin:0 0 20px;padding-left:22px;">
          ${email.bullets.map((b) => `<li>${esc(b)}</li>`).join("\n          ")}
        </ul>
        <p style="font-size:17px;font-weight:700;margin:0 0 24px;">${esc(email.dateLine)}</p>
        <a href="#" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-size:17px;font-weight:700;padding:14px 30px;border-radius:10px;">${esc(email.cta)}</a>
        <p style="font-size:15px;color:#5a6472;margin:32px 0 0;">${esc(email.signature)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
