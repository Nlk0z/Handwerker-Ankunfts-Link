import { NextResponse } from "next/server";
import { kundenDaten } from "@/lib/kundensicht";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.json(await kundenDaten(token), { headers: { "Cache-Control": "no-store" } });
}
