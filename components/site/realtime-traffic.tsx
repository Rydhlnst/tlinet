"use client";

import { ArrowDown, ArrowUp, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBitrate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Counters = { time: number; in: string; out: string };
type Point = { time: number; inBps: number; outBps: number };

/** Pilihan interval seperti di LibreNMS; 0,25 detik tidak disediakan supaya router tidak dibebani. */
const intervals = [1, 2, 5, 15, 60];
/** Banyak titik yang disimpan: cukup untuk 2 menit pada interval 1 detik. */
const maxPoints = 120;
/** Berhenti sendiri setelah 10 menit agar tab yang terlupa tidak terus membebani router. */
const autoPauseMs = 10 * 60_000;

const width = 600;
const height = 220;
const timeFormat = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Kecepatan dari dua bacaan penghitung; `null` bila penghitung mundur (router restart atau penghitung berputar). */
function rate(previous: Counters, current: Counters): Point | null {
  const seconds = current.time - previous.time;
  const inDiff = BigInt(current.in) - BigInt(previous.in);
  const outDiff = BigInt(current.out) - BigInt(previous.out);
  if (seconds <= 0 || inDiff < BigInt(0) || outDiff < BigInt(0)) return null;
  return { time: current.time, inBps: (Number(inDiff) * 8) / seconds, outBps: (Number(outDiff) * 8) / seconds };
}

/** Skala sumbu Y yang rapi: 1, 2, atau 5 × 10^n di atas nilai tertinggi. */
function niceMax(value: number) {
  if (value <= 0) return 1_000_000;
  const power = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 5, 10].find((step) => step * power >= value) ?? 10) * power;
}

/** Grafik trafik real-time port pelanggan. Download = trafik keluar port menuju pelanggan, Upload = trafik masuk. */
export function RealtimeTraffic() {
  const [seconds, setSeconds] = useState(2);
  const [running, setRunning] = useState(true);
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState("");
  const previous = useRef<Counters | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    previous.current = null;
    startedAt.current = Date.now();

    async function poll() {
      if (stopped) return;
      if (Date.now() - startedAt.current > autoPauseMs) {
        setRunning(false);
        return;
      }
      // Tab yang tidak terlihat tidak perlu membaca router.
      if (!document.hidden) {
        try {
          const response = await fetch("/subnet/realtime", { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Data real-time tidak bisa diambil.");
          const current = body as Counters;
          const point = previous.current ? rate(previous.current, current) : null;
          previous.current = current;
          if (point && !stopped) setPoints((list) => [...list, point].slice(-maxPoints));
          setError("");
        } catch (cause) {
          if (!stopped) setError(cause instanceof Error ? cause.message : "Data real-time tidak bisa diambil.");
        }
      }
      if (!stopped) timer = setTimeout(poll, seconds * 1000);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [running, seconds]);

  const latest = points.at(-1);
  const top = niceMax(Math.max(0, ...points.map((point) => Math.max(point.inBps, point.outBps))));
  const x = (index: number) => (points.length < 2 ? width : (index / (points.length - 1)) * width);
  const y = (value: number) => height - (value / top) * height;
  const line = (key: "inBps" | "outBps") => points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");
  const downloadArea = points.length > 1 ? `${line("outBps")} L${width},${height} L0,${height} Z` : "";

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowDown className="size-3.5 text-brand-ink" /> Download
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{latest ? formatBitrate(latest.outBps) : "…"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUp className="size-3.5 text-emerald-600" /> Upload
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{latest ? formatBitrate(latest.inBps) : "…"}</p>
        </div>
        <div className="flex flex-col justify-between gap-2 rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Interval pembaruan</p>
          <div className="flex flex-wrap items-center gap-1">
            {intervals.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSeconds(value);
                  setRunning(true);
                }}
                aria-pressed={value === seconds}
                className={cn("rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums", value === seconds ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {value}s
              </button>
            ))}
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setRunning(!running)} aria-label={running ? "Jeda" : "Lanjutkan"} title={running ? "Jeda" : "Lanjutkan"}>
              {running ? <Pause /> : <Play />}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative rounded-lg border bg-white p-3">
        <div className="mb-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{formatBitrate(top)}</span>
          <span>{latest ? `pukul ${timeFormat.format(latest.time * 1000)}` : ""}</span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-56 w-full" role="img" aria-label="Grafik trafik real-time">
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line key={fraction} x1={0} x2={width} y1={height * fraction} y2={height * fraction} stroke="currentColor" className="text-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {downloadArea && <path d={downloadArea} className="fill-brand/15" />}
          {points.length > 1 && <path d={line("outBps")} fill="none" className="stroke-brand" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
          {points.length > 1 && <path d={line("inBps")} fill="none" className="stroke-emerald-600" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>0</span>
          <span className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-brand" /> Download
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-600" /> Upload
            </span>
          </span>
        </div>
        {points.length < 2 && !error && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{running ? "Mengukur trafik…" : "Dijeda."}</p>
        )}
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {running ? `Dibaca langsung dari router tiap ${seconds} detik. Berhenti otomatis setelah 10 menit.` : "Real time dijeda. Tekan tombol putar untuk melanjutkan."}
        </p>
      )}
    </div>
  );
}
