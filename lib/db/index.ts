import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

/** Kode galat jaringan saat koneksi belum terbentuk: permintaannya belum sampai ke database, jadi aman diulang. */
const connectErrors = new Set(["UND_ERR_CONNECT_TIMEOUT", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ENETUNREACH", "EHOSTUNREACH"]);

function isConnectError(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; errors?: { code?: string }[] } })?.cause;
  return Boolean(cause && (connectErrors.has(cause.code ?? "") || cause.errors?.some((item) => connectErrors.has(item.code ?? ""))));
}

/**
 * Koneksi ke Neon kadang gagal sesaat (terutama dari jaringan lokal yang tidak stabil). Gagal saat menyambung diulang
 * hingga dua kali; galat setelah permintaan terkirim tidak diulang supaya penyimpanan tidak terjadi dua kali.
 */
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt >= 2 || !isConnectError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
};

/** Alamat Neon (cloud) memakai driver HTTP Neon; PostgreSQL biasa — mis. di server sendiri — memakai node-postgres. */
function isNeonUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

function createDb(): Database | null {
  if (!connectionString) return null;
  if (isNeonUrl(connectionString)) return drizzleNeon(neon(connectionString), { schema });
  // Satu pool per proses. Di dev (HMR) disimpan di globalThis supaya tidak membuka pool baru tiap kali modul dimuat ulang.
  const cache = globalThis as unknown as { __tlinetPgPool?: Pool };
  cache.__tlinetPgPool ??= new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
  return drizzlePg(cache.__tlinetPgPool, { schema });
}

/** `null` bila DATABASE_URL belum diatur; situs publik lalu memakai konten bawaan. */
export const db = createDb();

export function requireDb() {
  if (!db) throw new Error("DATABASE_URL belum diatur.");
  return db;
}
