import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Merkt sich, dass der Kunde auf „Bei Google bewerten“ getippt hat (für die Auswertung).
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return NextResponse.json({ ok: false }, { status: 400 });
  await query(
    `UPDATE auftrag SET google_klick_am = COALESCE(google_klick_am, now())
      WHERE link_token = $1 AND status = 'erledigt' AND link_gueltig_bis > now()`,
    [token],
  );
  return NextResponse.json({ ok: true });
}
