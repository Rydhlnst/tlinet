import { AwsClient } from "aws4fetch";

const r2 = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/$/, ""),
  endpoint: process.env.R2_ENDPOINT?.replace(/\/$/, ""),
};

const endpoint = r2.endpoint || (r2.accountId ? `https://${r2.accountId}.r2.cloudflarestorage.com` : "");
const required = [endpoint, r2.accessKeyId, r2.secretAccessKey, r2.bucket, r2.publicUrl];

/** "r2" bila semua variabel R2 terisi, "incomplete" bila hanya sebagian, "database" bila kosong. */
export const storageMode: "r2" | "incomplete" | "database" = required.every(Boolean)
  ? "r2"
  : required.some(Boolean)
    ? "incomplete"
    : "database";

const client =
  storageMode === "r2"
    ? new AwsClient({ accessKeyId: r2.accessKeyId!, secretAccessKey: r2.secretAccessKey!, service: "s3", region: "auto" })
    : null;

const objectUrl = (key: string) => `${endpoint}/${r2.bucket}/${key}`;

const putAttempts = 3;

/**
 * Mengunggah satu objek ke R2. Permintaannya ditandatangani dulu lalu dikirim dengan body berupa buffer:
 * bila `Request` bertanda tangan diserahkan langsung ke fetch milik Next, body-nya berubah jadi stream
 * dan terkirim tanpa Content-Length (chunked), yang membuat unggahan di atas puluhan KB gagal di R2.
 */
export async function putR2Object(key: string, body: ArrayBuffer, contentType: string) {
  if (!client) throw new Error("R2 belum diatur.");
  let failure = "";
  for (let attempt = 1; attempt <= putAttempts; attempt++) {
    // Ditandatangani ulang tiap percobaan karena tanda tangannya memuat waktu.
    const signed = await client.sign(objectUrl(key), {
      method: "PUT",
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    try {
      const response = await fetch(signed.url, { method: "PUT", headers: signed.headers, body: Buffer.from(body), cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (response.ok) return `${r2.publicUrl}/${key}`;
      failure = `R2 menolak unggahan (${response.status}).`;
      // Penolakan selain gangguan sementara tidak akan berubah bila diulang.
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      failure = `R2 tidak dapat dijangkau (${error instanceof Error ? error.message : "galat jaringan"}).`;
    }
  }
  throw new Error(failure);
}

/** Apakah URL ini menunjuk ke berkas unggahan di bucket R2 kita. */
export function isR2Url(url: string) {
  return Boolean(r2.publicUrl) && url.startsWith(`${r2.publicUrl}/uploads/`);
}

/** Menghapus objek R2 dari URL publiknya. URL di luar bucket ini diabaikan. */
export async function deleteR2Object(url: string) {
  if (!client || !r2.publicUrl || !url.startsWith(`${r2.publicUrl}/uploads/`)) return;
  const key = url.slice(r2.publicUrl.length + 1);
  if (key.includes("..")) return;
  const response = await client.fetch(objectUrl(key), { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error(`R2 menolak penghapusan (${response.status}).`);
}

/** Uji nyata ke bucket, dipakai kartu status di dashboard. */
export async function pingR2() {
  if (!client) return false;
  try {
    const response = await client.fetch(`${endpoint}/${r2.bucket}?list-type=2&max-keys=1`, { signal: AbortSignal.timeout(4000) });
    return response.ok;
  } catch {
    return false;
  }
}
