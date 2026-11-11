// Hilfsfunktionen für Zeit und Telefonnummern (deutsche Zeitzone, egal wo der Server steht).

export const ZONE = "Europe/Berlin";

/** Heutiges Datum in Deutschland als "YYYY-MM-DD". */
export function heute(datum = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(datum);
}

/** "09:40" */
export function uhrzeit(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" }).format(
    new Date(d),
  );
}

/** "08:00:00" -> "8" bzw. "08:30:00" -> "8:30" */
export function fensterZeit(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":");
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
}

export function zeitfenster(von?: string | null, bis?: string | null) {
  if (von && bis) return `${fensterZeit(von)}–${fensterZeit(bis)} Uhr`;
  if (von) return `ab ${fensterZeit(von)} Uhr`;
  if (bis) return `bis ${fensterZeit(bis)} Uhr`;
  return "ganztägig";
}

/** "Sa., 7. Nov." */
export function datumKurz(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, weekday: "short", day: "numeric", month: "short" }).format(d);
}

/**
 * Deutsche Handynummer ins internationale Format bringen.
 * "0171 123 45 67" -> "+491711234567". Gibt null zurück, wenn ungültig.
 */
export function normalisiereTelefon(eingabe: string): string | null {
  let n = eingabe.replace(/[\s\-/().]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  else if (n.startsWith("0")) n = "+49" + n.slice(1);
  else if (!n.startsWith("+")) n = "+49" + n;
  return /^\+\d{8,15}$/.test(n) ? n : null;
}

/** "+491711234567" -> "01711234567" (zur Anzeige; Vorwahl-Länge ist unbekannt, daher ohne Leerzeichen) */
export function telefonAnzeige(n: string) {
  return n.startsWith("+49") ? "0" + n.slice(3) : n;
}

export function initialen(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => t[0]!.toUpperCase())
    .join("");
}
