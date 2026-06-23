// Automations-Hook: leitet das Asset-Bundle serverseitig an eine Webhook-URL weiter
// (CORS-sicher). Modus "slack" formatiert eine Slack-Nachricht, sonst generisches JSON.
import { NextResponse } from "next/server";
import type { PromoBundle } from "@/lib/types";

// Einfache SSRF-Absicherung: keine internen/privaten Ziele.
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" || h === "0.0.0.0" || h.endsWith(".local") ||
    h.startsWith("127.") || h.startsWith("10.") || h.startsWith("192.168.") ||
    h.startsWith("169.254.") || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

function avgScore(bundle: PromoBundle): string | null {
  const c = bundle.qa?.after ?? bundle.qa?.before;
  if (!c) return null;
  const all = [...c.ads, c.email];
  return (all.reduce((s, x) => s + x.score, 0) / all.length).toFixed(1);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url: string = body?.url ?? "";
    const slack: boolean = !!body?.slack;
    const bundle: PromoBundle = body?.bundle;
    const webinarTitle: string = body?.webinarTitle ?? bundle?.webinarTitle ?? "Webinar";

    let parsed: URL;
    try { parsed = new URL(url); } catch { return NextResponse.json({ error: "Ungültige URL." }, { status: 400 }); }
    if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
      return NextResponse.json({ error: "URL nicht erlaubt (nur öffentliche http/https-Ziele)." }, { status: 400 });
    }
    if (!bundle?.ads) return NextResponse.json({ error: "Kein Bundle zum Senden." }, { status: 400 });

    const avg = avgScore(bundle);
    const payload = slack
      ? {
          text: `:rocket: *Neues Promo-Set fertig* — ${webinarTitle}`,
          blocks: [
            { type: "header", text: { type: "plain_text", text: `🚀 ${webinarTitle}` } },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${bundle.angles.length} Angles* · *${bundle.ads.length} Anzeigen* × 3 Formate · *1 E-Mail*${avg ? ` · Ø *${avg}/10*` : ""}\n\n` +
                  bundle.angles.map((a) => `• ${a.name}`).join("\n"),
              },
            },
            { type: "context", elements: [{ type: "mrkdwn", text: `Betreff der E-Mail: _${bundle.email.subject}_` }] },
          ],
        }
      : {
          type: "webinar-promo",
          webinarTitle,
          angles: bundle.angles,
          ads: bundle.ads,
          email: bundle.email,
          qa: bundle.qa ?? null,
          averageScore: avg,
        };

    const res = await fetch(parsed.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/webhook] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
