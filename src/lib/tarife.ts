// Pakete (Preise netto pro Monat). Zusätzliche SMS über das Kontingent hinaus kosten EXTRA_SMS_CENT.

export const EXTRA_SMS_CENT = 9;

export const TARIFE = {
  test: { name: "Testphase", preis: 0, monteure: 3, sms: 100 },
  solo: { name: "Solo", preis: 29, monteure: 1, sms: 150 },
  team: { name: "Team", preis: 99, monteure: 5, sms: 700 },
  betrieb: { name: "Betrieb", preis: 199, monteure: 12, sms: 1700 },
} as const;

export type TarifName = keyof typeof TARIFE;

export function tarif(name: string | null | undefined) {
  return TARIFE[(name ?? "test") as TarifName] ?? TARIFE.test;
}
