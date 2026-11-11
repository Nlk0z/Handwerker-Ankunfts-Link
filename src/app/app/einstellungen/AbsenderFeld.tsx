"use client";

import { useState } from "react";
import { ABSENDER_MAX, absenderSaeubern, absenderVorschlaege } from "@/lib/absender";

/** SMS-Absender mit Vorschlägen und Vorschau, wie er beim Kunden erscheint. */
export function AbsenderFeld({ start, betrieb }: { start: string; betrieb: string }) {
  const [wert, setWert] = useState(start);
  const vorschlaege = absenderVorschlaege(betrieb).filter((v) => v !== wert);

  return (
    <div className="space-y-2">
      <label className="beschriftung" htmlFor="sms_absender">SMS-Absender (so steht es beim Kunden über der SMS)</label>
      <div className="relative">
        <input
          className="eingabe pr-14"
          id="sms_absender"
          name="sms_absender"
          maxLength={ABSENDER_MAX}
          value={wert}
          onChange={(e) => setWert(absenderSaeubern(e.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-stone-400">
          {wert.length}/{ABSENDER_MAX}
        </span>
      </div>
      {vorschlaege.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">Vorschläge:</span>
          {vorschlaege.map((v) => (
            <button key={v} type="button" onClick={() => setWert(v)} className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-stone-300 active:bg-stone-100">
              {v}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 rounded-2xl bg-stone-100 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M12 3.5c-5 0-9 3.3-9 7.4 0 2.4 1.4 4.5 3.5 5.9-.2 1.4-.9 2.6-1.9 3.4 2 0 3.8-.8 5-1.9.8.2 1.6.3 2.4.3 5 0 9-3.3 9-7.4s-4-7.7-9-7.7z" />
          </svg>
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-semibold">{wert || "Handwerker"}</span>
          <span className="block truncate text-stone-500">Hallo Familie Schneider, Thomas Maier ist losgefahren …</span>
        </span>
      </div>
      <p className="text-xs text-stone-500">
        Mehr als {ABSENDER_MAX} Zeichen erlaubt der SMS-Standard nicht, nur Buchstaben und Ziffern. Der volle Betriebsname steht ja in der SMS selbst.
      </p>
    </div>
  );
}
