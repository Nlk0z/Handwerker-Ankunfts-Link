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
