import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataCenterDetail } from "@/components/admin/data-center-detail";
import { requireAdmin } from "@/lib/auth";
import { mrtgFallbackLabel, parseMrtgSource } from "@/lib/data-centers";
import { requireDb } from "@/lib/db";
import { dataCenterPayments, dataCenters } from "@/lib/db/schema";
import { parseCapacityBps } from "@/lib/format";
import { realtimeConfigured, trafficRanges, type TrafficRange } from "@/lib/librenms";

export const metadata: Metadata = { title: "Detail Data Center" };

export default async function DataCenterPage({ params, searchParams }: PageProps<"/admin/data/data-centers/[id]">) {
  await requireAdmin("finance");
  const { id } = await params;
  const rangeParam = (await searchParams).rentang;
  const range: TrafficRange = typeof rangeParam === "string" && rangeParam in trafficRanges ? (rangeParam as TrafficRange) : "day";
  const db = requireDb();
  const [[dataCenter], payments] = await Promise.all([
    db.select().from(dataCenters).where(eq(dataCenters.id, id)).limit(1),
    db.select().from(dataCenterPayments).where(eq(dataCenterPayments.dataCenterId, id)).orderBy(desc(dataCenterPayments.period), desc(dataCenterPayments.createdAt)),
  ]);
  if (!dataCenter) notFound();

  // Real time membaca penghitung port langsung dari router; antrean QoS tidak punya data real time di LibreNMS.
  const source = parseMrtgSource(dataCenter.mrtgSource);
  const live = {
    available: source?.kind === "port" && realtimeConfigured(),
    capacityBps: parseCapacityBps(dataCenter.capacity),
    note: !source
      ? "Pilih port di Grafik MRTG (Edit Data) untuk melihat trafik real time."
      : source.kind === "qos"
        ? "Real time hanya tersedia untuk port. Antrean QoS tidak punya data real time di LibreNMS; lihat grafik MRTG di bawah."
        : "Real time belum diatur di server (LIBRENMS_USERNAME dan LIBRENMS_PASSWORD).",
  };

  return <DataCenterDetail dataCenter={dataCenter} payments={payments} range={range} ranges={Object.entries(trafficRanges).map(([key, value]) => ({ key, label: value.label }))} sourceLabel={mrtgFallbackLabel(dataCenter.mrtgSource)} live={live} />;
}
