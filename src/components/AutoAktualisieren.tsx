"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Lädt die Seitendaten regelmäßig neu (z. B. damit neue Kundenantworten auftauchen). */
export function AutoAktualisieren({ sekunden = 20 }: { sekunden?: number }) {
  const router = useRouter();
  useEffect(() => {
    const neu = () => document.visibilityState === "visible" && router.refresh();
    const t = setInterval(neu, sekunden * 1000);
    document.addEventListener("visibilitychange", neu);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", neu); };
  }, [router, sekunden]);
  return null;
}
