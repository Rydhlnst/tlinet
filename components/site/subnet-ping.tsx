import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tombol ke ping.pe untuk IP pelanggan: ping real-time dari puluhan lokasi. Dibuka di tab baru karena ping.pe menolak
 * tampil di dalam iframe situs lain (pemeriksaan cookie-nya gagal sebagai cookie pihak ketiga).
 */
export function SubnetPing({ target }: { target: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
      <p className="max-w-lg text-sm text-muted-foreground">
        Cek latensi dan packet loss ke <span className="font-semibold text-foreground">{target}</span> dari berbagai lokasi di dunia secara real-time. Hasilnya terbuka di tab baru dan
        terus diperbarui selama tab itu terbuka.
      </p>
      <Button asChild size="lg">
        <a href={`https://ping.pe/${encodeURIComponent(target)}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink />
          Cek Ping Real-time
        </a>
      </Button>
      <p className="text-xs text-muted-foreground">Sumber: ping.pe</p>
    </div>
  );
}
