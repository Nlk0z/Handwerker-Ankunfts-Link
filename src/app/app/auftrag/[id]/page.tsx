import Link from "next/link";
import { notFound } from "next/navigation";
import { nutzerOderLogin } from "@/lib/auth";
import { auftragLaden, basisUrl, benachrichtigungen } from "@/lib/auftraege";
import { datumKurz, telefonAnzeige, uhrzeit, zeitfenster } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Steuerung } from "./Steuerung";
import { antwortenGelesen, antwortenZumAuftrag } from "@/lib/antworten";
import { AutoAktualisieren } from "@/components/AutoAktualisieren";

export const dynamic = "force-dynamic";

const ANTWORT = {
  passt: ["👍", "Passt, bin da"],
  anrufen: ["📞", "Bitte vorher kurz anrufen"],
  hinweis: ["✏️", "Hinweis"],
} as const;

const SMS_TYP = { losgefahren: "Losgefahren", bald_da: "Gleich da (15 Min)", verspaetung: "Verspätung", anruf_wunsch: "Rückruf-Wunsch" } as const;
const SMS_STATUS = { demo: "Demo – nicht verschickt", gesendet: "verschickt", fehler: "Fehler beim Senden" } as const;

export default async function AuftragSeite({ params }: { params: Promise<{ id: string }> }) {
  const n = await nutzerOderLogin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const a = await auftragLaden(n.betrieb_id, id);
  if (!a) notFound();
  const alleSms = await benachrichtigungen(a.id);
  const sms = alleSms.filter((s) => s.typ !== "anruf_wunsch");
  const anrufSms = alleSms.find((s) => s.typ === "anruf_wunsch");
  const antworten = await antwortenZumAuftrag(a.id);
  if (antworten.some((x) => !x.gelesen_am)) await antwortenGelesen(a.id);
  const link = `${await basisUrl()}/t/${a.link_token}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/app?datum=${a.termin_datum}`} className="rounded-full p-2 text-2xl leading-none text-stone-500 active:bg-stone-200" aria-label="Zurück">‹</Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{a.kunde_name}</h1>
        <StatusBadge status={a.status} />
      </div>

      <AutoAktualisieren />

      {antworten.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-stone-500">Rückmeldung vom Kunden</h2>
          {antworten.map((x) => (
            <div key={x.id} className={`karte flex items-start gap-3 text-[15px] ${x.typ === "anrufen" ? "ring-2 ring-marke" : ""}`}>
              <span className="text-xl leading-6">{ANTWORT[x.typ][0]}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{x.typ === "hinweis" ? x.text : ANTWORT[x.typ][1]}</p>
                <p className="text-xs text-stone-500">
                  {uhrzeit(x.erstellt_am)} Uhr{!x.gelesen_am && <span className="ml-2 font-semibold text-marke">Neu</span>}
                </p>
                {x.typ === "anrufen" && (
                  <p className="mt-1 text-xs text-stone-500">
                    {anrufSms
                      ? `SMS an Monteur: ${SMS_STATUS[anrufSms.status as keyof typeof SMS_STATUS] ?? anrufSms.status} (${uhrzeit(anrufSms.gesendet_am)} Uhr)`
                      : <>Keine SMS an Sie – <Link href="/app/einstellungen" className="text-marke underline">Handynummer hinterlegen</Link></>}
                  </p>
                )}
              </div>
              {x.typ === "anrufen" && (
                <a href={`tel:${a.kunde_telefon}`} className="shrink-0 rounded-xl bg-marke px-3 py-2 text-sm font-semibold text-white active:bg-marke-dunkel">Anrufen</a>
              )}
            </div>
          ))}
        </section>
      )}

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

      <Steuerung id={a.id} status={a.status} link={link} />

      {sms.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-stone-500">Nachrichten an den Kunden</h2>
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
