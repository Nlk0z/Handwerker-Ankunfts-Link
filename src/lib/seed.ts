import "server-only";
import { passwortHash } from "./auth";
import { heute } from "./format";
import { gueltigBis, neuerToken } from "./auftraege";

type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

export const DEMO_LOGIN = { email: "demo@lukas-technology.de", passwort: "demo1234" };

/**
 * Demo-Datenbank vorbereiten: beim ersten Start einen Beispielbetrieb anlegen,
 * und bei jedem Start Beispiel-Aufträge für heute, falls es heute noch keine gibt.
 * (Sonst wäre die Demo ab dem zweiten Tag leer.)
 */
export async function seedDemo(query: Query) {
  let [chef] = await query<{ id: string; betrieb_id: string }>(
    `SELECT id, betrieb_id FROM mitarbeiter WHERE email = $1`,
    [DEMO_LOGIN.email],
  );
  if (!chef) {
    if ((await query(`SELECT 1 FROM mitarbeiter LIMIT 1`)).length) return; // jemand nutzt die Demo-DB anders
    const [b] = await query<{ id: string }>(
      `INSERT INTO betrieb (name, telefon, sms_absender) VALUES ($1, $2, $3) RETURNING id`,
      ["Elektro Maier", "+499171123456", "ElektroMaie"],
    );
    const hash = await passwortHash(DEMO_LOGIN.passwort);
    [chef] = await query<{ id: string; betrieb_id: string }>(
      `INSERT INTO mitarbeiter (betrieb_id, name, email, passwort_hash, rolle)
       VALUES ($1, 'Thomas Maier', $2, $3, 'inhaber') RETURNING id, betrieb_id`,
      [b!.id, DEMO_LOGIN.email, hash],
    );
    await query(
      `INSERT INTO mitarbeiter (betrieb_id, name, email, passwort_hash, rolle)
       VALUES ($1, 'Jonas Weber', 'jonas@lukas-technology.de', $2, 'monteur')`,
      [b!.id, hash],
    );
  }

  // Demo: Beispiel-Website, damit die Kundenseite nach "erledigt" den Website-Knopf zeigt
  await query(`UPDATE betrieb SET website = 'https://example.com' WHERE id = $1 AND website IS NULL`, [chef!.betrieb_id]);

  await historieAnlegen(query, chef!.betrieb_id);

  const tag = heute();
  const schonDa = await query(`SELECT 1 FROM auftrag WHERE betrieb_id = $1 AND termin_datum = $2 LIMIT 1`, [chef!.betrieb_id, tag]);
  if (schonDa.length) return;

  const [monteur] = await query<{ id: string }>(
    `SELECT id FROM mitarbeiter WHERE betrieb_id = $1 AND rolle = 'monteur' ORDER BY erstellt_am LIMIT 1`,
    [chef!.betrieb_id],
  );
  const auftraege: [string, string, string, string, string, string][] = [
    ["Familie Schneider", "+491701234567", "Hauptstraße 12, 91186 Büchenbach", "08:00", "11:00", chef!.id],
    ["Petra Hofmann", "+491519876543", "Bahnhofstraße 3, 91154 Roth", "11:00", "13:00", chef!.id],
    ["Bäckerei Krug", "+491605551234", "Königsplatz 8, 91126 Schwabach", "13:00", "16:00", monteur?.id ?? chef!.id],
  ];
  for (const [name, tel, adr, von, bis, mid] of auftraege) {
    await query(
      `INSERT INTO auftrag (betrieb_id, mitarbeiter_id, kunde_name, kunde_telefon, adresse,
                            termin_datum, fenster_von, fenster_bis, link_token, link_gueltig_bis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [chef!.betrieb_id, mid, name, tel, adr, tag, von, bis, neuerToken(), gueltigBis(tag)],
    );
  }
}

// ---------- Beispiel-Historie für die Auswertung (nur Demo) ----------

const KUNDEN = [
  "Familie Becker", "Herr Wagner", "Frau Schulz", "Praxis Dr. Huber", "Familie Koch", "Herr Richter",
  "Frau Klein", "Café Sonne", "Familie Wolf", "Herr Neumann", "Frau Braun", "Autohaus Zimmer",
  "Familie Krüger", "Herr Hartmann", "Frau Lange", "Familie Schmitt", "Herr Werner", "Frau Krause",
];
const ORTE = ["91126 Schwabach", "91154 Roth", "91186 Büchenbach", "90455 Nürnberg", "91183 Abenberg", "91161 Hilpoltstein"];
const STRASSEN = ["Hauptstraße", "Bahnhofstraße", "Gartenweg", "Ringstraße", "Kirchplatz", "Am Anger", "Lindenstraße"];
const TEXTE = [
  "Super, dass man genau wusste, wann er kommt. Musste mir nicht den ganzen Tag freinehmen!",
  "Pünktlich, freundlich und sauber gearbeitet.",
  "Die SMS war sehr praktisch, konnte vorher noch schnell einkaufen.",
  "Alles bestens, gerne wieder.",
  "Hat etwas länger gedauert, aber die Verspätung wurde vorher per SMS angekündigt. Top!",
  "Sehr zufrieden.",
  "Schnelle Hilfe, nette Monteure.",
  null, null, null,
];

/** Einfacher Zufall mit festem Startwert, damit die Demo-Zahlen immer gleich aussehen. */
function zufall(start: number) {
  let x = start;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

async function historieAnlegen(query: Query, betriebId: string) {
  const alt = await query(`SELECT 1 FROM auftrag WHERE betrieb_id = $1 AND termin_datum < $2 LIMIT 1`, [betriebId, heute()]);
  if (alt.length) return;
  const team = await query<{ id: string; name: string }>(`SELECT id, name FROM mitarbeiter WHERE betrieb_id = $1`, [betriebId]);
  const r = zufall(42);
  const wahl = <T,>(liste: T[]) => liste[Math.floor(r() * liste.length)]!;
  const fenster: [number, number][] = [[8, 11], [11, 13], [13, 16]];

  for (let zurueck = 60; zurueck >= 1; zurueck--) {
    const d = new Date(`${heute()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - zurueck);
    const wochentag = d.getUTCDay();
    if (wochentag === 0 || wochentag === 6) continue; // Wochenende
    const datum = d.toISOString().slice(0, 10);
    const anzahl = 3 + Math.floor(r() * 3);

    for (let i = 0; i < anzahl; i++) {
      const [von, bis] = fenster[i % 3]!;
      const storniert = r() < 0.06;
      const losMin = von * 60 + Math.floor(r() * 60); // Abfahrt (Minuten ab Mitternacht)
      const fahrt = 15 + Math.floor(r() * 31);
      const verspaetet = r() < 0.12;
      const extra = verspaetet ? 15 + Math.floor(r() * 20) : 0;
      const etaMin = losMin + fahrt + extra;
      const abweichung = r() < 0.88 ? Math.floor(r() * 16) - 6 : 11 + Math.floor(r() * 15);
      const ankunftMin = etaMin + abweichung;
      const aufrufe = r() < 0.86 ? 1 + Math.floor(r() * 4) : 0;
      const ts = (min: number) => `(($2::date + make_interval(mins => ${Math.round(min)})) AT TIME ZONE 'Europe/Berlin')`;

      const [a] = await query<{ id: string }>(
        `INSERT INTO auftrag (betrieb_id, mitarbeiter_id, kunde_name, kunde_telefon, adresse, termin_datum,
                              fenster_von, fenster_bis, status, eta, losgefahren_am, angekommen_am,
                              link_token, link_gueltig_bis, link_aufrufe, link_erster_aufruf)
         VALUES ($1, $3, $4, '+491700000000', $5, $2::date, $6, $7, $8,
                 ${storniert ? "NULL" : ts(etaMin)}, ${storniert ? "NULL" : ts(losMin)}, ${storniert ? "NULL" : ts(ankunftMin)},
                 $9, $2::date + 2, $10, ${aufrufe && !storniert ? ts(losMin + 3) : "NULL"})
         RETURNING id`,
        [
          betriebId, datum, wahl(team).id, wahl(KUNDEN), `${wahl(STRASSEN)} ${1 + Math.floor(r() * 40)}, ${wahl(ORTE)}`,
          `${String(von).padStart(2, "0")}:00`, `${String(bis).padStart(2, "0")}:00`,
          storniert ? "storniert" : "erledigt", neuerToken(), storniert ? 0 : aufrufe,
        ],
      );
      if (storniert) continue;

      const sms: [string, number][] = [["losgefahren", losMin]];
      if (verspaetet) sms.push(["verspaetung", losMin + 10]);
      if (fahrt + extra > 20) sms.push(["bald_da", etaMin - 15]);
      sms.push(["angekommen", ankunftMin], ["erledigt", ankunftMin + 60 + Math.floor(r() * 90)]);
      for (const [typ, min] of sms) {
        await query(
          `INSERT INTO benachrichtigung (auftrag_id, typ, text, status, gesendet_am) VALUES ($1, $3, $4, 'demo', ${ts(min)})`,
          [a!.id, datum, typ, "(Beispiel-SMS)"],
        );
      }

      if (r() < 0.45) {
        const w = r();
        const sterne = w < 0.6 ? 5 : w < 0.88 ? 4 : w < 0.96 ? 3 : w < 0.99 ? 2 : 1;
        const text = sterne <= 3 ? "Hat geklappt, aber der Termin war leider erst spät am Tag." : wahl(TEXTE);
        await query(
          `INSERT INTO bewertung (auftrag_id, sterne, text, erstellt_am) VALUES ($1, $3, $4, ${ts(ankunftMin + 180)})`,
          [a!.id, datum, sterne, text],
        );
      }
    }
  }
}
