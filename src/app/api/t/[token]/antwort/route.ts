import { NextResponse } from "next/server";
import { antwortSpeichern } from "@/lib/antworten";
import { anrufWunschMelden } from "@/lib/auftraege";
import { gueltigerAuftrag, kundenDaten } from "@/lib/kundensicht";

export const dynamic = "force-dynamic";

/** Kunde schickt eine Rückmeldung von seiner Seite aus (kein Login, der Link-Token reicht). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await gueltigerAuftrag(token);
  if (!a) return NextResponse.json({ fehler: "Dieser Link ist nicht mehr gültig." }, { status: 404 });
  if (a.status !== "geplant" && a.status !== "unterwegs") {
    return NextResponse.json({ fehler: "Für diesen Termin sind keine Nachrichten mehr möglich." }, { status: 409 });
  }

  let body: { typ?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fehler: "Ungültige Anfrage." }, { status: 400 });
  }

  const ergebnis = await antwortSpeichern(a.id, body.typ, body.text);
  if (!ergebnis.ok) return NextResponse.json({ fehler: ergebnis.fehler }, { status: 400 });
  // Anruf-Wunsch: Monteur bekommt sofort eine SMS, muss also nicht in die App schauen
  if (ergebnis.neu && body.typ === "anrufen") await anrufWunschMelden(a.id);
  return NextResponse.json(await kundenDaten(token), { headers: { "Cache-Control": "no-store" } });
}
