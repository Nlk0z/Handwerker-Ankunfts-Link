import { NextResponse } from "next/server";
import { aktuellerNutzer } from "@/lib/auth";
import { baldDaPruefen, basisUrl, positionSpeichern } from "@/lib/auftraege";

// Der Monteur meldet seine Position (für die Karte auf der Kundenseite).
export async function POST(req: Request) {
  const n = await aktuellerNutzer();
  if (!n) return NextResponse.json({ fehler: "nicht angemeldet" }, { status: 401 });
  const { id, lat, lng } = (await req.json().catch(() => ({}))) as { id?: string; lat?: number; lng?: number };
  if (typeof id !== "string" || typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ fehler: "ungültig" }, { status: 400 });
  }
  await positionSpeichern(n.betrieb_id, id, lat, lng);
  const basis = await basisUrl();
  await baldDaPruefen((t) => `${basis}/t/${t}`, id);
  return NextResponse.json({ ok: true });
}
