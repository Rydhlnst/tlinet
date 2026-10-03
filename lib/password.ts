import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}
