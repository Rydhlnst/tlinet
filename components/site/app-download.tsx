import { Download, Smartphone } from "lucide-react";
import { androidApk } from "@/lib/subnet";
import { cn } from "@/lib/utils";

/** Ajakan memasang aplikasi Android TLINET (APK langsung, tanpa Play Store). Tidak ditampilkan di dalam aplikasinya sendiri. */
export function AppDownloadCard({ className }: { className?: string }) {
  return (
    <section className={cn("surface-ink relative isolate overflow-hidden rounded-3xl p-5 text-white", className)}>
      <div className="absolute -top-16 -right-12 -z-10 size-44 rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <Smartphone className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Aplikasi Android TLINET</p>
          <p className="mt-1 text-sm text-white/65">Pantau koneksi, tagihan, dan lapor gangguan langsung dari HP.</p>
        </div>
      </div>
      <a
        href={androidApk.path}
        download
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-ink transition-colors hover:bg-white/90"
      >
        <Download className="size-4" />
        Unduh APK
      </a>
      <p className="mt-2.5 text-center text-[11px] text-white/50">
        Versi {androidApk.version} · {androidApk.size} · izinkan &ldquo;instal aplikasi tidak dikenal&rdquo; saat memasang
      </p>
    </section>
  );
}
