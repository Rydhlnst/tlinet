import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeading, SectionCard } from "@/components/site/subnet-ui";
import { TowerMap } from "@/components/site/tower-map";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getPortTraffic } from "@/lib/librenms";
import { requireSubnetUser } from "@/lib/subnet";

export const metadata: Metadata = { title: "Lokasi Tower · Portal Subnet" };

/** Titik tower yang melayani pelanggan, berkedip hijau saat trafik jalan dan merah saat down. */
export default async function SubnetTowerPage() {
  const user = await requireSubnetUser();
  const [[tower], traffic] = await Promise.all([
    requireDb().select({ name: customers.towerName, lat: customers.towerLat, lng: customers.towerLng }).from(customers).where(eq(customers.id, user.customerId)).limit(1),
    user.portId ? getPortTraffic(user.portId) : null,
  ]);

  return (
    <>
      <PageHeading title="Lokasi Tower" description="Titik tower yang melayani koneksi internet Anda." />
      {tower && (tower.lat || tower.lng) ? (
        <TowerMap
          lat={tower.lat}
          lng={tower.lng}
          name={tower.name}
          // Antrean QoS tidak punya status yang bisa dibaca, jadi titiknya tidak diberi warna status.
          monitored={Boolean(user.portId)}
          initial={traffic ? { up: traffic.up, inBps: traffic.inBps, outBps: traffic.outBps, polledAt: traffic.polledAt?.getTime() ?? null } : null}
        />
      ) : (
        <SectionCard>
          <p className="px-5 py-14 text-center text-sm text-muted-foreground">Lokasi tower belum diatur. Silakan hubungi admin TLINET.</p>
        </SectionCard>
      )}
    </>
  );
}
