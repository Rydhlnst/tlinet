import type { Metadata } from "next";
import { MrtgGraphCard, parseRange } from "@/components/site/mrtg-graph";
import { PageHeading } from "@/components/site/subnet-ui";
import { getPortTraffic } from "@/lib/librenms";
import { requireSubnetUser } from "@/lib/subnet";

export const metadata: Metadata = { title: "Grafik MRTG · Portal Subnet" };

/** Riwayat trafik pelanggan dari LibreNMS (MRTG) dalam rentang 1 hari, 1 minggu, dan 1 bulan. */
export default async function SubnetGraphPage({ searchParams }: PageProps<"/subnet/trafik/grafik">) {
  const user = await requireSubnetUser();
  const range = parseRange((await searchParams).rentang);
  const traffic = user.portId ? await getPortTraffic(user.portId) : null;
  const source = user.portId ? (traffic?.name ? `Port ${traffic.name}` : "Port VLAN") : user.qos ? "Antrean QoS" : null;

  return (
    <>
      <PageHeading title="Grafik MRTG" description="Riwayat trafik internet Anda dari sistem monitoring TLINET." />
      <MrtgGraphCard range={range} basePath="/subnet/trafik/grafik" source={source} />
    </>
  );
}
