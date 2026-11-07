import "server-only";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Datenbank-Zugang.
 * - Mit DATABASE_URL (z. B. Supabase): echte Postgres-Datenbank.
 * - Ohne: eingebaute Demo-Datenbank (PGlite) mit Beispieldaten.
 * Beide verstehen dasselbe SQL, der Rest der App merkt keinen Unterschied.
 */
type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

type DbState = { query: Query; demo: boolean };

const g = globalThis as unknown as { __db?: Promise<DbState> };

export const istDemo = () => !process.env.DATABASE_URL;

async function verbinden(): Promise<DbState> {
  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");

  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    // prepare: false ist nötig für den Supabase "Transaction pooler"
    const sql = postgres(process.env.DATABASE_URL, { prepare: false });
    const query: Query = async (text, params = []) =>
      (await sql.unsafe(text, params as never[])) as never;
    await sql.unsafe(schema);
    return { query, demo: false };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  // Auf Vercel ist nur /tmp beschreibbar (Daten gehen bei Neustart verloren - reicht für die Demo).
  const verzeichnis = process.env.VERCEL ? "/tmp/pglite" : path.join(process.cwd(), ".data", "pglite");
  mkdirSync(verzeichnis, { recursive: true });
  const pg = new PGlite(verzeichnis);
  await pg.exec(schema);
  const query: Query = async (text, params = []) => (await pg.query(text, params)).rows as never;

  const { seedDemo } = await import("./seed");
  await seedDemo(query);
  return { query, demo: true };
}

function db() {
  if (!g.__db) {
    g.__db = verbinden().catch((e) => {
      g.__db = undefined;
      throw e;
    });
  }
  return g.__db;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  return (await db()).query<T>(text, params);
}

export async function eins<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] as T | undefined;
}
