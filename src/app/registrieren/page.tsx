import Link from "next/link";
import { redirect } from "next/navigation";
import { anmelden, passwortHash } from "@/lib/auth";
import { eins } from "@/lib/db";
import { normalisiereTelefon } from "@/lib/format";
import { absenderSaeubern, absenderVorschlaege } from "@/lib/absender";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

async function registrieren(formData: FormData) {
  "use server";
  const f = (k: string) => String(formData.get(k) ?? "").trim();
  const email = f("email").toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  if (!f("betrieb") || !f("name") || !email) redirect("/registrieren?fehler=felder");
  if (passwort.length < 8) redirect("/registrieren?fehler=passwort");
  if (await eins(`SELECT 1 FROM mitarbeiter WHERE lower(email) = $1`, [email])) redirect("/registrieren?fehler=email");

  const telefon = f("telefon") ? normalisiereTelefon(f("telefon")) : null;
  if (f("telefon") && !telefon) redirect("/registrieren?fehler=telefon");
  const b = await eins<{ id: string }>(
    `INSERT INTO betrieb (name, telefon, sms_absender) VALUES ($1, $2, $3) RETURNING id`,
    [f("betrieb"), telefon, absenderVorschlaege(f("betrieb"))[0] ?? absenderSaeubern(f("betrieb"))],
  );
  const m = await eins<{ id: string }>(
    `INSERT INTO mitarbeiter (betrieb_id, name, email, passwort_hash, rolle)
     VALUES ($1, $2, $3, $4, 'inhaber') RETURNING id`,
    [b!.id, f("name"), email, await passwortHash(passwort)],
  );
  await anmelden(m!.id);
  redirect("/app");
}

const FEHLER: Record<string, string> = {
  felder: "Bitte alle Pflichtfelder ausfüllen.",
  passwort: "Das Passwort muss mindestens 8 Zeichen haben.",
  email: "Diese E-Mail ist schon registriert.",
  telefon: "Die Telefonnummer sieht nicht richtig aus (z. B. 09171 123456).",
};

export default async function Registrieren({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <Logo className="mx-auto h-12 w-12" />
        <h1 className="mt-3 text-2xl font-bold">Betrieb registrieren</h1>
      </div>
      <form action={registrieren} className="karte space-y-4">
        <div>
          <label className="beschriftung" htmlFor="betrieb">Name des Betriebs *</label>
          <input className="eingabe" id="betrieb" name="betrieb" required placeholder="z. B. Elektro Maier" />
        </div>
        <div>
          <label className="beschriftung" htmlFor="telefon">Telefon des Betriebs</label>
          <input className="eingabe" id="telefon" name="telefon" type="tel" placeholder="09171 123456" />
        </div>
        <div>
          <label className="beschriftung" htmlFor="name">Ihr Name *</label>
          <input className="eingabe" id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <label className="beschriftung" htmlFor="email">E-Mail *</label>
          <input className="eingabe" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="beschriftung" htmlFor="passwort">Passwort * (mind. 8 Zeichen)</label>
          <input className="eingabe" id="passwort" name="passwort" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        {fehler && <p className="text-sm font-medium text-red-600">{FEHLER[fehler] ?? "Etwas ist schiefgelaufen."}</p>}
        <button className="knopf-haupt" type="submit">Kostenlos starten</button>
      </form>
      <p className="text-center text-sm text-stone-600">
        Schon registriert? <Link className="font-semibold text-marke" href="/login">Anmelden</Link>
      </p>
    </main>
  );
}
