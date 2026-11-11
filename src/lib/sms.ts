import "server-only";
import { query } from "./db";
import { absenderSaeubern } from "./absender";

import type { SmsTyp } from "./smsTexte";
export type { SmsTyp };

/**
 * Schickt eine SMS über seven.io und protokolliert sie.
 * Ohne SEVEN_API_KEY wird nichts verschickt (Demo): die SMS erscheint nur in der App.
 */
export async function sendeSms(opts: {
  auftragId: string;
  typ: SmsTyp;
  an: string;
  text: string;
  absender?: string | null;
}) {
  const key = process.env.SEVEN_API_KEY;
  let status: "demo" | "gesendet" | "fehler" = "demo";
  let anbieterId: string | null = null;
  let fehler: string | null = null;

  if (key) {
    try {
      const res = await fetch("https://gateway.seven.io/api/sms", {
        method: "POST",
        headers: { "X-Api-Key": key, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          to: opts.an,
          text: opts.text,
          // Absender: max. 11 Zeichen, nur Buchstaben/Ziffern
          from: absenderSaeubern(opts.absender || "") || "Handwerker",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: string; messages?: { id?: string }[] };
      if (res.ok && (data.success === "100" || data.success === "101")) {
        status = "gesendet";
        anbieterId = data.messages?.[0]?.id ?? null;
      } else {
        status = "fehler";
        fehler = `seven.io Antwort ${res.status}: ${JSON.stringify(data).slice(0, 300)}`;
      }
    } catch (e) {
      status = "fehler";
      fehler = String(e).slice(0, 300);
    }
  } else {
    console.log(`[Demo-SMS an ${opts.an}] ${opts.text}`);
  }

  await query(
    `INSERT INTO benachrichtigung (auftrag_id, typ, text, status, anbieter_id, fehler)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [opts.auftragId, opts.typ, opts.text, status, anbieterId, fehler],
  );
  return status;
}
