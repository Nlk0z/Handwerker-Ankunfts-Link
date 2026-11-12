import "server-only";
import { eins, query } from "./db";

/** Was der Kunde auf seiner Seite zurückmelden kann. */
export const ANTWORT_TYPEN = ["passt", "anrufen", "hinweis"] as const;
export type AntwortTyp = (typeof ANTWORT_TYPEN)[number];

export const HINWEIS_MAX = 300;
const MAX_PRO_AUFTRAG = 20;

export type Antwort = {
  id: string;
  typ: AntwortTyp;
  text: string | null;
  gelesen_am: Date | null;
  erstellt_am: Date;
};

export async function antwortenZumAuftrag(auftragId: string) {
  return query<Antwort>(
    `SELECT id, typ, text, gelesen_am, erstellt_am FROM kunden_antwort
      WHERE auftrag_id = $1 ORDER BY erstellt_am DESC`,
    [auftragId],
  );
}

/** Alles Ungelesene beim Öffnen des Auftrags als gelesen markieren. */
export async function antwortenGelesen(auftragId: string) {
  await query(`UPDATE kunden_antwort SET gelesen_am = now() WHERE auftrag_id = $1 AND gelesen_am IS NULL`, [
    auftragId,
  ]);
}

/** neu = false, wenn dieselbe Antwort gerade schon gespeichert war (doppelt getippt). */
export type AntwortErgebnis = { ok: true; neu: boolean } | { ok: false; fehler: string };

/**
 * Speichert eine Rückmeldung vom Kunden. Der Aufrufer hat den Link-Token schon geprüft.
 * Schutz gegen Spam: höchstens 20 Antworten pro Auftrag, gleiche Knopf-Antwort nicht doppelt hintereinander.
 */
export async function antwortSpeichern(auftragId: string, typ: unknown, roh: unknown): Promise<AntwortErgebnis> {
  if (!ANTWORT_TYPEN.includes(typ as AntwortTyp)) return { ok: false, fehler: "Unbekannte Antwort." };
  const t = typ as AntwortTyp;
  const text = t === "hinweis" ? String(roh ?? "").trim().replace(/\s+/g, " ") : null;
  if (t === "hinweis" && !text) return { ok: false, fehler: "Bitte einen Hinweis eingeben." };
  if (text && text.length > HINWEIS_MAX) return { ok: false, fehler: `Höchstens ${HINWEIS_MAX} Zeichen.` };

  const zahl = await eins<{ n: number }>(`SELECT count(*)::int AS n FROM kunden_antwort WHERE auftrag_id = $1`, [
    auftragId,
  ]);
  if ((zahl?.n ?? 0) >= MAX_PRO_AUFTRAG) {
    return { ok: false, fehler: "Zu viele Nachrichten. Bitte rufen Sie den Betrieb direkt an." };
  }

  const letzte = await eins<{ typ: AntwortTyp; text: string | null }>(
    `SELECT typ, text FROM kunden_antwort WHERE auftrag_id = $1 ORDER BY erstellt_am DESC LIMIT 1`,
    [auftragId],
  );
  if (letzte && letzte.typ === t && letzte.text === text) return { ok: true, neu: false }; // doppelt getippt

  await query(`INSERT INTO kunden_antwort (auftrag_id, typ, text) VALUES ($1, $2, $3)`, [auftragId, t, text]);
  return { ok: true, neu: true };
}
