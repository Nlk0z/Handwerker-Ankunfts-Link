import "server-only";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { eins, query } from "./db";
import { sendeSms, type KundenSmsTyp, type SmsTyp } from "./sms";
import { smsAbsender, telefonAnzeige, uhrzeit, zeitfenster } from "./format";

export type Status = "geplant" | "unterwegs" | "angekommen" | "erledigt" | "storniert";

export type Auftrag = {
  id: string;
  betrieb_id: string;
  mitarbeiter_id: string | null;
  mitarbeiter_name: string | null;
  kunde_name: string;
  kunde_telefon: string;
  adresse: string | null;
  termin_datum: string; // YYYY-MM-DD
  fenster_von: string | null; // HH:MM:SS
  fenster_bis: string | null;
  status: Status;
  eta: Date | null;
  losgefahren_am: Date | null;
  angekommen_am: Date | null;
  link_token: string;
  link_gueltig_bis: Date;
  pos_lat: number | null;
  pos_lng: number | null;
  pos_zeit: Date | null;
  notiz: string | null;
};

const SPALTEN = `
  a.id, a.betrieb_id, a.mitarbeiter_id, m.name AS mitarbeiter_name,
  a.kunde_name, a.kunde_telefon, a.adresse,
  a.termin_datum::text AS termin_datum, a.fenster_von::text AS fenster_von, a.fenster_bis::text AS fenster_bis,
  a.status, a.eta, a.losgefahren_am, a.angekommen_am, a.link_token, a.link_gueltig_bis,
  a.pos_lat, a.pos_lng, a.pos_zeit, a.notiz`;

const VON = `FROM auftrag a LEFT JOIN mitarbeiter m ON m.id = a.mitarbeiter_id`;

export function neuerToken() {
  return randomBytes(12).toString("base64url"); // 16 Zeichen, nicht erratbar
}

/** Link bleibt bis 2 Tage nach dem Termin gültig. */
export function gueltigBis(terminDatum: string) {
  const d = new Date(`${terminDatum}T23:59:00Z`);
  d.setUTCDate(d.getUTCDate() + 2);
  return d;
}

export async function auftraegeAmTag(betriebId: string, datum: string) {
  return query<Auftrag & { neue_antworten: number; anruf_gewuenscht: boolean }>(
    `SELECT ${SPALTEN},
            (SELECT count(*)::int FROM kunden_antwort k WHERE k.auftrag_id = a.id AND k.gelesen_am IS NULL) AS neue_antworten,
            EXISTS (SELECT 1 FROM kunden_antwort k WHERE k.auftrag_id = a.id AND k.gelesen_am IS NULL AND k.typ = 'anrufen') AS anruf_gewuenscht
       ${VON}
      WHERE a.betrieb_id = $1 AND a.termin_datum = $2
      ORDER BY (a.status IN ('erledigt','storniert')), a.fenster_von NULLS LAST, a.erstellt_am`,
    [betriebId, datum],
  );
}

export async function auftragLaden(betriebId: string, id: string) {
  return eins<Auftrag>(`SELECT ${SPALTEN} ${VON} WHERE a.betrieb_id = $1 AND a.id = $2`, [betriebId, id]);
}

export type KundenSicht = Auftrag & {
  betrieb_name: string;
  betrieb_telefon: string | null;
  karte_aktiv: boolean;
};

export async function auftragPerToken(token: string) {
  return eins<KundenSicht>(
    `SELECT ${SPALTEN}, b.name AS betrieb_name, b.telefon AS betrieb_telefon, b.karte_aktiv
       ${VON} JOIN betrieb b ON b.id = a.betrieb_id
      WHERE a.link_token = $1`,
    [token],
  );
}

export async function benachrichtigungen(auftragId: string) {
  return query<{ id: string; typ: SmsTyp; text: string; status: string; fehler: string | null; gesendet_am: Date }>(
    `SELECT id, typ, text, status, fehler, gesendet_am FROM benachrichtigung
      WHERE auftrag_id = $1 ORDER BY gesendet_am DESC`,
    [auftragId],
  );
}

/** Öffentliche Adresse der App für den Link in der SMS. */
export async function basisUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function smsZumAuftrag(a: Auftrag, typ: KundenSmsTyp, link: string) {
  const b = await eins<{ name: string; sms_absender: string | null }>(
    `SELECT name, sms_absender FROM betrieb WHERE id = $1`,
    [a.betrieb_id],
  );
  const wer = a.mitarbeiter_name ? `${a.mitarbeiter_name} von ${b?.name}` : b?.name;
  const zeit = uhrzeit(a.eta);
  const texte: Record<KundenSmsTyp, string> = {
    losgefahren: `Hallo ${a.kunde_name}, ${wer} ist losgefahren. Ankunft ca. ${zeit} Uhr. Live verfolgen: ${link}`,
    bald_da: `${wer} ist in ca. 15 Minuten bei Ihnen (ca. ${zeit} Uhr). ${link}`,
    verspaetung: `Kleine Verspätung: ${wer} kommt jetzt ca. ${zeit} Uhr. Entschuldigung! ${link}`,
  };
  return sendeSms({ auftragId: a.id, typ, an: a.kunde_telefon, text: texte[typ], absender: smsAbsender(b?.sms_absender, b?.name ?? "") });
}

