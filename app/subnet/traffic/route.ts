import { getPortGraph, getQosGraph, trafficRanges, type TrafficRange } from "@/lib/librenms";
import { getSubnetUser } from "@/lib/subnet";

/**
 * Grafik trafik port (atau antrean QoS) milik pelanggan yang sedang masuk. Sumbernya selalu dari akun pelanggan, bukan
 * dari parameter, jadi pelanggan tidak bisa melihat grafik pelanggan lain.
 */
export async function GET(request: Request) {
  const user = await getSubnetUser();
  if (!user) return new Response("Sesi berakhir.", { status: 401 });
  if (!user.portId && !user.qos) return new Response("Grafik belum diatur.", { status: 404 });

  const param = new URL(request.url).searchParams.get("range") ?? "day";
  const range: TrafficRange = param in trafficRanges ? (param as TrafficRange) : "day";
  const graph = user.portId ? await getPortGraph(user.portId, range) : await getQosGraph(user.qos!.deviceId, user.qos!.qosId, range);
  if (!graph) return new Response("Grafik tidak bisa diambil.", { status: 502 });

  return new Response(graph.body, {
    headers: {
      "Content-Type": graph.type,
      "Cache-Control": "private, max-age=300",
      // SVG dari luar hanya ditampilkan sebagai gambar; skrip di dalamnya tidak boleh jalan bila dibuka langsung.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
