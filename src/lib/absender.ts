// SMS-Absendername: höchstens 11 Zeichen, nur Buchstaben und Ziffern (Vorgabe des SMS-Standards).

export const ABSENDER_MAX = 11;

const ERSATZ: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };
const BRANCHE = /^(gmbh|kg|ug|ohg|gbr|ek|e\.k|co|und|inh|gebr|meisterbetrieb|fachbetrieb|elektro|elektrotechnik|sanitaer|heizung|haustechnik|gebaeudetechnik|bad|dach|dachdeckerei|maler|malerbetrieb|schreinerei|tischlerei|bau|service|handwerk|installation|klima|kaelte|solar)$/i;

/** Nur erlaubte Zeichen, höchstens 11. */
export function absenderSaeubern(t: string) {
  return t.replace(/[äöüÄÖÜß]/g, (z) => ERSATZ[z]!).replace(/[^A-Za-z0-9]/g, "").slice(0, ABSENDER_MAX);
}

const gross = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** Vorschläge aus dem Betriebsnamen, z. B. "Elektro Maier" -> ["ElektrMaier", "EMaier", "Maier", …] */
export function absenderVorschlaege(name: string): string[] {
  const woerter = name.replace(/[äöüÄÖÜß]/g, (z) => ERSATZ[z]!).split(/[^A-Za-z0-9]+/).filter(Boolean).map(gross);
  const kern = woerter.filter((w) => !BRANCHE.test(w));
  const branche = woerter.filter((w) => BRANCHE.test(w));
  const k = kern.join("");
  const liste = [
    woerter.join(""),
    k,
    branche[0] && k ? branche[0][0] + k : "",
    branche[0] && k && k.length < ABSENDER_MAX - 1 ? branche[0].slice(0, ABSENDER_MAX - k.length) + k : "",
    kern.length > 1 ? kern[0]![0] + kern.at(-1)! : "",
    kern.at(-1) ?? "",
    kern[0] ?? "",
    woerter.join("").slice(0, ABSENDER_MAX),
  ];
  return [...new Set(liste.filter((v) => v.length >= 3 && v.length <= ABSENDER_MAX))].slice(0, 4);
}
