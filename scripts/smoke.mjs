// npm run smoke
// Schneller Rauchtest gegen die laufende App (npm run dev oder npm start).
// Prüft, ob alle wichtigen Seiten antworten. Andere Adresse: BASE_URL=https://... npm run smoke
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const pruefungen = [
  { pfad: "/login", status: 200, enthaelt: "Anmelden" },
  { pfad: "/registrieren", status: 200 },
  { pfad: "/iphone", status: 200, enthaelt: "iPhone-Vorschau" },
  { pfad: "/manifest.webmanifest", status: 200 },
  { pfad: "/icon.svg", status: 200 },
  // ohne Login muss die Handwerker-App zum Login umleiten
  { pfad: "/app", status: [302, 303, 307, 308], umleitung: true },
  // unbekannter Kundenlink darf nicht abstürzen
  { pfad: "/t/gibtesnicht123", status: [200, 404] },
  // Antwort auf unbekannten Link muss abgelehnt werden
  { pfad: "/api/t/gibtesnicht123/antwort", methode: "POST", body: { typ: "passt" }, status: 404 },
];

let fehler = 0;
for (const p of pruefungen) {
  const erlaubt = [p.status].flat();
  try {
    const res = await fetch(BASE + p.pfad, {
      method: p.methode ?? "GET",
      headers: p.body ? { "Content-Type": "application/json" } : undefined,
      body: p.body ? JSON.stringify(p.body) : undefined,
      redirect: p.umleitung ? "manual" : "follow",
      signal: AbortSignal.timeout(60000),
    });
    const text = p.enthaelt ? await res.text() : "";
    const ok = erlaubt.includes(res.status) && (!p.enthaelt || text.includes(p.enthaelt));
    console.log(`${ok ? "✅" : "❌"} ${p.methode ?? ""} ${p.pfad} → ${res.status}${p.enthaelt && !text.includes(p.enthaelt) ? ` (Text „${p.enthaelt}“ fehlt)` : ""}`);
    if (!ok) fehler++;
  } catch (e) {
    console.log(`❌ ${p.pfad} → ${e.message}`);
    fehler++;
  }
}
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : "\nAlles gut.");
process.exit(fehler ? 1 : 0);
