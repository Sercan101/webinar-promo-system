// Passwort-Gate (Next 16 Proxy). Schützt Seiten + APIs; /login und /api/auth bleiben offen.
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "pa_auth";

export function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const authed = !!process.env.AUTH_TOKEN && token === process.env.AUTH_TOKEN;
  if (authed) return NextResponse.next();

  // Wenn gar kein Passwort konfiguriert ist: offener Demo-Modus (nicht aussperren).
  if (!process.env.APP_PASSWORD) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Alles außer /login, /api/auth, statische Assets und öffentlichem Favicon/OG-Bild.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon|opengraph-image).*)"],
};
