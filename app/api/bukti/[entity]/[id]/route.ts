import { eq } from "drizzle-orm";
import { getAdminWith } from "@/lib/auth";
import { entityPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { customerPayments, customerPurchases, customers, mediaAssets, salaryPayments } from "@/lib/db/schema";
import { slugify } from "@/lib/format";
import { isR2Url } from "@/lib/storage";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf" };

/** Berkas yang boleh disajikan: bukti transfer dan invoice pemasok di riwayat, serta AOS dan PKS pelanggan. Hasilnya tautan dan nama unduhannya. */
async function findProof(entity: string, id: string, field: string): Promise<{ proofUrl: string; name: string } | undefined> {
  if (!db) return undefined;
  if (entity === "customer-payments" && field === "proofUrl") {
    const [row] = await db.select({ url: customerPayments.proofUrl, period: customerPayments.period }).from(customerPayments).where(eq(customerPayments.id, id)).limit(1);
    return row && { proofUrl: row.url, name: `bukti-transfer-${row.period}` };
  }
  if (entity === "customer-purchases" && (field === "proofUrl" || field === "transferProofUrl")) {
    const [row] = await db
      .select({ proofUrl: customerPurchases.proofUrl, transferProofUrl: customerPurchases.transferProofUrl, period: customerPurchases.period })
      .from(customerPurchases)
      .where(eq(customerPurchases.id, id))
      .limit(1);
    if (!row) return undefined;
    return field === "proofUrl" ? { proofUrl: row.proofUrl, name: `invoice-pemasok-${row.period}` } : { proofUrl: row.transferProofUrl, name: `bukti-transfer-${row.period}` };
  }
  if (entity === "salaries" && field === "proofUrl") {
    const [row] = await db.select({ url: salaryPayments.proofUrl, period: salaryPayments.period }).from(salaryPayments).where(eq(salaryPayments.id, id)).limit(1);
    return row && { proofUrl: row.url, name: `bukti-gaji-${row.period}` };
  }
  if (entity === "customers" && (field === "aosUrl" || field === "pksUrl")) {
    const [row] = await db.select({ aosUrl: customers.aosUrl, pksUrl: customers.pksUrl, siteId: customers.siteId }).from(customers).where(eq(customers.id, id)).limit(1);
    const kind = field === "aosUrl" ? "aos" : "pks";
    return row && { proofUrl: row[field], name: `${kind}-${slugify(row.siteId) || id.slice(0, 8)}` };
  }
  return undefined;
}

/** Isi gambar atau PDF dari penyimpanan kita sendiri: database (/media/…) atau bucket R2. */
async function loadImage(url: string): Promise<{ body: BodyInit; type: string } | null> {
  if (url.startsWith("/media/")) {
    const [asset] = await db!.select({ data: mediaAssets.data, mimeType: mediaAssets.mimeType }).from(mediaAssets).where(eq(mediaAssets.id, url.slice("/media/".length).replace(/\.pdf$/i, ""))).limit(1);
    return asset?.data ? { body: Buffer.from(asset.data, "base64"), type: asset.mimeType } : null;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const type = response.headers.get("content-type") ?? "";
  return response.ok && response.body && (type.startsWith("image/") || type === "application/pdf") ? { body: response.body, type } : null;
}

/**
 * Menyajikan bukti transfer lewat alamat situs sendiri, khusus admin, agar bisa dilihat dan diunduh tanpa
 * meninggalkan dashboard. `?download=1` mengirimnya sebagai berkas unduhan.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bukti/[entity]/[id]">) {
  const { entity, id } = await params;
  if (!(await getAdminWith(entityPermission(entity)))) return new Response("Unauthorized", { status: 401 });
  const proof = await findProof(entity, id, new URL(request.url).searchParams.get("field") ?? "proofUrl");
  if (!proof?.proofUrl) return new Response("Not found", { status: 404 });

  // Tautan luar yang diketik manual tidak diambil oleh server; peramban diarahkan langsung ke sana.
  if (!proof.proofUrl.startsWith("/media/") && !isR2Url(proof.proofUrl)) return Response.redirect(new URL(proof.proofUrl, request.url), 307);

  const image = await loadImage(proof.proofUrl).catch(() => null);
  if (!image) return new Response("Not found", { status: 404 });

  const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
  return new Response(image.body, {
    headers: {
      "Content-Type": image.type,
      "Content-Disposition": `${disposition}; filename="${proof.name}.${extensions[image.type] ?? "jpg"}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
