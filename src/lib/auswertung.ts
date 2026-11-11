import "server-only";
import { eins, query } from "./db";
import { heute } from "./format";

/** Annahmen für die Schätzung „gesparte Anrufe“ – bewusst vorsichtig, steht so auch in der App. */
export const ANNAHME = { anrufQuote: 1 / 3, minutenProAnruf: 4 };

export type Auswertung = {
  von: string;
  bis: string;
  auftraege: number;
  erledigt: number;
  informiert: number; // Kunde hat eine "Losgefahren"-SMS bekommen
  geoeffnet: number; // davon Link geöffnet
  mitAnkunft: number;
  puenktlich: number; // angekommen spätestens 10 Min. nach der zuletzt angekündigten Zeit
  zuGoogle: number; // Kunden, die auf „Bei Google bewerten“ getippt haben
  sms: Record<string, number>;
  smsGesamt: number;
  bewertungen: { id: string; sterne: number; text: string | null; kunde_name: string; termin_datum: string }[];
  verteilung: number[]; // Index 0 = 1 Stern … 4 = 5 Sterne
  schnitt: number | null;
  gesparteAnrufe: number;
  gesparteMinuten: number;
};

function tageZurueck(iso: string, tage: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - tage);
  return d.toISOString().slice(0, 10);
}

export async function auswertung(betriebId: string, tage: number): Promise<Auswertung> {
  const bis = heute();
  const von = tageZurueck(bis, tage - 1);
  const z = await eins<Record<string, string | number>>(
    `SELECT count(*) FILTER (WHERE status <> 'storniert')                                   AS auftraege,
            count(*) FILTER (WHERE status = 'erledigt')                                     AS erledigt,
            count(*) FILTER (WHERE losgefahren_am IS NOT NULL)                              AS informiert,
            count(*) FILTER (WHERE losgefahren_am IS NOT NULL AND link_aufrufe > 0)         AS geoeffnet,
            count(*) FILTER (WHERE angekommen_am IS NOT NULL AND eta IS NOT NULL)           AS mit_ankunft,
            count(*) FILTER (WHERE angekommen_am IS NOT NULL AND eta IS NOT NULL
                               AND angekommen_am <= eta + interval '10 minutes')            AS puenktlich,
            count(*) FILTER (WHERE google_klick_am IS NOT NULL)                             AS zu_google
       FROM auftrag
      WHERE betrieb_id = $1 AND termin_datum BETWEEN $2 AND $3`,
    [betriebId, von, bis],
  );
  const sms = await query<{ typ: string; anzahl: string | number }>(
    `SELECT n.typ, count(*) AS anzahl
       FROM benachrichtigung n JOIN auftrag a ON a.id = n.auftrag_id
      WHERE a.betrieb_id = $1 AND a.termin_datum BETWEEN $2 AND $3
      GROUP BY n.typ`,
    [betriebId, von, bis],
  );
  const bewertungen = await query<Auswertung["bewertungen"][number]>(
    `SELECT bw.id, bw.sterne, bw.text, a.kunde_name, a.termin_datum::text AS termin_datum
       FROM bewertung bw JOIN auftrag a ON a.id = bw.auftrag_id
      WHERE a.betrieb_id = $1 AND a.termin_datum BETWEEN $2 AND $3
      ORDER BY bw.erstellt_am DESC`,
    [betriebId, von, bis],
  );

  const n = (k: string) => Number(z?.[k] ?? 0);
  const verteilung = [0, 0, 0, 0, 0];
  for (const b of bewertungen) verteilung[b.sterne - 1]!++;
  const smsMap = Object.fromEntries(sms.map((s) => [s.typ, Number(s.anzahl)]));
  const informiert = n("informiert");
  const gesparteAnrufe = Math.round(informiert * ANNAHME.anrufQuote);

  return {
    von,
    bis,
    auftraege: n("auftraege"),
    erledigt: n("erledigt"),
    informiert,
    geoeffnet: n("geoeffnet"),
    mitAnkunft: n("mit_ankunft"),
    puenktlich: n("puenktlich"),
    zuGoogle: n("zu_google"),
    sms: smsMap,
    smsGesamt: Object.values(smsMap).reduce((a, b) => a + b, 0),
    bewertungen,
    verteilung,
    schnitt: bewertungen.length ? bewertungen.reduce((a, b) => a + b.sterne, 0) / bewertungen.length : null,
    gesparteAnrufe,
    gesparteMinuten: gesparteAnrufe * ANNAHME.minutenProAnruf,
  };
}
