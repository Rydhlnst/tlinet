import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type BinaryLike } from "node:crypto";

/** Hash kata sandi scrypt untuk akun portal Subnet dan akun staf dashboard: "scrypt$<salt>$<hash>". */

const scrypt = (password: BinaryLike, salt: BinaryLike) =>
  new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, 32, (error, key) => (error ? reject(error) : resolve(key))));

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${(await scrypt(password, salt)).toString("base64url")}`;
}

export async function passwordMatches(password: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
