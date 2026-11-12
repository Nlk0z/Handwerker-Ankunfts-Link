"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Lädt die Seitendaten regelmäßig neu (z. B. damit neue Kundenantworten auftauchen).
 * Die iPhone-Vorschau stößt das zusätzlich über das Ereignis "vorschau-aktualisieren" an.
 */
export function AutoAktualisieren({ sekunden = 20 }: { sekunden?: number }) {
  const router = useRouter();
  useEffect(() => {
    const neu = () => document.visibilityState === "visible" && router.refresh();
    const t = setInterval(neu, sekunden * 1000);
    document.addEventListener("visibilitychange", neu);
    window.addEventListener("vorschau-aktualisieren", neu);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", neu);
      window.removeEventListener("vorschau-aktualisieren", neu);
    };
  }, [router, sekunden]);
  return null;
}
