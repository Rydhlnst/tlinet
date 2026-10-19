import { eq } from "drizzle-orm";
import { Gauge } from "lucide-react";
import type { Metadata } from "next";
import { MrtgGraphCard, parseRange } from "@/components/site/mrtg-graph";
import { ConnectionMonitor } from "@/components/site/subnet-connection";
import { SubnetPing } from "@/components/site/subnet-ping";
import { PageHeading, SectionCard } from "@/components/site/subnet-ui";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { parseCapacityBps } from "@/lib/format";
import { getPortTraffic, realtimeConfigured } from "@/lib/librenms";
import { requireSubnetUser } from "@/lib/subnet";

export const metadata: Metadata = { title: "Koneksi · Portal Subnet" };

export default async function SubnetConnectionPage({ searchParams }: PageProps<"/subnet/trafik">) {
  const user = await requireSubnetUser();
  const range = parseRange((await searchParams).rentang);
  const [[customer], traffic] = await Promise.all([
    requireDb().select({ capacity: customers.capacity }).from(customers).where(eq(customers.id, user.customerId)).limit(1),
    user.portId ? getPortTraffic(user.portId) : null,
  ]);

  return (
    <>
      <PageHeading title="Koneksi" description="Status dan kecepatan internet Anda saat ini." />
      {user.portId ? (
        <ConnectionMonitor
          initial={traffic ? { up: traffic.up, inBps: traffic.inBps, outBps: traffic.outBps, polledAt: traffic.polledAt?.getTime() ?? null } : null}
          realtime={realtimeConfigured()}
          capacityBps={parseCapacityBps(customer?.capacity ?? "")}
        />
      ) : user.qos ? (
        // Antrean QoS tidak punya pembacaan langsung di LibreNMS; yang tampil grafik MRTG-nya.
        <MrtgGraphCard range={range} basePath="/subnet/trafik" source="Antrean QoS" />
      ) : (
        <SectionCard>
          <p className="px-5 py-14 text-center text-sm text-muted-foreground">Monitoring koneksi belum diatur. Silakan hubungi admin TLINET.</p>
        </SectionCard>
      )}

      {user.pingTarget && (
        <SectionCard title="Cek Ping" icon={Gauge}>
          <div id="ping" className="scroll-mt-24">
            <SubnetPing target={user.pingTarget} />
          </div>
        </SectionCard>
      )}
    </>
  );
}
