import { NextResponse } from "next/server";
import { istDemo, query } from "@/lib/db";
import { heute } from "@/lib/format";

export const dynamic = "force-dynamic";

// Nur im Demo-Modus: die zuletzt "verschickten" SMS, damit das Kunden-iPhone
// in der iPhone-Vorschau sie wie echte Nachrichten anzeigen kann.
export async function GET() {
  if (!istDemo()) return NextResponse.json({ fehler: "nur im Demo-Modus" }, { status: 404 });
  const sms = await query<{ id: string; text: string; gesendet_am: Date; an: string; kunde: string; absender: string }>(
    `SELECT n.id, n.text, n.gesendet_am, a.kunde_telefon AS an, a.kunde_name AS kunde,
            COALESCE(NULLIF(b.sms_absender, ''), b.name) AS absender
       FROM benachrichtigung n
       JOIN auftrag a ON a.id = n.auftrag_id
       JOIN betrieb b ON b.id = a.betrieb_id
      WHERE a.termin_datum = $1 -- nur heute (die Beispiel-Historie der Auswertung nicht aufs Handy)
      ORDER BY n.gesendet_am DESC
      LIMIT 30`,
    [heute()],
  );
  return NextResponse.json(
    sms.reverse().map((s) => ({ ...s, gesendet_am: new Date(s.gesendet_am).toISOString() })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
