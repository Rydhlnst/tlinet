import { eq } from "drizzle-orm";
import { getAdminWith } from "@/lib/auth";
import { getMrtgGraph } from "@/lib/data-centers";
import { db } from "@/lib/db";
import { dataCenters } from "@/lib/db/schema";
import { trafficRanges, type TrafficRange } from "@/lib/librenms";

/** Grafik MRTG (LibreNMS) sebuah Data Center untuk halaman detailnya; sumbernya dari data Data Center itu sendiri. */
export async function GET(request: Request, { params }: RouteContext<"/admin/data-centers/[id]/traffic">) {
  if (!(await getAdminWith("finance"))) return new Response("Unauthorized", { status: 401 });
  if (!db) return new Response("Database belum diatur.", { status: 503 });
  const { id } = await params;
  const [row] = await db.select({ source: dataCenters.mrtgSource }).from(dataCenters).where(eq(dataCenters.id, id)).limit(1);
  if (!row?.source) return new Response("Grafik belum diatur.", { status: 404 });

  const param = new URL(request.url).searchParams.get("range") ?? "day";
  const range: TrafficRange = param in trafficRanges ? (param as TrafficRange) : "day";
  const graph = await getMrtgGraph(row.source, range);
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
