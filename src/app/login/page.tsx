import Link from "next/link";
import { redirect } from "next/navigation";
import { aktuellerNutzer, anmelden, passwortPruefen } from "@/lib/auth";
import { eins, istDemo } from "@/lib/db";
import { DEMO_LOGIN } from "@/lib/seed";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  const m = await eins<{ id: string; passwort_hash: string }>(
    `SELECT id, passwort_hash FROM mitarbeiter WHERE lower(email) = $1`,
    [email],
  );
  if (!m || !(await passwortPruefen(passwort, m.passwort_hash))) redirect("/login?fehler=1");
  await anmelden(m.id);
  redirect("/app");
}

export default async function LoginSeite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  if (await aktuellerNutzer()) redirect("/app");
  const { fehler } = await searchParams;
  const demo = istDemo();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <Logo className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold">Kommt gleich</h1>
        <p className="mt-1 text-stone-600">Ihre Kunden wissen, wann Sie da sind.</p>
      </div>

      <form action={login} className="karte space-y-4">
        <div>
          <label className="beschriftung" htmlFor="email">E-Mail</label>
          <input className="eingabe" id="email" name="email" type="email" autoComplete="email" required
            defaultValue={demo ? DEMO_LOGIN.email : undefined} />
        </div>
        <div>
          <label className="beschriftung" htmlFor="passwort">Passwort</label>
          <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="current-password" required
            defaultValue={demo ? DEMO_LOGIN.passwort : undefined} />
        </div>
        {fehler && <p className="text-sm font-medium text-red-600">E-Mail oder Passwort stimmt nicht.</p>}
        <button className="knopf-haupt" type="submit">Anmelden</button>
      </form>

      {demo && (
        <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900 ring-1 ring-amber-200">
          Demo-Modus: Zugangsdaten sind schon eingetragen. SMS werden nicht verschickt, sondern nur angezeigt.
        </p>
      )}
      <p className="text-center text-sm text-stone-600">
        Neu hier? <Link className="font-semibold text-marke" href="/registrieren">Betrieb registrieren</Link>
      </p>
    </main>
  );
}
