"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login fehlgeschlagen");
      router.replace("/"); router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e)); setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded bg-primary" />
            <span className="font-semibold text-sm">Northpeak</span>
          </div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Lock className="h-4 w-4" /> Webinar-Promo-System
          </CardTitle>
          <CardDescription>Bitte mit dem Demo-Passwort anmelden.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Passwort</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoFocus />
            </div>
            {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
