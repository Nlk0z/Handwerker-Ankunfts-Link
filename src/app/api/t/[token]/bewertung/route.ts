import { NextResponse } from "next/server";
import { bewertungSpeichern } from "@/lib/kundensicht";

// Der Kunde bewertet den erledigten Auftrag (Sterne + optionaler Text).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { sterne, text } = (await req.json().catch(() => ({}))) as { sterne?: unknown; text?: unknown };
  const ok = await bewertungSpeichern(token, Number(sterne), typeof text === "string" ? text : "");
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
