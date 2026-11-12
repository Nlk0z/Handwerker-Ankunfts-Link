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

/**
 * SMS-Absender aus dem Betriebsnamen. Das SMS-System erlaubt als Namen nur 11 Zeichen (A–Z, 0–9).
 * "Elektro Müller GmbH" -> "ElektroMuel", "Bad & Heizung Huber e.K." -> "BadHeizungH"
 */
export function absenderAusName(name: string) {
  const ohneUmlaute = name
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss");
  // Rechtsform weglassen, die bringt im Absender nichts
  const ohneRechtsform = ohneUmlaute.replace(
    /(&|\bund\b)\s*Co\.?(\s*KG)?|\b(GmbH|mbH|KG|OHG|GbR|UG|AG|e\.\s?K(fm|fr)?\.?|Inh\..*)(?=\s|$|\.)/gi,
    " ",
  );
  const woerter = ohneRechtsform.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const zusammen = woerter.map((w) => w[0]!.toUpperCase() + w.slice(1)).join("").slice(0, 11);
  // Nur Ziffern würde als Telefonnummer gelten -> dann lieber neutral
  return /[A-Za-z]/.test(zusammen) ? zusammen : "Handwerker";
}

/** Eigener Absender (bereinigt) oder automatisch aus dem Namen. */
export function smsAbsender(eigener: string | null | undefined, betriebName: string) {
  const sauber = (eigener ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  return /[A-Za-z]/.test(sauber) ? sauber : absenderAusName(betriebName);
}
