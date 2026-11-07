import "server-only";
import { passwortHash } from "./auth";
import { heute } from "./format";
import { gueltigBis, neuerToken } from "./auftraege";

type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

export const DEMO_LOGIN = { email: "demo@lukas-technology.de", passwort: "demo1234" };

/** Legt beim ersten Start der Demo-Datenbank einen Beispielbetrieb an. */
export async function seedDemo(query: Query) {
  const vorhanden = await query(`SELECT 1 FROM mitarbeiter LIMIT 1`);
  if (vorhanden.length) return;

  const [b] = await query<{ id: string }>(
    `INSERT INTO betrieb (name, telefon, sms_absender) VALUES ($1, $2, $3) RETURNING id`,
    ["Elektro Maier", "+499171123456", "ElektroMaie"],
  );
  const hash = await passwortHash(DEMO_LOGIN.passwort);
  const [chef] = await query<{ id: string }>(
    `INSERT INTO mitarbeiter (betrieb_id, name, email, passwort_hash, rolle)
     VALUES ($1, 'Thomas Maier', $2, $3, 'inhaber') RETURNING id`,
    [b!.id, DEMO_LOGIN.email, hash],
  );
  const [monteur] = await query<{ id: string }>(
    `INSERT INTO mitarbeiter (betrieb_id, name, email, passwort_hash, rolle)
     VALUES ($1, 'Jonas Weber', 'jonas@lukas-technology.de', $2, 'monteur') RETURNING id`,
    [b!.id, hash],
  );

  const tag = heute();
  const auftraege: [string, string, string, string, string, string][] = [
    ["Familie Schneider", "+491701234567", "Hauptstraße 12, 91186 Büchenbach", "08:00", "11:00", chef!.id],
    ["Petra Hofmann", "+491519876543", "Bahnhofstraße 3, 91154 Roth", "11:00", "13:00", chef!.id],
    ["Bäckerei Krug", "+491605551234", "Königsplatz 8, 91126 Schwabach", "13:00", "16:00", monteur!.id],
  ];
  for (const [name, tel, adr, von, bis, mid] of auftraege) {
    await query(
      `INSERT INTO auftrag (betrieb_id, mitarbeiter_id, kunde_name, kunde_telefon, adresse,
                            termin_datum, fenster_von, fenster_bis, link_token, link_gueltig_bis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [b!.id, mid, name, tel, adr, tag, von, bis, neuerToken(), gueltigBis(tag)],
    );
  }
}
