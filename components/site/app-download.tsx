import { Download, Smartphone } from "lucide-react";
import { androidApk } from "@/lib/subnet";
import { cn } from "@/lib/utils";

/** Ajakan memasang aplikasi Android TLINET (APK langsung, tanpa Play Store). Tidak ditampilkan di dalam aplikasinya sendiri. */
export function AppDownloadCard({ className }: { className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 sm:p-5", className)}>
      <div className="flex items-start gap-3.5">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Aplikasi Android TLINET</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Pantau koneksi, tagihan, dan lapor gangguan langsung dari HP.</p>
        </div>
      </div>
      <a
        href={androidApk.path}
        download
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand/90"
      >
        <Download className="size-4" />
        Unduh APK
      </a>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Versi {androidApk.version} · {androidApk.size} · izinkan &ldquo;instal aplikasi tidak dikenal&rdquo; saat memasang
      </p>
    </section>
  );
}
