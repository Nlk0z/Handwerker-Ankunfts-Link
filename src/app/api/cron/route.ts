import { NextResponse } from "next/server";
import { baldDaPruefen, basisUrl } from "@/lib/auftraege";

// Regelmäßig aufrufen (z. B. jede Minute per Vercel Cron oder cron-job.org),
// damit die "In 15 Minuten da"-SMS auch kommt, wenn keine Seite offen ist.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ fehler: "nicht erlaubt" }, { status: 401 });
  }
  const basis = await basisUrl();
  const anzahl = await baldDaPruefen((t) => `${basis}/t/${t}`);
  return NextResponse.json({ gesendet: anzahl });
}
