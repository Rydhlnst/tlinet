import { getPortTraffic } from "@/lib/librenms";
import { getSubnetUser } from "@/lib/subnet";

/** Status port pelanggan (naik/turun dan kecepatan terakhir yang dibaca LibreNMS) untuk kartu koneksi di portal. */
export async function GET() {
  const user = await getSubnetUser();
  if (!user) return Response.json({ error: "Sesi berakhir." }, { status: 401 });
  if (!user.portId) return Response.json({ error: "Grafik belum diatur." }, { status: 404 });
  const traffic = await getPortTraffic(user.portId);
  if (!traffic) return Response.json({ error: "Data koneksi tidak bisa diambil." }, { status: 502 });
  return Response.json({ ...traffic, polledAt: traffic.polledAt?.getTime() ?? null }, { headers: { "Cache-Control": "no-store" } });
}
