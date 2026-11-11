import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { aktuellerNutzer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Start() {
  // Beim Entwickeln öffnet die Startadresse die iPhone-Vorschau (zwei iPhones nebeneinander),
  // z. B. in der Vorschau rechts in der Claude-App. Innerhalb der iPhone-Rahmen (iframe) nicht,
  // sonst stünde ein iPhone im iPhone.
  if (process.env.NODE_ENV === "development") {
    const ziel = (await headers()).get("sec-fetch-dest");
    if (ziel === "document") redirect("/iphone");
  }
  redirect((await aktuellerNutzer()) ? "/app" : "/login");
}
