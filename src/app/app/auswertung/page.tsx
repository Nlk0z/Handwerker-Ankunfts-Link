import Link from "next/link";
import { nutzerOderLogin } from "@/lib/auth";
import { ANNAHME, auswertung } from "@/lib/auswertung";
import { datumKurz } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Sterne } from "@/components/Sterne";

export const dynamic = "force-dynamic";

const ZEITRAEUME = [7, 30, 90] as const;
const zahl = (n: number, stellen = 0) => n.toLocaleString("de-DE", { maximumFractionDigits: stellen, minimumFractionDigits: stellen });
const prozent = (teil: number, ganz: number) => (ganz ? `${Math.round((teil / ganz) * 100)} %` : "–");

export default async function AuswertungSeite({ searchParams }: { searchParams: Promise<{ tage?: string; nurText?: string }> }) {
  const n = await nutzerOderLogin();
  const { tage: t, nurText } = await searchParams;
  const tage = ZEITRAEUME.find((z) => String(z) === t) ?? 30;
  const a = await auswertung(n.betrieb_id, tage);
  const liste = nurText ? a.bewertungen.filter((b) => b.text) : a.bewertungen;
  const maxVerteilung = Math.max(1, ...a.verteilung);
  const stunden = a.gesparteMinuten / 60;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/app" className="rund-knopf -ml-2" aria-label="Zurück">
          <Icon name="zurueck" className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold">Auswertung</h1>
      </div>

      {/* Zeitraum */}
      <div className="flex gap-2" role="tablist" aria-label="Zeitraum">
        {ZEITRAEUME.map((z) => (
          <Link
            key={z}
            href={`/app/auswertung?tage=${z}`}
            role="tab"
            aria-selected={z === tage}
            className={`flex-1 rounded-xl py-2 text-center text-sm font-semibold ring-1 ${z === tage ? "bg-tinte text-white ring-tinte" : "bg-white text-stone-600 ring-stone-300"}`}
          >
            {z} Tage
          </Link>
        ))}
      </div>
      <p className="-mt-2 px-1 text-xs text-stone-500">{datumKurz(a.von)} bis {datumKurz(a.bis)}</p>

      {/* Hauptzahl: was die App gebracht hat */}
      <section className="karte">
        <p className="text-sm font-semibold text-stone-600">Gesparte Rückfrage-Anrufe</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums">ca. {zahl(a.gesparteAnrufe)}</p>
        <p className="text-stone-600">
          etwa {stunden < 1 ? `${zahl(a.gesparteMinuten)} Minuten` : `${zahl(stunden, 1)} Stunden`} Telefonzeit
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Schätzung: Ohne Link ruft etwa jeder {Math.round(1 / ANNAHME.anrufQuote)}. Kunde an („Wann kommen Sie?“), je ca. {ANNAHME.minutenProAnruf} Minuten.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Kachel titel="Kunden per SMS informiert" wert={zahl(a.informiert)} zusatz={`von ${zahl(a.auftraege)} Aufträgen`} />
        <Kachel titel="Link geöffnet" wert={prozent(a.geoeffnet, a.informiert)} zusatz={`${zahl(a.geoeffnet)} Kunden`} />
        <Kachel titel="Ankunft wie angekündigt" wert={prozent(a.puenktlich, a.mitAnkunft)} zusatz="höchstens 10 Min. später" />
        <Kachel titel="Zu Google geschickt" wert={zahl(a.zuGoogle)} zusatz={`von ${zahl(a.erledigt)} erledigten Aufträgen`} />
        <Kachel titel="Bewertungen in der App" wert={zahl(a.bewertungen.length)} zusatz={a.schnitt !== null ? `Ø ${zahl(a.schnitt, 1)} Sterne` : "noch keine"} />
        <Kachel titel="Verschickte SMS" wert={zahl(a.smsGesamt)} zusatz={a.sms.verspaetung ? `davon ${zahl(a.sms.verspaetung)} Verspätungen` : "keine Verspätung gemeldet"} />
      </div>

      {/* Bewertungen */}
      <section className="karte space-y-4" id="bewertungen">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Bewertungen</h2>
            <p className="text-sm text-stone-500">{a.bewertungen.length} im Zeitraum</p>
          </div>
          {a.schnitt !== null && (
            <div className="text-right">
              <p className="text-3xl font-extrabold tabular-nums">{zahl(a.schnitt, 1)}</p>
              <Sterne anzahl={Math.round(a.schnitt)} />
            </div>
          )}
        </div>

        {a.bewertungen.length > 0 && (
          <ul className="space-y-1.5" aria-label="Verteilung der Sterne">
            {[5, 4, 3, 2, 1].map((s) => {
              const anzahl = a.verteilung[s - 1]!;
              return (
                <li key={s} className="flex items-center gap-2 text-sm" title={`${s} Sterne: ${anzahl}`}>
                  <span className="w-3 text-right tabular-nums text-stone-600">{s}</span>
                  <Icon name="stern" className="h-3.5 w-3.5 text-stone-400" />
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <span className="block h-full rounded-full bg-amber-500" style={{ width: `${(anzahl / maxVerteilung) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right tabular-nums text-stone-600">{anzahl}</span>
                </li>
              );
            })}
          </ul>
        )}

        {a.bewertungen.length > 0 && (
          <div className="flex gap-2 text-sm">
            <Link href={`/app/auswertung?tage=${tage}#bewertungen`} className={`rounded-full px-3 py-1 ring-1 ${!nurText ? "bg-tinte text-white ring-tinte" : "ring-stone-300"}`}>Alle</Link>
            <Link href={`/app/auswertung?tage=${tage}&nurText=1#bewertungen`} className={`rounded-full px-3 py-1 ring-1 ${nurText ? "bg-tinte text-white ring-tinte" : "ring-stone-300"}`}>Nur mit Text</Link>
          </div>
        )}

        {liste.length === 0 ? (
          <p className="text-sm text-stone-500">
            {a.bewertungen.length ? "Keine Bewertung mit Text im Zeitraum." : "Noch keine Bewertungen. Kunden können nach „Auftrag erledigt“ über ihren Link bewerten."}
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {liste.map((r) => (
              <li key={r.id} className="space-y-1 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{r.kunde_name}</span>
                  <span className="shrink-0 text-xs text-stone-500">{datumKurz(r.termin_datum)}</span>
                </div>
                <Sterne anzahl={r.sterne} />
                {r.text && <p className="whitespace-pre-wrap break-words text-[15px] text-stone-700">„{r.text}“</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kachel({ titel, wert, zusatz }: { titel: string; wert: string; zusatz: string }) {
  return (
    <div className="karte p-3">
      <p className="text-xs font-semibold text-stone-500">{titel}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{wert}</p>
      <p className="text-xs text-stone-500">{zusatz}</p>
    </div>
  );
}
