---
name: iphone-vorschau
description: Zeigt die Handwerker-SMS-App („Kommt gleich“) auf dem PC in zwei iPhone-Rahmen (Handwerker + Kunde) und prüft sie auf iPhone-Größe. Nutzen bei „iPhone-Vorschau“, „zeig's mir auf dem iPhone“, „wie sieht das auf dem Handy aus“, oder nach UI-Änderungen zum Prüfen.
---

# iPhone-Vorschau

Die App läuft lokal mit Next.js. `/iphone` (Datei `public/iphone.html`) zeigt zwei iPhones (393 × 852, wie iPhone 15/16):
links die Handwerker-App, rechts die Kundenseite. Sobald links ein Kundenlink (`/t/…`) sichtbar ist, lädt ihn das rechte iPhone automatisch.

## In der Claude-Desktop-App (Browser-Pane)
1. `preview_start` mit `name: "handwerker-sms"` (aus `.claude/launch.json`, startet `npm run dev` auf Port 3000).
2. Zu `http://localhost:3000/iphone` navigieren.
3. Demo-Login ist vorausgefüllt (`demo@lukas-technology.de`, Demo-Modus ohne `.env`). Links „Anmelden“ klicken, Auftrag öffnen → rechts erscheint die Kundenseite.
4. Für eine echte Handy-Prüfung einzelner Seiten zusätzlich `resize_window` mit `preset: "mobile"` und z. B. `/login` oder einen `/t/…`-Link öffnen; danach `preset: "desktop"` zurücksetzen.

## In einer Cloud-Sitzung (Claude-App, Vorschau rechts)
1. `npm install` (falls `node_modules` fehlt), dann `npm run dev` im Hintergrund starten und warten, bis `http://localhost:3000/login` antwortet.
2. `report_preview_port` mit `port: 3000` aufrufen. Die Vorschau rechts in der Claude-App zeigt dann die Startadresse.
3. Beim Entwickeln leitet die Startadresse `/` direkt auf `/iphone` um (nur `NODE_ENV=development`, nicht in den iPhone-Rahmen). Die Vorschau zeigt also sofort beide iPhones und ist bedienbar.
4. Ein- und ausblenden: über den Vorschau-Knopf der Claude-App. Ein eigenes Panel kann keine bedienbare Webseite zeigen.

## Ohne Claude (Niko selbst)
```bash
npm run iphone
```
Startet die App, falls sie nicht läuft, und öffnet `http://localhost:3000/iphone` im Standardbrowser.

Parameter: `/iphone?h=/app/neu&k=/t/<token>` öffnet direkt bestimmte Seiten.

## Auf dem echten iPhone
Nach dem Deploy (Vercel, siehe README) die Vercel-Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

## Immer prüfen
Nach jeder Änderung: `npm run check` (Typen + Build), App starten, `npm run smoke`, dann in der iPhone-Vorschau durchklicken und Konsole auf Fehler prüfen. Erst dann „fertig“ sagen.
