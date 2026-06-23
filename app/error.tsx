"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertTriangle } from "lucide-react";

// Route-Error-Boundary: fängt unerwartete Render-/Daten-Fehler ab, statt eine weiße Seite zu zeigen.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-4">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold">Etwas ist schiefgelaufen</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Ein unerwarteter Fehler ist aufgetreten. Deine Eingaben bleiben erhalten — versuch es einfach noch einmal.
        </p>
        {error.digest && <p className="text-[11px] text-muted-foreground mt-2 font-mono">Ref: {error.digest}</p>}
        <Button onClick={reset} className="mt-5"><RotateCcw className="h-4 w-4" /> Erneut versuchen</Button>
      </div>
    </main>
  );
}
