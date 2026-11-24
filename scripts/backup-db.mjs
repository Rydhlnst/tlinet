#!/usr/bin/env node
/**
 * Backup harian database TLINET (dijalankan cron di srv1, dari folder aplikasi):
 *   node scripts/backup-db.mjs                       → pg_dump ke ~/db-backups (disimpan 14 hari) + salinan terenkripsi ke R2
 *   node scripts/backup-db.mjs decrypt <in.enc> <out> → membuka salinan R2 menjadi file .dump biasa (untuk pg_restore)
 *
 * Bucket R2 "tlinet" bersifat publik (dipakai gambar situs), jadi salinan di sana WAJIB terenkripsi: AES-256-GCM dengan
 * kunci BACKUP_ENCRYPTION_KEY (32 byte, base64) dari .env. Tanpa kunci itu salinan R2 tidak bisa dibuka — simpan kuncinya
 * juga di luar server (pengelola kata sandi).
 */
import { spawnSync } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const MAGIC = Buffer.from("TLBK1");
const KEEP_LOCAL_DAYS = 14;
const backupDir = process.env.BACKUP_DIR || path.join(homedir(), "db-backups");

/** Membaca .env sederhana (KEY=VALUE) tanpa menimpa variabel yang sudah ada. */
function loadEnv(file) {
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

function encryptionKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY harus 32 byte (base64).");
  return key;
}

function encrypt(data, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

function decrypt(data, key) {
  if (!data.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Bukan berkas backup TLINET terenkripsi.");
  const iv = data.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = data.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(MAGIC.length + 28)), decipher.final()]);
}

async function uploadToR2(key, body) {
  const endpoint = (process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/$/, "");
  const { R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET: bucket } = process.env;
  if (!accessKeyId || !secretAccessKey || !bucket) throw new Error("Variabel R2 belum lengkap.");
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  let failure = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const signed = await client.sign(`${endpoint}/${bucket}/${key}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" } });
    try {
      const response = await fetch(signed.url, { method: "PUT", headers: signed.headers, body, signal: AbortSignal.timeout(60_000) });
      if (response.ok) return;
      failure = `R2 ${response.status}`;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
  throw new Error(`Unggah ke R2 gagal: ${failure}`);
}

function pruneLocal() {
  const cutoff = Date.now() - KEEP_LOCAL_DAYS * 86_400_000;
  for (const name of readdirSync(backupDir)) {
    if (!name.endsWith(".dump")) continue;
    const file = path.join(backupDir, name);
    if (statSync(file).mtimeMs < cutoff) unlinkSync(file);
  }
}

async function backup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur.");
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const file = path.join(backupDir, `tlinet-${stamp}.dump`);

  const dump = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", file, "--dbname", url], { encoding: "utf8" });
  if (dump.status !== 0) throw new Error(`pg_dump gagal: ${(dump.stderr || "").replace(/postgres(ql)?:\/\/\S+/g, "[url]").trim()}`);
  chmodSync(file, 0o600);
  const data = readFileSync(file);
  console.log(`${new Date().toISOString()} lokal OK ${file} (${Math.round(data.length / 1024)} KB)`);

  pruneLocal();

  const key = encryptionKey();
  if (!key) {
    console.log("BACKUP_ENCRYPTION_KEY kosong: salinan R2 dilewati (tidak diunggah tanpa enkripsi).");
    return;
  }
  // Nama acak supaya tidak bisa ditebak dari URL publik bucket; isinya tetap terenkripsi.
  const remote = `backups/db/tlinet-${stamp}-${randomBytes(8).toString("hex")}.dump.enc`;
  await uploadToR2(remote, encrypt(data, key));
  console.log(`${new Date().toISOString()} R2 OK ${remote}`);
}

loadEnv(path.join(process.cwd(), ".env"));
loadEnv(path.join(process.cwd(), ".env.local"));

const [command, input, output] = process.argv.slice(2);
try {
  if (command === "decrypt") {
    const key = encryptionKey();
    if (!key || !input || !output) throw new Error("Pakai: BACKUP_ENCRYPTION_KEY=... node scripts/backup-db.mjs decrypt <in.enc> <out.dump>");
    writeFileSync(output, decrypt(readFileSync(input), key), { mode: 0o600 });
    console.log(`Terbuka: ${output}`);
  } else {
    await backup();
  }
} catch (error) {
  console.error(`${new Date().toISOString()} GAGAL: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
