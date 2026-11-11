"use client";

import { useEffect, useState, useTransition } from "react";
import type { Status } from "@/lib/auftraege";
import { Icon } from "@/components/Icon";
import { losfahrenAktion, statusAktion, verspaetungAktion } from "../../actions";

const FAHRZEITEN = [10, 20, 30, 45, 60];

export function Steuerung({ id, status, link, karteAktiv }: { id: string; status: Status; link: string; karteAktiv: boolean }) {
  const [laeuft, starten] = useTransition();
  const [auswahl, setAuswahl] = useState<"los" | "spaeter" | null>(null);
  const [kopiert, setKopiert] = useState(false);
  const standort = useStandortTeilen(id, status === "unterwegs" && karteAktiv);

  const zeitwahl = (aktion: (id: string, m: number) => Promise<void>) => (
    <div className="grid grid-cols-3 gap-2">
      {FAHRZEITEN.map((m) => (
        <button key={m} disabled={laeuft} className="knopf-zweit" onClick={() => starten(async () => { await aktion(id, m); setAuswahl(null); })}>
          {m} Min
        </button>
      ))}
      <button disabled={laeuft} className="knopf-zweit text-stone-500" onClick={() => setAuswahl(null)}>Abbruch</button>
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
          <button className="knopf-haupt min-h-16 text-xl" onClick={() => setAuswahl("los")}>
            <Icon name="fahrzeug" className="h-6 w-6" /> Losgefahren
          </button>
        )
      )}

      {status === "unterwegs" && (
        <>
          <button disabled={laeuft} className="knopf-haupt min-h-16 bg-green-600 text-xl active:bg-green-700" onClick={() => starten(() => statusAktion(id, "angekommen"))}>
            <Icon name="haken" className="h-6 w-6" /> Angekommen
          </button>
          {auswahl === "spaeter" ? (
            <div className="karte space-y-3">
              <p className="font-semibold">Neue Ankunft in …</p>
              {zeitwahl(verspaetungAktion)}
            </div>
          ) : (
            <button className="knopf-zweit" onClick={() => setAuswahl("spaeter")}>
              <Icon name="uhr" /> Verspätung melden
            </button>
          )}
          {standort && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-stone-500">
              <Icon name="standort" className="h-3.5 w-3.5" /> {standort}
            </p>
          )}
        </>
      )}

      {status === "angekommen" && (
        <button disabled={laeuft} className="knopf-haupt min-h-16 bg-stone-800 text-xl active:bg-stone-900" onClick={() => starten(() => statusAktion(id, "erledigt"))}>
          <Icon name="haken" className="h-6 w-6" /> Auftrag erledigt
        </button>
      )}

      {(status === "unterwegs" || status === "angekommen") && (
        <div className="grid grid-cols-2 gap-2">
          <button className="knopf-zweit text-sm" onClick={async () => {
            try { await navigator.clipboard.writeText(link); setKopiert(true); setTimeout(() => setKopiert(false), 2000); } catch {}
          }}>
            <Icon name={kopiert ? "haken" : "kopieren"} className="h-4 w-4" /> {kopiert ? "Kopiert" : "Link kopieren"}
          </button>
          <a className="knopf-zweit text-sm" href={link} target="_blank" rel="noreferrer">
            <Icon name="link" className="h-4 w-4" /> Kundenseite
          </a>
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
 * Nur wenn der Betrieb die Live-Karte eingeschaltet hat.
 * (Im Hintergrund geht das erst mit der nativen App – Stufe 3.)
 */
function useStandortTeilen(id: string, aktiv: boolean) {
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (!aktiv) return;
    if (!("geolocation" in navigator)) { setInfo("Standort wird von diesem Gerät nicht unterstützt."); return; }
    let letzte = 0;
    const senden = async (lat: number, lng: number) => {
      try {
        const res = await fetch("/api/position", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, lat, lng }) });
        if (!res.ok) throw new Error(String(res.status));
        setInfo(`Standort geteilt um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} – Seite offen lassen.`);
      } catch {
        setInfo("Standort konnte nicht gesendet werden.");
      }
    };
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
