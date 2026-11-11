import { NextResponse } from "next/server";
import { istDemo, query } from "@/lib/db";
import { DEMO_LOGIN, seedDemo } from "@/lib/seed";

// Nur im Demo-Modus: alle Aufträge (und SMS) des Demo-Betriebs löschen und frische Beispiel-Aufträge anlegen.
export async function POST() {
  if (!istDemo()) return NextResponse.json({ fehler: "nur im Demo-Modus" }, { status: 404 });
  await query(
    `DELETE FROM auftrag WHERE betrieb_id = (SELECT betrieb_id FROM mitarbeiter WHERE email = $1)`,
    [DEMO_LOGIN.email],
  );
  await seedDemo(query);
  return NextResponse.json({ ok: true });
}
