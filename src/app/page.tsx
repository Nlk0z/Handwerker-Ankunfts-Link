import { redirect } from "next/navigation";
import { aktuellerNutzer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Start() {
  redirect((await aktuellerNutzer()) ? "/app" : "/login");
}
