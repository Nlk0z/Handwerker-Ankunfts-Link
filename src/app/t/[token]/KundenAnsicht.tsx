"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { KundenDaten } from "@/lib/kundensicht";
import { datumKurz, heute, initialen, telefonAnzeige, uhrzeit, zeitfenster } from "@/lib/format";
import { Logo } from "@/components/Logo";

const Karte = dynamic(() => import("./Karte"), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-2xl bg-stone-200" />,
});

type Daten = KundenDaten | { gueltig: false };

export function KundenAnsicht({ token, start }: { token: string; start: Daten }) {
  const [d, setD] = useState<Daten>(start);
  const [jetzt, setJetzt] = useState(() => Date.now());

  useEffect(() => {
    const laden = () =>
      fetch(`/api/t/${token}`, { cache: "no-store" })
        .then((r) => r.json())
        .then(setD)
        .catch(() => {});
    const t1 = setInterval(laden, 20_000);
    const t2 = setInterval(() => setJetzt(Date.now()), 15_000);
    const sichtbar = () => document.visibilityState === "visible" && laden();
    document.addEventListener("visibilitychange", sichtbar);
    return () => { clearInterval(t1); clearInterval(t2); document.removeEventListener("visibilitychange", sichtbar); };
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
            <p className="text-5xl">👋</p>
            <p className="mt-2 text-2xl font-bold">{wer} ist da</p>
          </>
        )}
        {d.status === "erledigt" && (
          <>
            <p className="text-5xl">✅</p>
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

      {(d.kannAntworten || d.antworten.length > 0) && (
        <Rueckmeldung token={token} daten={d} wer={wer} onNeu={setD} />
      )}

      {d.betriebTelefon && d.status !== "erledigt" && (
        <a href={`tel:${d.betriebTelefon}`} className="knopf-zweit">📞 {d.betrieb} anrufen ({telefonAnzeige(d.betriebTelefon)})</a>
      )}

      <footer className="pt-4 text-center text-xs text-stone-400">
        Kein App-Download nötig · Diese Seite aktualisiert sich von selbst
      </footer>
    </main>
  );
}

const ANTWORT_TEXT: Record<KundenDaten["antworten"][number]["typ"], string> = {
  passt: "👍 Passt, ich bin da",
  anrufen: "📞 Bitte vorher kurz anrufen",
  hinweis: "✏️ Hinweis",
};

function Rueckmeldung({ token, daten, wer, onNeu }: { token: string; daten: KundenDaten; wer: string; onNeu: (d: Daten) => void }) {
  const [hinweisOffen, setHinweisOffen] = useState(false);
  const [hinweis, setHinweis] = useState("");
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState("");

  async function senden(typ: "passt" | "anrufen" | "hinweis", text?: string) {
    setSendet(true);
    setFehler("");
    try {
      const r = await fetch(`/api/t/${token}/antwort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ, text }),
      });
      const j = await r.json();
      if (!r.ok) { setFehler(j.fehler ?? "Senden hat nicht geklappt."); return; }
      onNeu(j);
      setHinweis("");
      setHinweisOffen(false);
    } catch {
      setFehler("Keine Verbindung. Bitte nochmal versuchen.");
    } finally {
      setSendet(false);
    }
  }

  return (
    <section className="karte space-y-3">
      <p className="font-semibold">{daten.kannAntworten ? `Kurze Rückmeldung an ${wer}` : "Ihre Nachrichten"}</p>

      {daten.kannAntworten && (
        hinweisOffen ? (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); senden("hinweis", hinweis); }}>
            <textarea
              className="eingabe min-h-24 py-2"
              maxLength={300}
              autoFocus
              placeholder="z. B. Klingel geht nicht – bitte klopfen. Parken im Hof."
              value={hinweis}
              onChange={(e) => setHinweis(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="knopf-zweit text-stone-500" onClick={() => setHinweisOffen(false)}>Abbruch</button>
              <button type="submit" className="knopf-haupt" disabled={sendet || !hinweis.trim()}>Senden</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-2">
            <button className="knopf-zweit" disabled={sendet} onClick={() => senden("passt")}>👍 Passt, ich bin da</button>
            <button className="knopf-zweit" disabled={sendet} onClick={() => senden("anrufen")}>📞 Bitte vorher kurz anrufen</button>
            <button className="knopf-zweit" disabled={sendet} onClick={() => setHinweisOffen(true)}>✏️ Hinweis schreiben</button>
          </div>
        )
      )}

      {fehler && <p className="text-sm font-medium text-red-600">{fehler}</p>}

      {daten.antworten.length > 0 && (
        <ul className="space-y-2 border-t border-stone-100 pt-3">
          {daten.antworten.map((a) => (
            <li key={a.id} className="rounded-xl bg-orange-50 px-3 py-2 text-sm">
              <div className="font-medium">{a.typ === "hinweis" ? a.text : ANTWORT_TEXT[a.typ]}</div>
              <div className="mt-0.5 text-xs text-stone-500">
                {uhrzeit(a.zeit)} Uhr · {a.gelesen ? "✓✓ gelesen" : "✓ übermittelt"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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
