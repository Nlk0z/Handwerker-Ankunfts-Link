"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { abmelden, nutzerOderLogin, passwortHash } from "@/lib/auth";
import { eins, query } from "@/lib/db";
import { minutenBis, normalisiereTelefon } from "@/lib/format";
import { absenderSaeubern } from "@/lib/absender";
import { SMS_INFO, SMS_TYPEN, type SmsVorlagen } from "@/lib/smsTexte";
import {
  auftragLaden,
  basisUrl,
  gueltigBis,
  losfahren,
  neuerToken,
  statusSetzen,
  verspaetung,
} from "@/lib/auftraege";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function auftragAnlegen(fd: FormData) {
  const n = await nutzerOderLogin();
  const telefon = normalisiereTelefon(text(fd, "telefon"));
  const datum = text(fd, "datum");
  if (!text(fd, "name") || !telefon || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    redirect(`/app/neu?fehler=${telefon ? "felder" : "telefon"}`);
  }
  const von = text(fd, "von") || null;
  const bis = text(fd, "bis") || null;
  if (von && bis && bis <= von) redirect(`/app/neu?datum=${datum}&fehler=zeit`);
  // Mitarbeiter muss zum eigenen Betrieb gehören
  let mitarbeiterId = text(fd, "mitarbeiter") || n.id;
  const passt = await eins(`SELECT 1 FROM mitarbeiter WHERE id = $1 AND betrieb_id = $2`, [mitarbeiterId, n.betrieb_id]);
  if (!passt) mitarbeiterId = n.id;

  const a = await eins<{ id: string }>(
    `INSERT INTO auftrag (betrieb_id, mitarbeiter_id, kunde_name, kunde_telefon, adresse, termin_datum,
                          fenster_von, fenster_bis, notiz, link_token, link_gueltig_bis)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      n.betrieb_id,
      mitarbeiterId,
      text(fd, "name"),
      telefon,
      text(fd, "adresse") || null,
      datum,
      von,
      bis,
      text(fd, "notiz") || null,
      neuerToken(),
      gueltigBis(datum),
    ],
  );
  redirect(`/app/auftrag/${a!.id}`);
}

async function kundenLink(betriebId: string, id: string) {
  const a = await auftragLaden(betriebId, id);
  if (!a) redirect("/app");
  return `${await basisUrl()}/t/${a.link_token}`;
}

/**
 * Fahrzeit: entweder Minuten (Schnellauswahl) oder eine Uhrzeit "HH:MM" (freie Eingabe).
 * Gibt eine Fehlermeldung zurück, wenn die Uhrzeit nicht passt.
 */
function minutenAus(zeit: number | string): number | string {
  if (typeof zeit === "number") return Math.max(1, Math.min(240, Math.round(zeit)));
  const m = minutenBis(zeit);
  if (m === null) return "Bitte eine Uhrzeit in der Zukunft eingeben.";
  if (m > 12 * 60) return "Die Uhrzeit liegt mehr als 12 Stunden in der Zukunft.";
  return m;
}

export async function losfahrenAktion(id: string, zeit: number | string): Promise<string | undefined> {
  const n = await nutzerOderLogin();
  const m = minutenAus(zeit);
  if (typeof m === "string") return m;
  await losfahren(n.betrieb_id, id, m, await kundenLink(n.betrieb_id, id));
  revalidatePath(`/app/auftrag/${id}`);
}

export async function verspaetungAktion(id: string, zeit: number | string): Promise<string | undefined> {
  const n = await nutzerOderLogin();
  const m = minutenAus(zeit);
  if (typeof m === "string") return m;
  await verspaetung(n.betrieb_id, id, m, await kundenLink(n.betrieb_id, id));
  revalidatePath(`/app/auftrag/${id}`);
}

export async function statusAktion(id: string, status: "angekommen" | "erledigt" | "storniert") {
  const n = await nutzerOderLogin();
  await statusSetzen(n.betrieb_id, id, status, await kundenLink(n.betrieb_id, id));
  revalidatePath(`/app/auftrag/${id}`);
  revalidatePath("/app");
}

/** "www.beispiel.de" -> "https://www.beispiel.de"; ungültig -> undefined */
function adresse(eingabe: string): string | null | undefined {
  if (!eingabe) return null;
  const mitSchema = /^https?:\/\//i.test(eingabe) ? eingabe : `https://${eingabe}`;
  try {
    const u = new URL(mitSchema);
    return u.hostname.includes(".") ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function einstellungenSpeichern(fd: FormData) {
  const n = await nutzerOderLogin();
  if (n.rolle !== "inhaber") redirect("/app/einstellungen");
  const telefon = text(fd, "telefon") ? normalisiereTelefon(text(fd, "telefon")) : null;
  if (text(fd, "telefon") && !telefon) redirect("/app/einstellungen?fehler=telefon");
  const website = adresse(text(fd, "website"));
  const googleEingabe = text(fd, "bewertung_link");
  // Nur die Google-Place-ID eingegeben? Dann daraus den Link zum Bewertungsfenster bauen.
  const bewertungLink = /^ChIJ[\w-]{10,}$/.test(googleEingabe)
    ? `https://search.google.com/local/writereview?placeid=${googleEingabe}`
    : adresse(googleEingabe);
  if (website === undefined || bewertungLink === undefined) redirect("/app/einstellungen?fehler=adresse");
  await query(
    `UPDATE betrieb SET name = $2, telefon = $3, sms_absender = $4, karte_aktiv = $5, website = $6, bewertung_link = $7
      WHERE id = $1`,
    [
      n.betrieb_id,
      text(fd, "name") || n.betrieb_name,
      telefon,
      absenderSaeubern(text(fd, "sms_absender")) || null,
      fd.get("karte_aktiv") === "on",
      website,
      bewertungLink,
    ],
  );
  revalidatePath("/app", "layout");
  redirect("/app/einstellungen?ok=1");
}

export async function smsVorlagenSpeichern(fd: FormData) {
  const n = await nutzerOderLogin();
  if (n.rolle !== "inhaber") redirect("/app/einstellungen");
  const vorlagen: SmsVorlagen = {};
  for (const typ of SMS_TYPEN) {
    const t = text(fd, `text_${typ}`).slice(0, 480);
    vorlagen[typ] = {
      text: t, // leer = Standardtext
      aktiv: SMS_INFO[typ].abschaltbar ? fd.get(`aktiv_${typ}`) === "on" : true,
    };
  }
  await query(`UPDATE betrieb SET sms_vorlagen = $2::jsonb WHERE id = $1`, [n.betrieb_id, JSON.stringify(vorlagen)]);
  redirect("/app/einstellungen?ok=sms#sms");
}

export async function mitarbeiterAnlegen(fd: FormData) {
  const n = await nutzerOderLogin();
  if (n.rolle !== "inhaber") redirect("/app/einstellungen");
  const email = text(fd, "email").toLowerCase();
  const passwort = String(fd.get("passwort") ?? "");
  if (!text(fd, "name") || !email || passwort.length < 8) redirect("/app/einstellungen?fehler=mitarbeiter");
  if (await eins(`SELECT 1 FROM mitarbeiter WHERE lower(email) = $1`, [email])) redirect("/app/einstellungen?fehler=email");
  await query(
    `INSERT INTO mitarbeiter (betrieb_id, name, email, passwort_hash, rolle) VALUES ($1,$2,$3,$4,'monteur')`,
    [n.betrieb_id, text(fd, "name"), email, await passwortHash(passwort)],
  );
  redirect("/app/einstellungen?ok=mitarbeiter");
}

export async function abmeldenAktion() {
  await abmelden();
  redirect("/login");
}
