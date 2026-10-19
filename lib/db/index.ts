import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
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

/** `null` bila DATABASE_URL belum diatur; situs publik lalu memakai konten bawaan. */
export const db = connectionString ? drizzle(neon(connectionString), { schema }) : null;

export function requireDb() {
  if (!db) throw new Error("DATABASE_URL belum diatur.");
  return db;
}
