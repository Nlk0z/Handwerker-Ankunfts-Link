// SMS-Texte: Standardtexte, Platzhalter und Einfüllen.
// Wird auf dem Server (Versand) und im Browser (Vorschau in den Einstellungen) benutzt.

export const SMS_TYPEN = ["losgefahren", "bald_da", "verspaetung", "angekommen", "erledigt"] as const;
export type SmsTyp = (typeof SMS_TYPEN)[number];

export type SmsVorlage = { text: string; aktiv: boolean };
export type SmsVorlagen = Partial<Record<SmsTyp, Partial<SmsVorlage>>>;

export const SMS_INFO: Record<SmsTyp, { titel: string; wann: string; abschaltbar: boolean; mitLink: boolean }> = {
  losgefahren: { titel: "Losgefahren", wann: "Wenn Sie auf „Losgefahren“ tippen", abschaltbar: false, mitLink: true },
  bald_da: { titel: "Gleich da", wann: "Automatisch ca. 15 Minuten vor Ankunft (bei Fahrten über 20 Min.)", abschaltbar: true, mitLink: true },
  verspaetung: { titel: "Verspätung", wann: "Wenn Sie „Verspätung melden“", abschaltbar: false, mitLink: true },
  angekommen: { titel: "Angekommen", wann: "Wenn Sie auf „Angekommen“ tippen", abschaltbar: true, mitLink: false },
  erledigt: { titel: "Danke + Bewertung", wann: "Wenn Sie auf „Auftrag erledigt“ tippen", abschaltbar: true, mitLink: true },
};

export const SMS_STANDARD: Record<SmsTyp, string> = {
  losgefahren: "{monteur} von {betrieb} ist zu Ihnen losgefahren. Ankunft ca. {uhrzeit} Uhr: {link}",
  bald_da: "{monteur} von {betrieb} ist in ca. 15 Minuten bei Ihnen (ca. {uhrzeit} Uhr). {link}",
  verspaetung: "Kleine Verspätung: {monteur} kommt jetzt ca. {uhrzeit} Uhr. Entschuldigung! {link}",
  angekommen: "{monteur} von {betrieb} ist jetzt bei Ihnen angekommen.",
  erledigt: "Danke, {kunde}! Wie zufrieden waren Sie mit {betrieb}? Hier bewerten: {link}",
};

export const PLATZHALTER: { name: string; bedeutung: string; beispiel: string }[] = [
  { name: "{kunde}", bedeutung: "Name des Kunden", beispiel: "Familie Schneider" },
  { name: "{monteur}", bedeutung: "Wer hinfährt", beispiel: "Thomas Maier" },
  { name: "{betrieb}", bedeutung: "Name Ihres Betriebs", beispiel: "Elektro Maier" },
  { name: "{uhrzeit}", bedeutung: "Ankunftszeit", beispiel: "14:30" },
  { name: "{link}", bedeutung: "Link zur Kundenseite", beispiel: "https://kommt-gleich.de/t/Ab3xY9kQ2mPz7LwR" },
];

export type SmsWerte = { kunde: string; monteur: string; betrieb: string; uhrzeit: string; link: string };

/** Gültige Vorlage für einen Typ: eigener Text oder Standard, aktiv oder nicht. */
export function vorlage(vorlagen: SmsVorlagen | null | undefined, typ: SmsTyp): SmsVorlage {
  const eigen = vorlagen?.[typ];
  const text = eigen?.text?.trim() || SMS_STANDARD[typ];
  const aktiv = SMS_INFO[typ].abschaltbar ? eigen?.aktiv !== false : true;
  return { text, aktiv };
}

/** Platzhalter ersetzen. Fehlt {link} bei einer SMS, die einen braucht, wird er angehängt. */
export function smsFuellen(text: string, typ: SmsTyp, w: SmsWerte) {
  let t = text;
  if (SMS_INFO[typ].mitLink && !t.includes("{link}")) t = `${t.trim()} {link}`;
  return t
    .replaceAll("{kunde}", w.kunde)
    .replaceAll("{monteur}", w.monteur)
    .replaceAll("{betrieb}", w.betrieb)
    .replaceAll("{uhrzeit}", w.uhrzeit)
    .replaceAll("{link}", w.link)
    .replace(/\s+/g, " ")
    .trim();
}

// Zeichen, die in eine normale SMS (160 Zeichen) passen. Alles andere (z. B. Emojis, „ “ –)
// schaltet die ganze SMS auf 70 Zeichen um.
const GSM = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
const GSM_DOPPELT = new Set("^{}\\[~]|€"); // zählen als 2 Zeichen

/** Zeichen im Text, die die SMS auf 70 Zeichen pro SMS umschalten (ohne Doppelte). */
export function teureZeichen(text: string) {
  return [...new Set([...text].filter((z) => !GSM.has(z) && !GSM_DOPPELT.has(z)))];
}

/** Wie viele SMS braucht der Text? (160 Zeichen; mit Sonderzeichen nur 70 pro SMS) */
export function smsAnzahl(text: string) {
  if (teureZeichen(text).length) {
    const laenge = [...text].length;
    return laenge <= 70 ? 1 : Math.ceil(laenge / 67);
  }
  const laenge = [...text].reduce((n, z) => n + (GSM_DOPPELT.has(z) ? 2 : 1), 0);
  return laenge <= 160 ? 1 : Math.ceil(laenge / 153);
}
