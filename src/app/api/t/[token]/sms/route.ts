import { NextResponse } from "next/server";
import { benachrichtigungen } from "@/lib/auftraege";
import { eins } from "@/lib/db";
import { smsAbsender } from "@/lib/format";
import { gueltigerAuftrag } from "@/lib/kundensicht";

export const dynamic = "force-dynamic";

/**
 * Für die iPhone-Vorschau: die SMS, die an diesen Kunden gingen (älteste zuerst).
 * Wer den Link-Token hat, ist der Empfänger dieser SMS – er sieht hier also nichts Neues.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await gueltigerAuftrag(token);
  if (!a) return NextResponse.json({ absender: null, sms: [] }, { status: 404 });

  const b = await eins<{ sms_absender: string | null }>(`SELECT sms_absender FROM betrieb WHERE id = $1`, [a.betrieb_id]);
  const sms = (await benachrichtigungen(a.id))
    .filter((s) => s.typ !== "anruf_wunsch") // geht an den Monteur, nicht an den Kunden
    .reverse()
    .map((s) => ({ id: s.id, text: s.text, zeit: new Date(s.gesendet_am).toISOString() }));

  return NextResponse.json(
    { absender: smsAbsender(b?.sms_absender, a.betrieb_name), sms },
    { headers: { "Cache-Control": "no-store" } },
  );
}
