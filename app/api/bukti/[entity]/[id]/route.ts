import { eq } from "drizzle-orm";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { customerPayments, customerPurchases, mediaAssets } from "@/lib/db/schema";
import { isR2Url } from "@/lib/storage";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Bukti transfer sebuah baris pembayaran atau pembelian: tautan gambarnya dan bulan tagihannya. */
async function findProof(entity: string, id: string) {
  if (!db) return undefined;
  if (entity === "customer-payments") {
    return (await db.select({ proofUrl: customerPayments.proofUrl, period: customerPayments.period }).from(customerPayments).where(eq(customerPayments.id, id)).limit(1))[0];
  }
  if (entity === "customer-purchases") {
    return (await db.select({ proofUrl: customerPurchases.proofUrl, period: customerPurchases.period }).from(customerPurchases).where(eq(customerPurchases.id, id)).limit(1))[0];
  }
  return undefined;
}

/** Isi gambar dari penyimpanan kita sendiri: database (/media/…) atau bucket R2. */
async function loadImage(url: string): Promise<{ body: BodyInit; type: string } | null> {
  if (url.startsWith("/media/")) {
    const [asset] = await db!.select({ data: mediaAssets.data, mimeType: mediaAssets.mimeType }).from(mediaAssets).where(eq(mediaAssets.id, url.slice("/media/".length))).limit(1);
    return asset?.data ? { body: Buffer.from(asset.data, "base64"), type: asset.mimeType } : null;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const type = response.headers.get("content-type") ?? "";
  return response.ok && response.body && type.startsWith("image/") ? { body: response.body, type } : null;
}

/**
 * Menyajikan bukti transfer lewat alamat situs sendiri, khusus admin, agar bisa dilihat dan diunduh tanpa
 * meninggalkan dashboard. `?download=1` mengirimnya sebagai berkas unduhan.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bukti/[entity]/[id]">) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const { entity, id } = await params;
  const proof = await findProof(entity, id);
  if (!proof?.proofUrl) return new Response("Not found", { status: 404 });

  // Tautan luar yang diketik manual tidak diambil oleh server; peramban diarahkan langsung ke sana.
  if (!proof.proofUrl.startsWith("/media/") && !isR2Url(proof.proofUrl)) return Response.redirect(new URL(proof.proofUrl, request.url), 307);

  const image = await loadImage(proof.proofUrl).catch(() => null);
  if (!image) return new Response("Not found", { status: 404 });

  const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
  return new Response(image.body, {
    headers: {
      "Content-Type": image.type,
      "Content-Disposition": `${disposition}; filename="bukti-transfer-${proof.period}.${extensions[image.type] ?? "jpg"}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
