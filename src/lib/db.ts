import "server-only";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Datenbank-Zugang.
 * - Mit DATABASE_URL (z. B. Supabase): echte Postgres-Datenbank.
 * - Ohne: eingebaute Demo-Datenbank (PGlite) mit Beispieldaten.
 * Beide verstehen dasselbe SQL, der Rest der App merkt keinen Unterschied.
 */
type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

type DbState = { query: Query; demo: boolean; schemaNeu: (sql: string) => Promise<void>; schemaStand: number };

const schemaPfad = () => path.join(process.cwd(), "db", "schema.sql");

const g = globalThis as unknown as { __db?: Promise<DbState> };

export const istDemo = () => !process.env.DATABASE_URL;

async function verbinden(): Promise<DbState> {
  const schema = readFileSync(schemaPfad(), "utf8");
  const schemaStand = statSync(schemaPfad()).mtimeMs;

  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    // prepare: false ist nötig für den Supabase "Transaction pooler"
    const sql = postgres(process.env.DATABASE_URL, { prepare: false });
    const query: Query = async (text, params = []) =>
      (await sql.unsafe(text, params as never[])) as never;
    await sql.unsafe(schema);
    return { query, demo: false, schemaNeu: async (t) => void (await sql.unsafe(t)), schemaStand };
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
  return { query, demo: true, schemaNeu: async (t) => void (await pg.exec(t)), schemaStand };
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

/**
 * Nur beim Entwickeln: Wurde db/schema.sql geändert, wird es auf der offenen Verbindung nochmal
 * ausgeführt (alle Befehle sind wiederholbar). So braucht es nach einer Schema-Änderung keinen Neustart.
 */
async function schemaAktuell(state: DbState) {
  if (process.env.NODE_ENV === "production") return;
  const stand = statSync(schemaPfad()).mtimeMs;
  if (stand === state.schemaStand) return;
  state.schemaStand = stand;
  await state.schemaNeu(readFileSync(schemaPfad(), "utf8"));
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const state = await db();
  await schemaAktuell(state);
  return state.query<T>(text, params);
}

export async function eins<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] as T | undefined;
}
