import { ChartLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading, SectionCard } from "@/components/site/subnet-ui";
import { getPortTraffic, trafficRanges, type TrafficRange } from "@/lib/librenms";
import { requireSubnetUser } from "@/lib/subnet";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Grafik MRTG · Portal Subnet" };

/** Riwayat trafik port pelanggan dari LibreNMS (MRTG) dalam rentang 1 hari, 1 minggu, dan 1 bulan. */
export default async function SubnetGraphPage({ searchParams }: PageProps<"/subnet/trafik/grafik">) {
  const user = await requireSubnetUser();
  const requested = (await searchParams).rentang;
  const range: TrafficRange = typeof requested === "string" && requested in trafficRanges ? (requested as TrafficRange) : "day";
  const traffic = user.portId ? await getPortTraffic(user.portId) : null;

  return (
    <>
      <PageHeading title="Grafik MRTG" description="Riwayat trafik internet Anda dari sistem monitoring TLINET." />
      <SectionCard
        title="Riwayat Trafik"
        icon={ChartLine}
        action={
          user.portId ? (
            <nav className="flex rounded-full bg-muted p-1 text-xs" aria-label="Rentang grafik">
              {(Object.keys(trafficRanges) as TrafficRange[]).map((key) => (
                <Link
                  key={key}
                  href={key === "day" ? "/subnet/trafik/grafik" : `/subnet/trafik/grafik?rentang=${key}`}
                  scroll={false}
                  replace
                  aria-current={key === range ? "page" : undefined}
                  className={cn("rounded-full px-3 py-1 font-semibold whitespace-nowrap", key === range ? "bg-background text-brand-ink shadow-sm" : "text-muted-foreground")}
                >
                  {trafficRanges[key].label}
                </Link>
              ))}
            </nav>
          ) : undefined
        }
      >
        {user.portId ? (
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            {/* Di HP grafiknya kecil; ketuk untuk membukanya dalam ukuran penuh. */}
            <a href={`/subnet/traffic?range=${range}`} target="_blank" rel="noopener" title="Buka grafik ukuran penuh" className="overflow-hidden rounded-2xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/subnet/traffic?range=${range}`} alt={`Grafik trafik ${trafficRanges[range].label} terakhir`} width={1000} height={300} className="h-auto w-full" />
            </a>
            <p className="text-xs text-muted-foreground">
              Ketuk grafik untuk ukuran penuh.{traffic?.name && ` Port ${traffic.name} · sumber MRTG (LibreNMS).`}
            </p>
          </div>
        ) : (
          <p className="px-5 py-14 text-center text-sm text-muted-foreground">Grafik trafik belum diatur. Silakan hubungi admin TLINET.</p>
        )}
      </SectionCard>
    </>
  );
}
