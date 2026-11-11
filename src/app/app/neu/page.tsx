import Link from "next/link";
import { nutzerOderLogin } from "@/lib/auth";
import { query } from "@/lib/db";
import { heute } from "@/lib/format";
import { auftragAnlegen } from "../actions";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

const FEHLER: Record<string, string> = {
  telefon: "Die Handynummer sieht nicht richtig aus (z. B. 0171 1234567).",
  felder: "Bitte Name, Handynummer und Datum ausfüllen.",
  zeit: "Das Zeitfenster passt nicht: „bis“ muss nach „von“ liegen.",
};

export default async function NeuerAuftrag({ searchParams }: { searchParams: Promise<{ datum?: string; fehler?: string }> }) {
  const n = await nutzerOderLogin();
  const { datum, fehler } = await searchParams;
  const team = await query<{ id: string; name: string }>(
    `SELECT id, name FROM mitarbeiter WHERE betrieb_id = $1 ORDER BY name`,
    [n.betrieb_id],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/app${datum ? `?datum=${datum}` : ""}`} className="rund-knopf -ml-2" aria-label="Zurück">
          <Icon name="zurueck" className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold">Neuer Auftrag</h1>
      </div>

      <form action={auftragAnlegen} className="space-y-4">
        <div className="karte space-y-4">
          <div>
            <label className="beschriftung" htmlFor="name">Kunde *</label>
            <input className="eingabe" id="name" name="name" required placeholder="z. B. Familie Schneider" autoComplete="off" />
          </div>
          <div>
            <label className="beschriftung" htmlFor="telefon">Handynummer * (bekommt die SMS)</label>
            <input className="eingabe" id="telefon" name="telefon" type="tel" inputMode="tel" required placeholder="0171 1234567" autoComplete="off" />
          </div>
          <div>
            <label className="beschriftung" htmlFor="adresse">Adresse (empfohlen)</label>
            <input className="eingabe" id="adresse" name="adresse" placeholder="Straße, PLZ Ort" autoComplete="off" />
          </div>
        </div>

        <div className="karte space-y-4">
          <div>
            <label className="beschriftung" htmlFor="datum">Termin *</label>
            <input className="eingabe" id="datum" name="datum" type="date" required defaultValue={datum ?? heute()} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="beschriftung" htmlFor="von">Zeitfenster von</label>
              <input className="eingabe" id="von" name="von" type="time" defaultValue="08:00" step={900} />
            </div>
            <div>
              <label className="beschriftung" htmlFor="bis">bis</label>
              <input className="eingabe" id="bis" name="bis" type="time" defaultValue="11:00" step={900} />
            </div>
          </div>
          {team.length > 1 && (
            <div>
              <label className="beschriftung" htmlFor="mitarbeiter">Wer fährt hin?</label>
              <select className="eingabe" id="mitarbeiter" name="mitarbeiter" defaultValue={n.id}>
                {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="beschriftung" htmlFor="notiz">Notiz (nur intern)</label>
            <textarea className="eingabe min-h-20 py-2" id="notiz" name="notiz" placeholder="z. B. Steckdose Küche, Klingel defekt" />
          </div>
        </div>

        {fehler && <p className="text-sm font-medium text-red-600">{FEHLER[fehler]}</p>}
        <button type="submit" className="knopf-haupt text-lg">Auftrag speichern</button>
      </form>
    </div>
  );
}
