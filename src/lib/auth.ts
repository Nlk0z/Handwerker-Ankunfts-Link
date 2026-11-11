import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eins } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "sitzung";

function geheimnis() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.DATABASE_URL) {
    throw new Error("AUTH_SECRET muss gesetzt sein, sobald eine echte Datenbank benutzt wird.");
  }
  return new TextEncoder().encode(s || "nur-fuer-die-demo-nicht-in-echt-benutzen");
}

export async function passwortHash(passwort: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(passwort, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function passwortPruefen(passwort: string, gespeichert: string) {
  const [saltHex, hashHex] = gespeichert.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = await scrypt(passwort, Buffer.from(saltHex, "hex"), 64);
  const soll = Buffer.from(hashHex, "hex");
  // timingSafeEqual stürzt bei unterschiedlicher Länge ab (z. B. kaputter Eintrag) – dann einfach "falsch".
  return soll.length === hash.length && timingSafeEqual(hash, soll);
}

export async function anmelden(mitarbeiterId: string) {
  const token = await new SignJWT({ sub: mitarbeiterId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(geheimnis());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function abmelden() {
  (await cookies()).delete(COOKIE);
}

export type Nutzer = {
  id: string;
  name: string;
  email: string;
  rolle: "inhaber" | "monteur";
  betrieb_id: string;
  betrieb_name: string;
};

export async function aktuellerNutzer(): Promise<Nutzer | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, geheimnis());
    const nutzer = await eins<Nutzer>(
      `SELECT m.id, m.name, m.email, m.rolle, m.betrieb_id, b.name AS betrieb_name
         FROM mitarbeiter m JOIN betrieb b ON b.id = m.betrieb_id
        WHERE m.id = $1`,
      [payload.sub],
    );
    return nutzer ?? null;
  } catch {
    return null;
  }
}

/** Für geschützte Seiten: liefert den Nutzer oder leitet zum Login um. */
export async function nutzerOderLogin() {
  const n = await aktuellerNutzer();
  if (!n) redirect("/login");
  return n;
}
