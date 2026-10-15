import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";

/** Menyajikan gambar yang disimpan di database (dipakai selama Cloudflare R2 belum diatur). */
export async function GET(_request: Request, { params }: RouteContext<"/media/[id]">) {
  // PDF disimpan dengan alamat /media/<id>.pdf agar dikenali dari alamatnya.
  const id = (await params).id.replace(/\.pdf$/i, "");
  const [asset] = db
    ? await db.select({ data: mediaAssets.data, mimeType: mediaAssets.mimeType }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1)
    : [];
  if (!asset?.data) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(asset.data, "base64"), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
