// Login/Logout fürs Passwort-Gate. Setzt ein httpOnly-Cookie mit dem AUTH_TOKEN.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "pa_auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.APP_PASSWORD || !process.env.AUTH_TOKEN) {
    return NextResponse.json({ error: "Auth ist nicht konfiguriert (APP_PASSWORD/AUTH_TOKEN fehlen)." }, { status: 500 });
  }
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
  }
  const store = await cookies();
  store.set(COOKIE, process.env.AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE);
  return NextResponse.json({ ok: true });
}
