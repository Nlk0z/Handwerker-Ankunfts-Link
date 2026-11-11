# Kommt gleich – Handwerker-SMS (Lukas Technology)

Projektnotiz im Vault: `C:\Users\Nikolas\OneDrive\Dokumente\Second Brain\Lukas Technology\SMS Handwerker.md`

- Next.js 15 + TypeScript + Tailwind. Ohne `.env` Demo-Modus (PGlite, SMS nur angezeigt).
- Starten: `npm run dev` · iPhone-Vorschau: `npm run iphone` bzw. http://localhost:3000/iphone (Skill `iphone-vorschau`)
- Texte und Code-Namen auf Deutsch.

## Pflicht: alles prüfen, bevor es „fertig“ ist
1. `npm run check` (Typen + Build)
2. App starten, `npm run smoke`
3. In der iPhone-Vorschau durchklicken (Handwerker + Kunde), Browser-Konsole ohne Fehler
4. Nach dem Push: GitHub-Workflow „Prüfen“ muss grün sein (`gh run list`)
