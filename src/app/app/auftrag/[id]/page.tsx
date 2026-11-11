import Link from "next/link";
import { notFound } from "next/navigation";
import { nutzerOderLogin } from "@/lib/auth";
import { eins } from "@/lib/db";
import { auftragLaden, basisUrl, benachrichtigungen } from "@/lib/auftraege";
import { datumKurz, telefonAnzeige, uhrzeit, zeitfenster } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/Icon";
import { Steuerung } from "./Steuerung";

export const dynamic = "force-dynamic";

const SMS_TYP = { losgefahren: "Losgefahren", bald_da: "Gleich da (15 Min)", verspaetung: "Verspätung" } as const;

export default async function AuftragSeite({ params }: { params: Promise<{ id: string }> }) {
  const n = await nutzerOderLogin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const a = await auftragLaden(n.betrieb_id, id);
  if (!a) notFound();
  const sms = await benachrichtigungen(a.id);
  const link = `${await basisUrl()}/t/${a.link_token}`;
  const b = await eins<{ karte_aktiv: boolean }>(`SELECT karte_aktiv FROM betrieb WHERE id = $1`, [n.betrieb_id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/app?datum=${a.termin_datum}`} className="rund-knopf -ml-2" aria-label="Zurück">
          <Icon name="zurueck" className="h-6 w-6" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{a.kunde_name}</h1>
        <StatusBadge status={a.status} />
      </div>

      <div className="karte space-y-2 text-[15px]">
        <Zeile label="Termin">{datumKurz(a.termin_datum)}, {zeitfenster(a.fenster_von, a.fenster_bis)}</Zeile>
        {a.adresse && (
          <Zeile label="Adresse">
            <a className="text-marke underline" href={`https://maps.apple.com/?daddr=${encodeURIComponent(a.adresse)}`}>{a.adresse}</a>
          </Zeile>
        )}
        <Zeile label="Handy">
          <a className="text-marke underline" href={`tel:${a.kunde_telefon}`}>{telefonAnzeige(a.kunde_telefon)}</a>
        </Zeile>
        {a.mitarbeiter_name && <Zeile label="Monteur">{a.mitarbeiter_name}</Zeile>}
        {a.status === "unterwegs" && a.eta && <Zeile label="Ankunft">ca. {uhrzeit(a.eta)} Uhr</Zeile>}
        {a.notiz && <Zeile label="Notiz">{a.notiz}</Zeile>}
      </div>

      <Steuerung id={a.id} status={a.status} link={link} karteAktiv={b?.karte_aktiv ?? false} />

      {sms.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-stone-500">SMS an den Kunden</h2>
          {sms.map((s) => (
            <div key={s.id} className="karte space-y-1 text-sm">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold">{SMS_TYP[s.typ]} · {uhrzeit(s.gesendet_am)} Uhr</span>
                <span className={s.status === "fehler" ? "font-semibold text-red-600" : s.status === "demo" ? "text-amber-700" : "text-green-700"}>
                  {s.status === "demo" ? "Demo – nicht verschickt" : s.status === "fehler" ? "Fehler" : "Verschickt"}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words">{s.text}</p>
              {s.fehler && <p className="text-xs text-red-600">{s.fehler}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Zeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-stone-500">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
