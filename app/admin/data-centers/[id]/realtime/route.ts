import { eq } from "drizzle-orm";
import { getAdminWith } from "@/lib/auth";
import { parseMrtgSource } from "@/lib/data-centers";
import { db } from "@/lib/db";
import { dataCenters } from "@/lib/db/schema";
import { getRealtimeCounters } from "@/lib/librenms";

/** Penghitung trafik port Data Center saat ini, untuk grafik MRTG Real time di halaman detailnya. Hanya untuk sumber port. */
export async function GET(_request: Request, { params }: RouteContext<"/admin/data-centers/[id]/realtime">) {
  if (!(await getAdminWith("finance"))) return Response.json({ error: "Sesi berakhir." }, { status: 401 });
  if (!db) return Response.json({ error: "Database belum diatur." }, { status: 503 });
  const { id } = await params;
  const [row] = await db.select({ source: dataCenters.mrtgSource }).from(dataCenters).where(eq(dataCenters.id, id)).limit(1);
  const source = parseMrtgSource(row?.source ?? "");
  if (source?.kind !== "port") return Response.json({ error: "Real time hanya tersedia untuk sumber grafik berupa port." }, { status: 404 });
  const counters = await getRealtimeCounters(source.portId);
  if (!counters) return Response.json({ error: "Data real-time tidak bisa diambil." }, { status: 502 });
  return Response.json(counters, { headers: { "Cache-Control": "no-store" } });
}
