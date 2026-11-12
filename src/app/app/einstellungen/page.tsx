import Link from "next/link";
import { Icon } from "@/components/Icon";
import { nutzerOderLogin } from "@/lib/auth";
import { eins, query } from "@/lib/db";
import { absenderAusName, telefonAnzeige } from "@/lib/format";
import { abmeldenAktion, einstellungenSpeichern, meinHandySpeichern, mitarbeiterAnlegen } from "../actions";

export const dynamic = "force-dynamic";

const MELDUNG: Record<string, string> = {
  "1": "Gespeichert",
  mitarbeiter: "Mitarbeiter angelegt",
  handy: "Handynummer gespeichert",
};
const FEHLER: Record<string, string> = {
  mitarbeiter: "Bitte Name, E-Mail und ein Passwort mit mind. 8 Zeichen angeben.",
  email: "Diese E-Mail ist schon vergeben.",
  handy: "Diese Handynummer sieht nicht richtig aus.",
  website: "Diese Website-Adresse sieht nicht richtig aus (z. B. www.elektro-maier.de).",
};

export default async function Einstellungen({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  const n = await nutzerOderLogin();
  const { ok, fehler } = await searchParams;
  const b = await eins<{ name: string; telefon: string | null; sms_absender: string | null; karte_aktiv: boolean; website: string | null }>(
    `SELECT name, telefon, sms_absender, karte_aktiv, website FROM betrieb WHERE id = $1`,
    [n.betrieb_id],
  );
  const team = await query<{ id: string; name: string; email: string; rolle: string; handy: string | null }>(
    `SELECT id, name, email, rolle, handy FROM mitarbeiter WHERE betrieb_id = $1 ORDER BY rolle, name`,
    [n.betrieb_id],
  );
  const chef = n.rolle === "inhaber";
  const ich = team.find((m) => m.id === n.id);

  // Betrieb ohne Website: Angebot von Lukas Technology (nur wenn eine Kontakt-Adresse hinterlegt ist)
  const kontakt = process.env.KONTAKT_EMAIL?.trim();
  const anfrage =
    kontakt && !b?.website
      ? `mailto:${kontakt}?subject=${encodeURIComponent(`Website für ${b?.name ?? "unseren Betrieb"}`)}&body=${encodeURIComponent(
          `Hallo,\n\nwir haben noch keine Website und hätten gerne ein Angebot.\n\nBetrieb: ${b?.name ?? ""}\nAnsprechpartner: ${n.name}\nTelefon: ${b?.telefon ? telefonAnzeige(b.telefon) : ""}\n\nViele Grüße`,
        )}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/app" className="flex rounded-full p-2 text-stone-500 active:bg-stone-200" aria-label="Zurück"><Icon name="pfeil-links" className="h-6 w-6" /></Link>
        <h1 className="text-xl font-bold">Einstellungen</h1>
      </div>
      {ok && MELDUNG[ok] && (
        <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-800 ring-1 ring-green-200">
          <Icon name="haken-kreis" />{MELDUNG[ok]}
        </p>
      )}
      {fehler && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{FEHLER[fehler]}</p>}

      <form action={meinHandySpeichern} className="karte space-y-3">
        <h2 className="font-semibold">Mein Handy</h2>
        <p className="text-sm text-stone-500">
          Bittet ein Kunde um Anruf, bekommen Sie sofort eine SMS mit seiner Nummer – einfach antippen und anrufen.
        </p>
        <input className="eingabe" name="handy" type="tel" placeholder="0171 1234567" defaultValue={ich?.handy ? telefonAnzeige(ich.handy) : ""} />
        <button className="knopf-haupt" type="submit">Speichern</button>
      </form>

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
            <label className="beschriftung" htmlFor="sms_absender">SMS-Absender (optional)</label>
            <input className="eingabe" id="sms_absender" name="sms_absender" maxLength={11} defaultValue={b?.sms_absender ?? ""} placeholder={absenderAusName(b?.name ?? "")} />
            <p className="mt-1 text-xs text-stone-500">
              Leer lassen = automatisch aus dem Namen: <strong>{absenderAusName(b?.name ?? "")}</strong>.
              Das SMS-System erlaubt als Absender nur 11 Buchstaben/Ziffern – der volle Name steht trotzdem im SMS-Text.
            </p>
          </div>
          <div>
            <label className="beschriftung" htmlFor="website">Website (optional)</label>
            <input className="eingabe" id="website" name="website" inputMode="url" autoCapitalize="none" placeholder="www.ihr-betrieb.de" defaultValue={b?.website?.replace(/^https:\/\//, "") ?? ""} />
            <p className="mt-1 text-xs text-stone-500">Der Kunde sieht sie als Link auf seiner Ankunftsseite.</p>
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

      {anfrage && (
        <section className="karte space-y-3 ring-2 ring-marke/30">
          <h2 className="flex items-center gap-2 font-semibold"><Icon name="globus" className="h-5 w-5 text-marke" />Noch keine Website?</h2>
          <p className="text-sm text-stone-600">
            Wir bauen Ihrem Betrieb eine einfache, moderne Website – damit Kunden Sie finden und direkt anfragen können.
          </p>
          <a href={anfrage} className="knopf-haupt"><Icon name="brief" />Unverbindlich anfragen</a>
        </section>
      )}

      <section className="karte space-y-3">
        <h2 className="font-semibold">Team</h2>
        <ul className="divide-y divide-stone-100">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.name}</div>
                <div className="truncate text-sm text-stone-500">{m.email}</div>
                {m.handy && <div className="text-sm text-stone-500">{telefonAnzeige(m.handy)}</div>}
              </div>
              <span className="shrink-0 text-xs text-stone-500">{m.rolle === "inhaber" ? "Inhaber" : "Monteur"}</span>
            </li>
          ))}
        </ul>
        {chef && (
          <details className="rounded-xl bg-stone-50 p-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-marke [&::-webkit-details-marker]:hidden"><Icon name="plus" />Mitarbeiter hinzufügen</summary>
            <form action={mitarbeiterAnlegen} className="mt-3 space-y-3">
              <input className="eingabe" name="name" placeholder="Name" required />
              <input className="eingabe" name="email" type="email" placeholder="E-Mail" required />
              <input className="eingabe" name="handy" type="tel" placeholder="Handy (optional)" />
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
