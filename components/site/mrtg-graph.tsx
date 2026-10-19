import { ChartLine } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/site/subnet-ui";
import { trafficRanges, type TrafficRange } from "@/lib/librenms";
import { cn } from "@/lib/utils";

/** Rentang dari parameter `?rentang=`; tanpa parameter, 1 hari. */
export const parseRange = (value: unknown): TrafficRange => (typeof value === "string" && value in trafficRanges ? (value as TrafficRange) : "day");

/**
 * Grafik MRTG pelanggan (port VLAN atau antrean QoS di LibreNMS) dengan pilihan rentang 1 hari, 1 minggu, dan 1 bulan.
 * Gambarnya dari /subnet/traffic, yang selalu memakai sumber grafik milik akun pelanggan sendiri.
 */
export function MrtgGraphCard({ range, basePath, source }: { range: TrafficRange; basePath: string; source: string | null }) {
  return (
    <SectionCard
      title="Riwayat Trafik"
      icon={ChartLine}
      action={
        source ? (
          <nav className="flex rounded-full bg-muted p-1 text-xs" aria-label="Rentang grafik">
            {(Object.keys(trafficRanges) as TrafficRange[]).map((key) => (
              <Link
                key={key}
                href={key === "day" ? basePath : `${basePath}?rentang=${key}`}
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
      {source ? (
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {/* Di HP grafiknya kecil; ketuk untuk membukanya dalam ukuran penuh. */}
          <a href={`/subnet/traffic?range=${range}`} target="_blank" rel="noopener" title="Buka grafik ukuran penuh" className="overflow-hidden rounded-2xl border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/subnet/traffic?range=${range}`} alt={`Grafik trafik ${trafficRanges[range].label} terakhir`} width={1000} height={300} className="h-auto w-full" />
          </a>
          <p className="text-xs text-muted-foreground">Ketuk grafik untuk ukuran penuh. {source} · sumber MRTG (LibreNMS).</p>
        </div>
      ) : (
        <p className="px-5 py-14 text-center text-sm text-muted-foreground">Grafik trafik belum diatur. Silakan hubungi admin TLINET.</p>
      )}
    </SectionCard>
  );
}
