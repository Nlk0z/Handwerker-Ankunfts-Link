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
  losgefahren: "Hallo {kunde}, {monteur} von {betrieb} ist losgefahren. Ankunft ca. {uhrzeit} Uhr. Live verfolgen: {link}",
  bald_da: "{monteur} von {betrieb} ist in ca. 15 Minuten bei Ihnen (ca. {uhrzeit} Uhr). {link}",
  verspaetung: "Kleine Verspätung: {monteur} von {betrieb} kommt jetzt ca. {uhrzeit} Uhr. Entschuldigung! {link}",
  angekommen: "{monteur} von {betrieb} ist jetzt bei Ihnen angekommen.",
  erledigt: "Vielen Dank, {kunde}! Wie zufrieden waren Sie mit {betrieb}? Hier können Sie uns bewerten: {link}",
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

/** Wie viele SMS braucht der Text? (160 Zeichen, mit Umlauten o. ä. nur 70 pro SMS) */
export function smsAnzahl(text: string) {
  const einfach = /^[A-Za-z0-9 @£$¥èéùìòÇØøÅå_ÆæßÉ!"#%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r]*$/.test(text);
  const proSms = einfach ? 160 : 70;
  const proTeil = einfach ? 153 : 67;
  return text.length <= proSms ? 1 : Math.ceil(text.length / proTeil);
}
