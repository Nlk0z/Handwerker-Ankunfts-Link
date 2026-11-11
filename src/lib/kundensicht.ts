import "server-only";
import { auftragPerToken, baldDaPruefen, basisUrl } from "./auftraege";
import { query } from "./db";

/** Nur das, was der Kunde sehen darf (keine Telefonnummer, keine Notiz). */
export type KundenDaten = {
  gueltig: true;
  betrieb: string;
  betriebTelefon: string | null;
  monteur: string | null;
  status: "geplant" | "unterwegs" | "angekommen" | "erledigt" | "storniert";
  termin: string;
  fensterVon: string | null;
  fensterBis: string | null;
  eta: string | null;
  position: { lat: number; lng: number; zeit: string } | null;
  website: string | null;
  bewertungLink: string | null;
  /** Schon abgegebene Bewertung (Sterne), sonst null */
  bewertung: number | null;
};

export async function kundenDaten(token: string): Promise<KundenDaten | { gueltig: false }> {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return { gueltig: false };
  let a = await auftragPerToken(token);
  if (!a || new Date(a.link_gueltig_bis) < new Date()) return { gueltig: false };

  // Gelegenheit nutzen: ist die 15-Minuten-SMS fällig?
  if (a.status === "unterwegs") {
    const basis = await basisUrl();
    if (await baldDaPruefen((t) => `${basis}/t/${t}`, a.id)) a = (await auftragPerToken(token))!;
  }

  // Position nur zeigen, wenn erlaubt, unterwegs und nicht älter als 10 Minuten
  const frisch = a.pos_zeit && Date.now() - new Date(a.pos_zeit).getTime() < 10 * 60_000;
  const position =
    a.karte_aktiv && a.status === "unterwegs" && frisch && a.pos_lat != null && a.pos_lng != null
      ? { lat: a.pos_lat, lng: a.pos_lng, zeit: new Date(a.pos_zeit!).toISOString() }
      : null;

  return {
    gueltig: true,
    betrieb: a.betrieb_name,
    betriebTelefon: a.betrieb_telefon,
    monteur: a.mitarbeiter_name,
    status: a.status,
    termin: a.termin_datum,
    fensterVon: a.fenster_von,
    fensterBis: a.fenster_bis,
    eta: a.eta ? new Date(a.eta).toISOString() : null,
    position,
    website: a.website,
    bewertungLink: a.bewertung_link,
    bewertung: a.bewertung_sterne,
  };
}

/** Bewertung speichern (nur für erledigte Aufträge mit gültigem Link). Eine pro Auftrag, ändern erlaubt. */
export async function bewertungSpeichern(token: string, sterne: number, text: string) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return false;
  if (!Number.isInteger(sterne) || sterne < 1 || sterne > 5) return false;
  const a = await auftragPerToken(token);
  if (!a || a.status !== "erledigt" || new Date(a.link_gueltig_bis) < new Date()) return false;
  await query(
    `INSERT INTO bewertung (auftrag_id, sterne, text) VALUES ($1, $2, $3)
     ON CONFLICT (auftrag_id) DO UPDATE SET sterne = EXCLUDED.sterne, text = EXCLUDED.text, erstellt_am = now()`,
    [a.id, sterne, text.trim().slice(0, 1000) || null],
  );
  return true;
}
