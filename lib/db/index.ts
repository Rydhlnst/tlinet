import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

/** `null` bila DATABASE_URL belum diatur; situs publik lalu memakai konten bawaan. */
export const db = connectionString ? drizzle(neon(connectionString), { schema }) : null;

export function requireDb() {
  if (!db) throw new Error("DATABASE_URL belum diatur.");
  return db;
}
