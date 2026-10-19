"use client";

import { Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/site/subnet-ui";

const refreshMs = 60_000;
const timeFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" });

/**
 * Trafik terkini antrean QoS: grafik 2 jam terakhir dari LibreNMS, dimuat ulang tiap menit selama halaman terbuka.
 * LibreNMS tidak punya Real time untuk antrean, jadi angka "Now" di bawah grafik adalah bacaan terakhirnya (±5 menit).
 */
export function QosLiveCard() {
  const [view, setView] = useState<{ src: string; at: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Gambar baru dimuat di belakang layar dulu supaya grafik lama tidak hilang (berkedip) saat diperbarui.
    const load = () => {
      if (document.visibilityState !== "visible") return;
      const at = Date.now();
      const src = `/subnet/traffic?range=live&t=${Math.floor(at / refreshMs)}`;
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        setView({ src, at });
        setFailed(false);
      };
      image.onerror = () => !cancelled && setFailed(true);
      image.src = src;
    };
    load();
    const timer = window.setInterval(load, refreshMs);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  return (
    <SectionCard
      title="Trafik Terkini"
      icon={Activity}
      action={
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          {view ? `Diperbarui ${timeFormat.format(view.at)} WITA` : "Memuat…"}
        </span>
      }
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {view ? (
          <a href={view.src} target="_blank" rel="noopener" title="Buka grafik ukuran penuh" className="overflow-hidden rounded-2xl border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={view.src} alt="Grafik trafik 2 jam terakhir" width={1000} height={300} className="h-auto w-full" />
          </a>
        ) : (
          <div className="flex aspect-[1081/397] items-center justify-center rounded-2xl border bg-muted/40 text-sm text-muted-foreground">
            {failed ? "Grafik belum bisa dimuat. Dicoba lagi otomatis." : "Memuat grafik…"}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          2 jam terakhir, diperbarui otomatis tiap menit. Kecepatan saat ini ada di kolom &ldquo;Now&rdquo; (In = unduh, Out = unggah); router mencatat trafik antrean tiap ±5 menit.
        </p>
      </div>
    </SectionCard>
  );
}
