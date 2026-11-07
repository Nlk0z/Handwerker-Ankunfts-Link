"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { abmelden, nutzerOderLogin, passwortHash } from "@/lib/auth";
import { eins, query } from "@/lib/db";
import { normalisiereTelefon } from "@/lib/format";
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
      text(fd, "von") || null,
      text(fd, "bis") || null,
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

export async function losfahrenAktion(id: string, minuten: number) {
  const n = await nutzerOderLogin();
  await losfahren(n.betrieb_id, id, Math.max(1, Math.min(240, Math.round(minuten))), await kundenLink(n.betrieb_id, id));
  revalidatePath(`/app/auftrag/${id}`);
}

export async function verspaetungAktion(id: string, minuten: number) {
  const n = await nutzerOderLogin();
  await verspaetung(n.betrieb_id, id, Math.max(1, Math.min(240, Math.round(minuten))), await kundenLink(n.betrieb_id, id));
  revalidatePath(`/app/auftrag/${id}`);
}

export async function statusAktion(id: string, status: "angekommen" | "erledigt" | "storniert") {
  const n = await nutzerOderLogin();
  await statusSetzen(n.betrieb_id, id, status);
  revalidatePath(`/app/auftrag/${id}`);
  revalidatePath("/app");
}

export async function einstellungenSpeichern(fd: FormData) {
  const n = await nutzerOderLogin();
  if (n.rolle !== "inhaber") redirect("/app/einstellungen");
  const telefon = text(fd, "telefon") ? normalisiereTelefon(text(fd, "telefon")) : null;
  await query(
    `UPDATE betrieb SET name = $2, telefon = $3, sms_absender = $4, karte_aktiv = $5 WHERE id = $1`,
    [
      n.betrieb_id,
      text(fd, "name") || n.betrieb_name,
      telefon,
      text(fd, "sms_absender").replace(/[^A-Za-z0-9]/g, "").slice(0, 11) || null,
      fd.get("karte_aktiv") === "on",
    ],
  );
  revalidatePath("/app", "layout");
  redirect("/app/einstellungen?ok=1");
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
