"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { KundenDaten } from "@/lib/kundensicht";
import { datumKurz, heute, initialen, uhrzeit, zeitfenster } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";

const Karte = dynamic(() => import("./Karte"), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-2xl bg-stone-200" />,
});

type Daten = KundenDaten | { gueltig: false };

export function KundenAnsicht({ token, start }: { token: string; start: Daten }) {
  const [d, setD] = useState<Daten>(start);
  const [jetzt, setJetzt] = useState(() => Date.now());

  const status = useRef(start.gueltig ? start.status : null);
  status.current = d.gueltig ? d.status : null;

  useEffect(() => {
    let aus = false;
    const laden = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/t/${token}`, { cache: "no-store" });
        if (!r.ok) return; // Serverfehler: alten Stand behalten statt "Link ungültig" zu zeigen
        const neu = (await r.json()) as Daten;
        if (!aus) setD(neu);
      } catch {}
    };
    // Solange etwas passiert alle 5 Sekunden nachsehen, danach seltener.
    let zaehler = 0;
    const t1 = setInterval(() => {
      const aktiv = status.current === "geplant" || status.current === "unterwegs" || status.current === "angekommen";
      if (aktiv || ++zaehler % 6 === 0) laden();
    }, 5_000);
    const t2 = setInterval(() => setJetzt(Date.now()), 15_000);
    document.addEventListener("visibilitychange", laden);
    return () => { aus = true; clearInterval(t1); clearInterval(t2); document.removeEventListener("visibilitychange", laden); };
  }, [token]);

  if (!d.gueltig) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo className="h-14 w-14" />
        <h1 className="text-xl font-bold">Dieser Link ist nicht mehr gültig</h1>
        <p className="text-stone-600">Der Termin ist abgeschlossen oder der Link ist falsch. Bei Fragen melden Sie sich bitte direkt beim Betrieb.</p>
      </main>
    );
  }

  const minuten = d.eta ? Math.max(0, Math.round((new Date(d.eta).getTime() - jetzt) / 60_000)) : null;
  const wer = d.monteur ?? d.betrieb;

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-marke text-lg font-bold text-white">
          {initialen(wer)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{wer}</div>
          {d.monteur && <div className="truncate text-sm text-stone-500">{d.betrieb}</div>}
        </div>
      </header>

      <section className="karte text-center">
        {d.status === "geplant" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Ihr Termin</p>
            <p className="mt-1 text-3xl font-bold">{zeitfenster(d.fensterVon, d.fensterBis)}</p>
            <p className="mt-1 text-stone-600">{d.termin === heute() ? "Heute" : datumKurz(d.termin)}</p>
            <p className="mt-4 rounded-xl bg-stone-100 p-3 text-sm text-stone-700">
              Sobald {wer} losfährt, bekommen Sie eine SMS – und sehen hier die genaue Ankunftszeit.
            </p>
          </>
        )}
        {d.status === "unterwegs" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Ist unterwegs zu Ihnen</p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums">ca. {uhrzeit(d.eta)}</p>
            <p className="mt-2 text-lg text-stone-700">
              {minuten === null ? "" : minuten <= 1 ? "Jeden Moment da" : `in etwa ${minuten} Minuten`}
            </p>
          </>
        )}
        {d.status === "angekommen" && (
          <>
            <Kreis farbe="bg-green-600"><Icon name="standort" className="h-8 w-8" /></Kreis>
            <p className="mt-2 text-2xl font-bold">{wer} ist da</p>
          </>
        )}
        {d.status === "erledigt" && (
          <>
            <Kreis farbe="bg-stone-800"><Icon name="haken" className="h-8 w-8" /></Kreis>
            <p className="mt-2 text-2xl font-bold">Auftrag erledigt</p>
            <p className="mt-1 text-stone-600">Vielen Dank für Ihr Vertrauen!</p>
          </>
        )}
        {d.status === "storniert" && <p className="text-xl font-bold">Dieser Termin wurde abgesagt.</p>}
      </section>

      <Fortschritt status={d.status} />

      {d.position && (
        <section className="space-y-1">
          <Karte lat={d.position.lat} lng={d.position.lng} />
          <p className="px-1 text-xs text-stone-500">Standort von {uhrzeit(d.position.zeit)} Uhr · aktualisiert sich automatisch</p>
        </section>
      )}

      {d.betriebTelefon && d.status !== "erledigt" && (
        <a href={`tel:${d.betriebTelefon}`} className="knopf-zweit">
          <Icon name="telefon" /> {d.betrieb} anrufen
        </a>
      )}

      <footer className="pt-4 text-center text-xs text-stone-400">Diese Seite aktualisiert sich von selbst</footer>
    </main>
  );
}

function Kreis({ farbe, children }: { farbe: string; children: React.ReactNode }) {
  return <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white ${farbe}`}>{children}</div>;
}

function Fortschritt({ status }: { status: KundenDaten["status"] }) {
  if (status === "storniert") return null;
  const schritte = ["Geplant", "Unterwegs", "Vor Ort"];
  const index = { geplant: 0, unterwegs: 1, angekommen: 2, erledigt: 3 }[status];
  return (
    <ol className="flex items-center gap-2 px-1">
      {schritte.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col items-center gap-1">
          <div className={`h-1.5 w-full rounded-full ${i <= index ? "bg-marke" : "bg-stone-200"}`} />
          <span className={`text-xs ${i === index ? "font-bold text-tinte" : "text-stone-500"}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
