---
name: iphone-vorschau
description: Zeigt die Handwerker-SMS-App („Kommt gleich“) auf dem PC in zwei iPhone-Rahmen (Handwerker + Kunde) und prüft sie auf iPhone-Größe. Nutzen bei „iPhone-Vorschau“, „zeig's mir auf dem iPhone“, „wie sieht das auf dem Handy aus“, oder nach UI-Änderungen zum Prüfen.
---

# iPhone-Vorschau

Die App läuft lokal mit Next.js. `/iphone` (Datei `public/iphone.html`) zeigt zwei iPhones (393 × 852, wie iPhone 15/16):
links die Handwerker-App, rechts das Kunden-iPhone mit einer Nachrichten-App. Tippt der Handwerker auf „Losgefahren“, kommt rechts die SMS an; ein Tipp auf den Link öffnet die Kundenseite, „‹ Nachrichten“ oder der Balken unten führt zurück. Anruf-Knöpfe zeigen einen Anruf-Bildschirm im iPhone.

## In der Claude-Desktop-App (Browser-Pane)
1. `preview_start` mit `name: "handwerker-sms"` (aus `.claude/launch.json`, startet `npm run dev` auf Port 3000).
2. Zu `http://localhost:3000/iphone` navigieren.
3. Demo-Login ist vorausgefüllt (`demo@lukas-technology.de`, Demo-Modus ohne `.env`). Links „Anmelden“ klicken, Auftrag öffnen, „Losgefahren“ → rechts kommt die SMS an, Link antippen → Kundenseite.
4. Für eine echte Handy-Prüfung einzelner Seiten zusätzlich `resize_window` mit `preset: "mobile"` und z. B. `/login` oder einen `/t/…`-Link öffnen; danach `preset: "desktop"` zurücksetzen.

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
