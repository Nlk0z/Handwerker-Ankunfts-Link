// Macht iPhone-Screenshots aller wichtigen Seiten und legt sie in /screenshots ab.
// Voraussetzung: App läuft im Demo-Modus (npm run dev oder npm start).
// Aufruf: npm run screenshots   (andere Adresse: BASE_URL=http://... npm run screenshots)
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// Playwright wird bewusst nicht als Abhängigkeit installiert (große Browser-Downloads).
// Falls nicht vorhanden: npm i -D playwright && npx playwright install chromium
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORDNER = new URL("../screenshots/", import.meta.url).pathname;
mkdirSync(ORDNER, { recursive: true });

const iphone = devices["iPhone 15"];
const BUECHENBACH = { latitude: 49.2672, longitude: 11.0452 };

const browser = await chromium.launch();
const monteur = await browser.newContext({
  ...iphone,
  locale: "de-DE",
  timezoneId: "Europe/Berlin",
  geolocation: BUECHENBACH,
  permissions: ["geolocation"],
});
const seite = await monteur.newPage();
const foto = async (p, name, ganz = false) => {
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${ORDNER}${name}.png`, fullPage: ganz });
  console.log("📸", name);
};

// 1. Login
await seite.goto(`${BASE}/login`);
await foto(seite, "01-login");
await seite.getByRole("button", { name: "Anmelden" }).click();
await seite.waitForURL("**/app");

// 2. Tagesliste
await foto(seite, "02-tagesliste");

// 3. Neuer Auftrag (Formular)
await seite.goto(`${BASE}/app/neu`);
await seite.fill("#name", "Familie Beispiel");
await seite.fill("#telefon", "0171 1234567");
await seite.fill("#adresse", "Am Markt 1, 91154 Roth");
await foto(seite, "03-neuer-auftrag");

// 4. Auftrag öffnen (ersten geplanten)
await seite.goto(`${BASE}/app`);
await seite.locator("a", { hasText: "Geplant" }).first().click();
await seite.waitForURL("**/app/auftrag/**");
await foto(seite, "04-auftrag");
const kundenLink = await seite.locator("p.font-mono").innerText();

// 5. Losgefahren -> Fahrzeit wählen -> unterwegs
await seite.getByRole("button", { name: /Losgefahren/ }).click();
await foto(seite, "05-fahrzeit-waehlen");
await seite.getByRole("button", { name: "30 Min" }).click();
await seite.getByRole("button", { name: /Angekommen/ }).waitFor();
await seite.waitForTimeout(1500); // Standort wird gesendet
await seite.reload();
await foto(seite, "06-unterwegs-mit-sms", true);

// 6. Kundenseite (ohne Login, eigener "Kunde")
const kunde = await browser.newContext({ ...iphone, locale: "de-DE", timezoneId: "Europe/Berlin" });
const k = await kunde.newPage();
await k.goto(kundenLink.replace(/^https?:\/\/[^/]+/, BASE));
await k.waitForTimeout(2500); // Kartenkacheln laden
await foto(k, "07-kunde-unterwegs");

// 7. Kundenseite eines noch geplanten Termins
await seite.goto(`${BASE}/app`);
await seite.locator("a", { hasText: "Geplant" }).first().click();
await seite.waitForURL("**/app/auftrag/**");
const link2 = await seite.locator("p.font-mono").innerText();
await k.goto(link2.replace(/^https?:\/\/[^/]+/, BASE));
await foto(k, "08-kunde-geplant");

// 8. Einstellungen
await seite.goto(`${BASE}/app/einstellungen`);
await foto(seite, "09-einstellungen", true);

await browser.close();
console.log(`Fertig: ${ORDNER}`);