export async function losfahren(betriebId: string, id: string, minuten: number, link: string) {
  const a = await eins<{ id: string }>(
    `UPDATE auftrag SET status = 'unterwegs', losgefahren_am = now(),
            eta = now() + make_interval(mins => $3)
      WHERE betrieb_id = $1 AND id = $2 AND status IN ('geplant', 'unterwegs')
      RETURNING id`,
    [betriebId, id, minuten],
  );
  if (!a) return;
  const auftrag = (await auftragLaden(betriebId, id))!;
  await smsZumAuftrag(auftrag, "losgefahren", link);
  // Ist die Fahrt kürzer als 15 Minuten, ersetzt die erste SMS die "bald da"-Nachricht.
}

export async function verspaetung(betriebId: string, id: string, minutenAbJetzt: number, link: string) {
  const a = await eins<{ id: string }>(
    `UPDATE auftrag SET eta = now() + make_interval(mins => $3)
      WHERE betrieb_id = $1 AND id = $2 AND status = 'unterwegs' RETURNING id`,
    [betriebId, id, minutenAbJetzt],
  );
  if (!a) return;
  const auftrag = (await auftragLaden(betriebId, id))!;
  await smsZumAuftrag(auftrag, "verspaetung", link);
}

export async function statusSetzen(betriebId: string, id: string, status: "angekommen" | "erledigt" | "storniert") {
  const extra = status === "angekommen" ? ", angekommen_am = now()" : "";
  // Nach Abschluss läuft der Kundenlink noch 2 Stunden, danach ist er ungültig.
  const ablauf = status !== "angekommen" ? ", link_gueltig_bis = LEAST(link_gueltig_bis, now() + interval '2 hours')" : "";
  await query(`UPDATE auftrag SET status = $3 ${extra} ${ablauf} WHERE betrieb_id = $1 AND id = $2`, [
    betriebId,
    id,
    status,
  ]);
}

/**
 * Schickt einmalig die "In ca. 15 Minuten da"-SMS, wenn die Ankunft näher als 15 Minuten ist.
 * Wird aufgerufen, wenn der Monteur seine Position meldet, die Kundenseite neu lädt
 * oder der Zeitplan /api/cron läuft.
 */
export async function baldDaPruefen(link: (token: string) => string, nurAuftragId?: string) {
  const kandidaten = await query<Auftrag>(
    `SELECT ${SPALTEN} ${VON}
      WHERE a.status = 'unterwegs' AND a.eta <= now() + interval '15 minutes'
        AND a.losgefahren_am <= now() - interval '5 minutes'
        AND a.eta - a.losgefahren_am > interval '20 minutes'
        AND NOT EXISTS (SELECT 1 FROM benachrichtigung n
                         WHERE n.auftrag_id = a.id AND n.typ = 'bald_da')
        ${nurAuftragId ? "AND a.id = $1" : ""}`,
    nurAuftragId ? [nurAuftragId] : [],
  );
  for (const a of kandidaten) await smsZumAuftrag(a, "bald_da", link(a.link_token));
  return kandidaten.length;
}

export async function positionSpeichern(betriebId: string, id: string, lat: number, lng: number) {
  await query(
    `UPDATE auftrag SET pos_lat = $3, pos_lng = $4, pos_zeit = now()
      WHERE betrieb_id = $1 AND id = $2 AND status = 'unterwegs'`,
    [betriebId, id, lat, lng],
  );
}

/**
 * Kunde hat "Bitte vorher anrufen" gedrückt: SMS an den zuständigen Monteur
 * (ohne Handynummer an den Inhaber). Die Nummer in der SMS kann man direkt antippen.
 * Höchstens eine solche SMS pro Auftrag in 30 Minuten.
 */
export async function anrufWunschMelden(auftragId: string) {
  const a = await eins<Auftrag & { betrieb_name: string; sms_absender: string | null }>(
    `SELECT ${SPALTEN}, b.name AS betrieb_name, b.sms_absender
       ${VON} JOIN betrieb b ON b.id = a.betrieb_id WHERE a.id = $1`,
    [auftragId],
  );
  if (!a) return null;
  const schon = await eins(
    `SELECT 1 FROM benachrichtigung WHERE auftrag_id = $1 AND typ = 'anruf_wunsch'
        AND gesendet_am > now() - interval '30 minutes'`,
    [auftragId],
  );
  if (schon) return null;

  const empfaenger = await eins<{ handy: string }>(
    `SELECT handy FROM mitarbeiter
      WHERE betrieb_id = $1 AND handy IS NOT NULL
      ORDER BY (id = $2) DESC, (rolle = 'inhaber') DESC, erstellt_am
      LIMIT 1`,
    [a.betrieb_id, a.mitarbeiter_id],
  );
  if (!empfaenger) return null;

  const termin = a.status === "unterwegs" && a.eta ? `Ankunft ca. ${uhrzeit(a.eta)} Uhr` : `Termin ${zeitfenster(a.fenster_von, a.fenster_bis)}`;
  const text = `Rückruf-Wunsch: ${a.kunde_name} bittet um kurzen Anruf. Tel. ${telefonAnzeige(a.kunde_telefon)} (${termin})`;
  return sendeSms({ auftragId: a.id, typ: "anruf_wunsch", an: empfaenger.handy, text, absender: smsAbsender(a.sms_absender, a.betrieb_name) });
}
