import { eq } from "drizzle-orm";
import { listCommunityMessages, markForumRead, postCustomerMessage } from "@/lib/community";
import { requireDb } from "@/lib/db";
import { subnetAccounts } from "@/lib/db/schema";
import { getSubnetUser } from "@/lib/subnet";

const noStore = { "Cache-Control": "no-store" };

/** Pesan Forum Subnet terbaru untuk pelanggan yang sedang masuk, dibaca ulang portal tiap beberapa detik. */
export async function GET() {
  const user = await getSubnetUser();
  if (!user) return Response.json({ error: "Sesi berakhir." }, { status: 401 });
  // Forum hanya dibaca ulang selama halamannya terlihat, jadi setiap pembacaan berarti pesannya sudah dilihat.
  const [messages, , [account]] = await Promise.all([
    listCommunityMessages(user.customerId),
    markForumRead(user.customerId),
    requireDb().select({ muted: subnetAccounts.chatMuted }).from(subnetAccounts).where(eq(subnetAccounts.customerId, user.customerId)).limit(1),
  ]);
  return Response.json({ messages, muted: Boolean(account?.muted) }, { headers: noStore });
}

/** Mengirim pesan ke Forum. Hanya dari halaman portal sendiri (asal permintaan harus situs ini). */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
  const user = await getSubnetUser();
  if (!user) return Response.json({ error: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
  // Teks saja dikirim sebagai JSON; pesan bergambar sebagai form (body + image).
  let body: unknown;
  let image: File | null = null;
  try {
    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await request.formData();
      body = form.get("body");
      const file = form.get("image");
      image = file instanceof File && file.size > 0 ? file : null;
    } else {
      body = ((await request.json()) as { body?: unknown }).body;
    }
  } catch {
    return Response.json({ error: "Pesan tidak terbaca." }, { status: 400 });
  }
  const result = await postCustomerMessage(user.customerId, body, image);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: noStore });
  return Response.json({ messages: await listCommunityMessages(user.customerId) }, { headers: noStore });
}
