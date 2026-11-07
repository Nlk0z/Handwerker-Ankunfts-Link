"use client";

import { useEffect, useState, useTransition } from "react";
import type { Status } from "@/lib/auftraege";
import { losfahrenAktion, statusAktion, verspaetungAktion } from "../../actions";

const FAHRZEITEN = [10, 20, 30, 45, 60];

export function Steuerung({ id, status, link }: { id: string; status: Status; link: string }) {
  const [laeuft, starten] = useTransition();
  const [auswahl, setAuswahl] = useState<"los" | "spaeter" | null>(null);
  const [kopiert, setKopiert] = useState(false);
  const standort = useStandortTeilen(id, status === "unterwegs");

  const zeitwahl = (aktion: (id: string, m: number) => Promise<void>) => (
    <div className="grid grid-cols-3 gap-2">
      {FAHRZEITEN.map((m) => (
        <button key={m} disabled={laeuft} className="knopf-zweit" onClick={() => starten(async () => { await aktion(id, m); setAuswahl(null); })}>
          {m} Min
        </button>
      ))}
      <button className="knopf-zweit text-stone-500" onClick={() => setAuswahl(null)}>Abbruch</button>
    </div>
  );

  return (
    <div className="space-y-3">
      {status === "geplant" && (
        auswahl === "los" ? (
          <div className="karte space-y-3">
            <p className="font-semibold">Wie lange fahren Sie ungefähr?</p>
            {zeitwahl(losfahrenAktion)}
            <p className="text-xs text-stone-500">Der Kunde bekommt sofort eine SMS mit Link und Ankunftszeit.</p>
          </div>
        ) : (
          <button className="knopf-haupt min-h-16 text-xl" onClick={() => setAuswahl("los")}>🚐 Losgefahren</button>
        )
      )}

      {status === "unterwegs" && (
        <>
          <button disabled={laeuft} className="knopf-haupt min-h-16 bg-green-600 text-xl active:bg-green-700" onClick={() => starten(() => statusAktion(id, "angekommen"))}>
            ✅ Angekommen
          </button>
          {auswahl === "spaeter" ? (
            <div className="karte space-y-3">
              <p className="font-semibold">Neue Ankunft in …</p>
              {zeitwahl(verspaetungAktion)}
            </div>
          ) : (
            <button className="knopf-zweit" onClick={() => setAuswahl("spaeter")}>⏱ Verspätung melden</button>
          )}
          <p className="px-1 text-xs text-stone-500">{standort}</p>
        </>
      )}

      {status === "angekommen" && (
        <button disabled={laeuft} className="knopf-haupt min-h-16 bg-stone-800 text-xl active:bg-stone-900" onClick={() => starten(() => statusAktion(id, "erledigt"))}>
          Auftrag erledigt
        </button>
      )}

      {(status === "geplant" || status === "unterwegs" || status === "angekommen") && (
        <div className="karte space-y-2">
          <p className="text-sm font-semibold text-stone-600">Kunden-Link</p>
          <p className="break-all rounded-lg bg-stone-100 px-3 py-2 font-mono text-xs">{link}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="knopf-zweit text-sm" onClick={async () => {
              try { await navigator.clipboard.writeText(link); setKopiert(true); setTimeout(() => setKopiert(false), 2000); } catch {}
            }}>{kopiert ? "Kopiert ✓" : "Kopieren"}</button>
            <a className="knopf-zweit text-sm" href={link} target="_blank" rel="noreferrer">Ansehen</a>
          </div>
        </div>
      )}

      {status === "geplant" && (
        <button disabled={laeuft} className="w-full py-2 text-sm font-medium text-red-600" onClick={() => {
          if (confirm("Auftrag wirklich stornieren?")) starten(() => statusAktion(id, "storniert"));
        }}>Auftrag stornieren</button>
      )}
    </div>
  );
}

/**
 * Teilt den Standort, solange die Seite offen ist und der Monteur unterwegs ist.
 * (Im Hintergrund geht das erst mit der nativen App – Stufe 3.)
 */
function useStandortTeilen(id: string, aktiv: boolean) {
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (!aktiv) return;
    if (!("geolocation" in navigator)) { setInfo("Standort wird von diesem Gerät nicht unterstützt."); return; }
    let letzte = 0;
    const senden = (lat: number, lng: number) =>
      fetch("/api/position", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, lat, lng }) })
        .then(() => setInfo(`📍 Standort geteilt um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} – Seite offen lassen.`))
        .catch(() => setInfo("Standort konnte nicht gesendet werden."));
    const w = navigator.geolocation.watchPosition(
      (p) => {
        const jetzt = Date.now();
        if (jetzt - letzte < 30_000) return; // höchstens alle 30 Sekunden
        letzte = jetzt;
        senden(p.coords.latitude, p.coords.longitude);
      },
      () => setInfo("Standort nicht freigegeben – der Kunde sieht nur die Uhrzeit."),
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, [id, aktiv]);
  return info;
}
