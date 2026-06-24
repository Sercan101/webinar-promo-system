// E-Mail-Versand über eigenen SMTP-Server (nodemailer) — kein Drittanbieter (Resend etc.).
// Zugangsdaten kommen pro Request vom Client und werden serverseitig NICHT gespeichert.
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RECIPIENTS = 50;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { smtp, from, to, subject, html, text, image } = body ?? {};

    // Optionales Inline-Bild (ausgewähltes Creative) → als cid-Anhang.
    let attachments: { filename: string; content: Buffer; cid: string; contentType: string }[] | undefined;
    if (typeof image === "string") {
      const m = image.match(/^data:([^;]+);base64,(.+)$/);
      if (m) attachments = [{ filename: m[1].includes("png") ? "creative.png" : "creative.jpg", content: Buffer.from(m[2], "base64"), cid: "promo-banner", contentType: m[1] }];
    }

    if (!smtp?.host || !smtp?.port) return NextResponse.json({ error: "SMTP-Host und -Port fehlen." }, { status: 400 });
    if (!from) return NextResponse.json({ error: "Absender-Adresse fehlt." }, { status: 400 });
    if (!subject || (!html && !text)) return NextResponse.json({ error: "Betreff oder Inhalt fehlt." }, { status: 400 });

    const recipients: string[] = (Array.isArray(to) ? to : [])
      .map((s: string) => String(s).trim())
      .filter((s: string) => EMAIL_RE.test(s));
    if (recipients.length === 0) return NextResponse.json({ error: "Keine gültigen Empfänger-Adressen." }, { status: 400 });
    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `Zu viele Empfänger (max. ${MAX_RECIPIENTS}). Für größere Listen einen ESP/Webhook nutzen.` }, { status: 400 });
    }

    const port = Number(smtp.port);
    const transporter = nodemailer.createTransport({
      host: String(smtp.host),
      port,
      secure: smtp.secure ?? port === 465,
      auth: smtp.user ? { user: String(smtp.user), pass: String(smtp.pass ?? "") } : undefined,
    });

    // Verbindung/Login vorab prüfen → klare Fehlermeldung bei falschen Zugangsdaten.
    await transporter.verify();

    let sent = 0;
    const errors: string[] = [];
    for (const rcpt of recipients) {
      try {
        await transporter.sendMail({ from, to: rcpt, subject, html, text, attachments });
        sent++;
      } catch (e) {
        errors.push(`${rcpt}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return NextResponse.json({ sent, total: recipients.length, errors: errors.slice(0, 5) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/send-email] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
