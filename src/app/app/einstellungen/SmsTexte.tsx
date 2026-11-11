"use client";

import { useState } from "react";
import {
  PLATZHALTER,
  SMS_INFO,
  SMS_STANDARD,
  SMS_TYPEN,
  smsAnzahl,
  smsFuellen,
  vorlage,
  type SmsTyp,
  type SmsVorlagen,
} from "@/lib/smsTexte";
import { smsVorlagenSpeichern } from "../actions";

/** SMS-Texte bearbeiten, mit Vorschau wie beim Kunden. */
export function SmsTexte({ vorlagen, betrieb, darf }: { vorlagen: SmsVorlagen; betrieb: string; darf: boolean }) {
  const [texte, setTexte] = useState(() =>
    Object.fromEntries(SMS_TYPEN.map((t) => [t, vorlage(vorlagen, t).text])) as Record<SmsTyp, string>,
  );
  const [aktiv, setAktiv] = useState(() =>
    Object.fromEntries(SMS_TYPEN.map((t) => [t, vorlage(vorlagen, t).aktiv])) as Record<SmsTyp, boolean>,
  );
  const beispiel = { kunde: "Familie Schneider", monteur: "Thomas Maier", betrieb, uhrzeit: "14:30", link: "https://kommt-gleich.de/t/Ab3xY9kQ2mPz7LwR" };

  return (
    <form action={smsVorlagenSpeichern} className="space-y-4">
      <fieldset disabled={!darf} className="space-y-4">
        <details className="rounded-xl bg-stone-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-stone-700">Welche Platzhalter gibt es?</summary>
          <ul className="mt-2 space-y-1">
            {PLATZHALTER.map((p) => (
              <li key={p.name}>
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs ring-1 ring-stone-200">{p.name}</code>{" "}
                <span className="text-stone-600">{p.bedeutung}</span>
              </li>
            ))}
          </ul>
        </details>

        {SMS_TYPEN.map((typ) => {
          const info = SMS_INFO[typ];
          const vorschau = smsFuellen(texte[typ], typ, beispiel);
          const anzahl = smsAnzahl(vorschau);
          return (
            <div key={typ} className={`space-y-2 rounded-xl p-3 ring-1 ring-stone-200 ${aktiv[typ] ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{info.titel}</p>
                  <p className="text-xs text-stone-500">{info.wann}</p>
                </div>
                {info.abschaltbar ? (
                  <label className="flex shrink-0 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`aktiv_${typ}`}
                      checked={aktiv[typ]}
                      onChange={(e) => setAktiv({ ...aktiv, [typ]: e.target.checked })}
                      className="h-5 w-5 accent-marke"
                    />
                    senden
                  </label>
                ) : (
                  <input type="hidden" name={`aktiv_${typ}`} value="on" />
                )}
              </div>
              <textarea
                name={`text_${typ}`}
                className="eingabe min-h-24 py-2 text-[15px]"
                value={texte[typ]}
                maxLength={480}
                onChange={(e) => setTexte({ ...texte, [typ]: e.target.value })}
              />
              <div className="rounded-xl bg-stone-100 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">So kommt es an</p>
                <p className="break-words">{vorschau}</p>
                <p className={`mt-1 text-xs ${anzahl > 1 ? "text-amber-700" : "text-stone-500"}`}>
                  {vorschau.length} Zeichen · {anzahl === 1 ? "1 SMS" : `${anzahl} SMS (kostet ${anzahl}×)`}
                </p>
              </div>
              {texte[typ] !== SMS_STANDARD[typ] && (
                <button type="button" className="text-sm font-medium text-marke" onClick={() => setTexte({ ...texte, [typ]: SMS_STANDARD[typ] })}>
                  Standardtext wiederherstellen
                </button>
              )}
            </div>
          );
        })}
        {darf && <button className="knopf-haupt" type="submit">SMS-Texte speichern</button>}
      </fieldset>
      {!darf && <p className="text-sm text-stone-500">Nur der Inhaber kann die SMS-Texte ändern.</p>}
    </form>
  );
}
