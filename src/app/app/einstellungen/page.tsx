import { nutzerOderLogin } from "@/lib/auth";
import { eins, query } from "@/lib/db";
import { telefonAnzeige } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { abmeldenAktion, einstellungenSpeichern, mitarbeiterAnlegen } from "../actions";

export const dynamic = "force-dynamic";

const MELDUNG: Record<string, string> = {
  "1": "Gespeichert",
  mitarbeiter: "Mitarbeiter angelegt",
};
const FEHLER: Record<string, string> = {
  mitarbeiter: "Bitte Name, E-Mail und ein Passwort mit mind. 8 Zeichen angeben.",
  email: "Diese E-Mail ist schon vergeben.",
  telefon: "Die Telefonnummer sieht nicht richtig aus (z. B. 09171 123456).",
};

export default async function Einstellungen({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  const n = await nutzerOderLogin();
  const { ok, fehler } = await searchParams;
  const b = await eins<{ name: string; telefon: string | null; sms_absender: string | null; karte_aktiv: boolean }>(
    `SELECT name, telefon, sms_absender, karte_aktiv FROM betrieb WHERE id = $1`,
    [n.betrieb_id],
  );
  const team = await query<{ id: string; name: string; email: string; rolle: string }>(
    `SELECT id, name, email, rolle FROM mitarbeiter WHERE betrieb_id = $1 ORDER BY rolle, name`,
    [n.betrieb_id],
  );
  const chef = n.rolle === "inhaber";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Einstellungen</h1>
      {ok && <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-800 ring-1 ring-green-200"><Icon name="haken" className="h-4 w-4" /> {MELDUNG[ok]}</p>}
      {fehler && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{FEHLER[fehler]}</p>}

      <form action={einstellungenSpeichern} className="karte space-y-4">
        <h2 className="font-semibold">Betrieb</h2>
        <fieldset disabled={!chef} className="space-y-4">
          <div>
            <label className="beschriftung" htmlFor="name">Name (sieht der Kunde)</label>
            <input className="eingabe" id="name" name="name" defaultValue={b?.name} required />
          </div>
          <div>
            <label className="beschriftung" htmlFor="telefon">Telefon für Rückfragen</label>
            <input className="eingabe" id="telefon" name="telefon" type="tel" defaultValue={b?.telefon ? telefonAnzeige(b.telefon) : ""} />
          </div>
          <div>
            <label className="beschriftung" htmlFor="sms_absender">SMS-Absender (max. 11 Zeichen, ohne Leerzeichen)</label>
            <input className="eingabe" id="sms_absender" name="sms_absender" maxLength={11} defaultValue={b?.sms_absender ?? ""} />
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 p-3">
            <span>
              <span className="block font-medium">Live-Karte für Kunden</span>
              <span className="block text-sm text-stone-500">Kunde sieht den Standort, solange Sie unterwegs sind</span>
            </span>
            <input type="checkbox" name="karte_aktiv" defaultChecked={b?.karte_aktiv} className="h-6 w-6 accent-marke" />
          </label>
          {chef && <button className="knopf-haupt" type="submit">Speichern</button>}
        </fieldset>
        {!chef && <p className="text-sm text-stone-500">Nur der Inhaber kann diese Angaben ändern.</p>}
      </form>

      <section className="karte space-y-3">
        <h2 className="font-semibold">Team</h2>
        <ul className="divide-y divide-stone-100">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.name}</div>
                <div className="truncate text-sm text-stone-500">{m.email}</div>
              </div>
              <span className="text-xs text-stone-500">{m.rolle === "inhaber" ? "Inhaber" : "Monteur"}</span>
            </li>
          ))}
        </ul>
        {chef && (
          <details className="rounded-xl bg-stone-50 p-3">
            <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-marke"><Icon name="plus" className="h-4 w-4" /> Mitarbeiter hinzufügen</summary>
            <form action={mitarbeiterAnlegen} className="mt-3 space-y-3">
              <input className="eingabe" name="name" placeholder="Name" required />
              <input className="eingabe" name="email" type="email" placeholder="E-Mail" required />
              <input className="eingabe" name="passwort" type="password" placeholder="Start-Passwort (mind. 8 Zeichen)" minLength={8} required />
              <button className="knopf-haupt" type="submit">Anlegen</button>
            </form>
          </details>
        )}
      </section>

      <form action={abmeldenAktion}>
        <button className="knopf-zweit text-red-600" type="submit">Abmelden</button>
      </form>
    </div>
  );
}
