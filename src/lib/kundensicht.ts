import "server-only";
import { auftragPerToken, baldDaPruefen, basisUrl } from "./auftraege";
import { antwortenZumAuftrag, type AntwortTyp } from "./antworten";

/** Nur das, was der Kunde sehen darf (keine Telefonnummer, keine Notiz). */
export type KundenDaten = {
  gueltig: true;
  betrieb: string;
  betriebTelefon: string | null;
  betriebWebsite: string | null;
  monteur: string | null;
  status: "geplant" | "unterwegs" | "angekommen" | "erledigt" | "storniert";
  termin: string;
  fensterVon: string | null;
  fensterBis: string | null;
  eta: string | null;
  position: { lat: number; lng: number; zeit: string } | null;
  /** Nur solange der Termin noch bevorsteht oder läuft, kann der Kunde antworten. */
  kannAntworten: boolean;
  /** Eigene Rückmeldungen des Kunden, neueste zuerst. */
  antworten: { id: string; typ: AntwortTyp; text: string | null; zeit: string; gelesen: boolean }[];
};

/** Prüft den Link und gibt den Auftrag zurück, wenn er noch gültig ist. */
export async function gueltigerAuftrag(token: string) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return null;
  const a = await auftragPerToken(token);
  if (!a || new Date(a.link_gueltig_bis) < new Date()) return null;
  return a;
}

export async function kundenDaten(token: string): Promise<KundenDaten | { gueltig: false }> {
  let a = await gueltigerAuftrag(token);
  if (!a) return { gueltig: false };

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
    betriebWebsite: a.betrieb_website,
    monteur: a.mitarbeiter_name,
    status: a.status,
    termin: a.termin_datum,
    fensterVon: a.fenster_von,
    fensterBis: a.fenster_bis,
    eta: a.eta ? new Date(a.eta).toISOString() : null,
    position,
    kannAntworten: a.status === "geplant" || a.status === "unterwegs",
    antworten: (await antwortenZumAuftrag(a.id)).map((x) => ({
      id: x.id,
      typ: x.typ,
      text: x.text,
      zeit: new Date(x.erstellt_am).toISOString(),
      gelesen: x.gelesen_am != null,
    })),
  };
}
