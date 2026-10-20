import { forumUnread } from "@/lib/community";
import { getSubnetUser } from "@/lib/subnet";

/** Jumlah pesan Forum yang belum dibaca dan pesan terbarunya: titik merah di ikon Forum dan notifikasi di HP. */
export async function GET() {
  const user = await getSubnetUser();
  if (!user) return Response.json({ error: "Sesi berakhir." }, { status: 401 });
  return Response.json(await forumUnread(user.customerId), { headers: { "Cache-Control": "no-store" } });
}
