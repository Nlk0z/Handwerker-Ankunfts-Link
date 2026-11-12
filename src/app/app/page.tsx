import Link from "next/link";
import { nutzerOderLogin } from "@/lib/auth";
import { auftraegeAmTag } from "@/lib/auftraege";
import { datumKurz, heute, uhrzeit, zeitfenster } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { AutoAktualisieren } from "@/components/AutoAktualisieren";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

function tagVerschieben(iso: string, tage: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

export default async function Tagesliste({ searchParams }: { searchParams: Promise<{ datum?: string }> }) {
  const n = await nutzerOderLogin();
  const { datum: d } = await searchParams;
  const datum = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : heute();
  const auftraege = await auftraegeAmTag(n.betrieb_id, datum);
  const istHeute = datum === heute();

  return (
    <div className="space-y-4">
      <AutoAktualisieren />
      <div className="flex items-center justify-between">
        <Link href={`/app?datum=${tagVerschieben(datum, -1)}`} className="flex rounded-full p-2 text-stone-500 active:bg-stone-200" aria-label="Vorheriger Tag"><Icon name="pfeil-links" className="h-6 w-6" /></Link>
        <div className="text-center">
          <h1 className="text-xl font-bold">{istHeute ? "Heute" : datumKurz(datum)}</h1>
          <p className="text-sm text-stone-500">
            {istHeute ? datumKurz(datum) + " · " : ""}
            {auftraege.length} {auftraege.length === 1 ? "Auftrag" : "Aufträge"}
          </p>
        </div>
        <Link href={`/app?datum=${tagVerschieben(datum, 1)}`} className="flex rounded-full p-2 text-stone-500 active:bg-stone-200" aria-label="Nächster Tag"><Icon name="pfeil-rechts" className="h-6 w-6" /></Link>
      </div>

      {auftraege.length === 0 && (
        <div className="karte py-10 text-center text-stone-500">Keine Aufträge an diesem Tag.</div>
      )}

      <ul className="space-y-3">
        {auftraege.map((a) => (
          <li key={a.id}>
            <Link href={`/app/auftrag/${a.id}`} className={`karte block active:bg-stone-50 ${a.status === "erledigt" || a.status === "storniert" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold">{a.kunde_name}</div>
                  {a.adresse && <div className="truncate text-sm text-stone-500">{a.adresse}</div>}
                </div>
                <StatusBadge status={a.status} />
              </div>
              {a.neue_antworten > 0 && (
                <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.anruf_gewuenscht ? "bg-marke text-white" : "bg-orange-100 text-orange-800"}`}>
                  <Icon name={a.anruf_gewuenscht ? "telefon" : "nachricht"} className="h-3.5 w-3.5" />
                  {a.anruf_gewuenscht ? "Kunde bittet um Anruf" : a.neue_antworten === 1 ? "Neue Rückmeldung" : `${a.neue_antworten} neue Rückmeldungen`}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-stone-700"><Icon name="uhr" className="h-4 w-4" />{zeitfenster(a.fenster_von, a.fenster_bis)}</span>
                {a.status === "unterwegs" && a.eta ? (
                  <span className="font-semibold text-orange-700">Ankunft ca. {uhrzeit(a.eta)}</span>
                ) : (
                  <span className="text-stone-500">{a.mitarbeiter_name}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-stone-100 via-stone-100/90">
        <Link href={`/app/neu?datum=${datum}`} className="knopf-haupt text-lg"><Icon name="plus" className="h-6 w-6" />Neuer Auftrag</Link>
      </div>
    </div>
  );
}
