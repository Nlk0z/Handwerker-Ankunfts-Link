import type { Metadata } from "next";
import { kundenDaten } from "@/lib/kundensicht";
import { KundenAnsicht } from "./KundenAnsicht";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ihr Handwerker kommt",
  robots: { index: false, follow: false },
};

export default async function KundenSeite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const daten = await kundenDaten(token);
  return <KundenAnsicht token={token} start={daten} />;
}
