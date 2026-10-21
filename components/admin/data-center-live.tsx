"use client";

import { ArrowDownLeft, ArrowUpRight, Pause, Play, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { rate, TrafficChart, type Counters, type Point } from "@/components/site/subnet-connection";
import { formatBitrate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel } from "./detail-panels";

const maxPoints = 60;
const intervals = [2, 5, 10];
/** Berhenti sendiri supaya halaman yang lama terbuka tidak terus membebani router. */
const autoPauseMs = 10 * 60_000;

/**
 * MRTG Real time Data Center: penghitung port dibaca langsung dari router (lewat LibreNMS) tiap beberapa detik, seperti
 * tab "Real time" di LibreNMS. Warnanya mengikuti grafik MRTG: In (masuk ke port) hijau, Out (keluar dari port) biru.
 */
export function DataCenterLive({ id, available, capacityBps, note }: { id: string; available: boolean; capacityBps: number; note: string }) {
  const [seconds, setSeconds] = useState(2);
  const [running, setRunning] = useState(available);
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState("");
  const previous = useRef<Counters | null>(null);

  useEffect(() => {
    if (!available || !running) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    previous.current = null;

    async function poll() {
      if (stopped) return;
      if (Date.now() - startedAt > autoPauseMs) {
        setRunning(false);
        return;
      }
      const begun = Date.now();
      if (!document.hidden) {
        try {
          const response = await fetch(`/admin/data-centers/${id}/realtime`, { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Data real-time tidak bisa diambil.");
          const point = previous.current ? rate(previous.current, body as Counters) : null;
          previous.current = body as Counters;
          if (point && !stopped) setPoints((list) => [...list, point].slice(-maxPoints));
          if (!stopped) setError("");
        } catch (cause) {
          if (!stopped) setError(cause instanceof Error ? cause.message : "Data real-time tidak bisa diambil.");
        }
      }
      // Jeda dihitung dari awal permintaan, karena membaca router lewat LibreNMS sendiri butuh ±2 detik.
      if (!stopped) timer = setTimeout(poll, Math.max(500, seconds * 1000 - (Date.now() - begun)));
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, available, running, seconds]);

  const latest = points.at(-1) ?? null;
  const peak = (key: "inBps" | "outBps") => Math.max(0, ...points.map((point) => point[key]));
  const usage = (bps: number) => (capacityBps > 0 ? ` · ${((bps / capacityBps) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% kapasitas` : "");

  return (
    <Panel
      icon={Radio}
      title="MRTG Real time"
      action={
        available ? (
          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            {intervals.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSeconds(value);
                  setRunning(true);
                }}
                aria-pressed={running && value === seconds}
                className={cn("rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors", running && value === seconds ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              >
                {value}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRunning(!running)}
              aria-label={running ? "Jeda" : "Lanjutkan"}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
          </div>
        ) : undefined
      }
    >
      {available ? (
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:items-center">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            {(
              [
                ["In", "inBps", ArrowDownLeft, "text-emerald-600 dark:text-emerald-400"],
                ["Out", "outBps", ArrowUpRight, "text-brand-ink"],
              ] as const
            ).map(([label, key, Icon, tone]) => (
              <div key={key} className="flex flex-col gap-1">
                <span className={cn("flex items-center gap-1.5 text-xs font-semibold", tone)}>
                  <Icon className="size-3.5" />
                  {label}
                </span>
                <span className="text-2xl font-bold tracking-tight tabular-nums">{latest ? formatBitrate(latest[key]) : "—"}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {points.length ? `Puncak ${formatBitrate(peak(key))}${usage(latest?.[key] ?? 0)}` : "Menunggu bacaan kedua…"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-end gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> In
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand" /> Out
              </span>
            </div>
            <div className="relative rounded-xl border p-3">
              <TrafficChart points={points} height={190} detailed />
              {points.length < 2 && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{running ? "Mengukur trafik…" : "Dijeda"}</p>}
            </div>
            <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
              {error ||
                (running
                  ? `Dibaca langsung dari router tiap ${seconds} detik (${maxPoints} bacaan terakhir), berhenti otomatis setelah 10 menit.`
                  : "Dijeda. Tekan tombol putar untuk melanjutkan.")}
            </p>
          </div>
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">{note}</p>
      )}
    </Panel>
  );
}
