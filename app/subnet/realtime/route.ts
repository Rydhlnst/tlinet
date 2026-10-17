import { getRealtimeCounters } from "@/lib/librenms";
import { getSubnetUser } from "@/lib/subnet";

/** Penghitung trafik port milik pelanggan yang sedang masuk, untuk grafik Real time. Port-nya selalu dari akun pelanggan. */
export async function GET() {
  const user = await getSubnetUser();
  if (!user) return Response.json({ error: "Sesi berakhir." }, { status: 401 });
  if (!user.portId) return Response.json({ error: "Grafik belum diatur." }, { status: 404 });
  const counters = await getRealtimeCounters(user.portId);
  if (!counters) return Response.json({ error: "Data real-time tidak bisa diambil." }, { status: 502 });
  return Response.json(counters, { headers: { "Cache-Control": "no-store" } });
}
