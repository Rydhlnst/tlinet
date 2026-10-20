"use client";

import { ArrowDown, ArrowUp, Bell, ChartLine, ChevronRight, Pause, Play, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { formatBitrate, trafficStopped } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Status port dari LibreNMS (lihat /subnet/status). Download = trafik keluar port menuju pelanggan. */
export type ConnectionStatus = { up: boolean; inBps: number; outBps: number; polledAt: number | null };

type Counters = { time: number; in: string; out: string };
type Point = { time: number; inBps: number; outBps: number };

const maxPoints = 60;
/** Status dari LibreNMS (diperbarui router tiap ±5 menit): tiap 2 menit saat terlihat, 5 menit saat di latar (untuk notifikasi down). */
const statusVisibleMs = 2 * 60_000;
const statusHiddenMs = 5 * 60_000;
const timeFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" });

/** Kecepatan dari dua bacaan penghitung; `null` bila penghitung mundur (router restart atau penghitung berputar). */
function rate(previous: Counters, current: Counters): Point | null {
  const seconds = current.time - previous.time;
  const inDiff = BigInt(current.in) - BigInt(previous.in);
  const outDiff = BigInt(current.out) - BigInt(previous.out);
  if (seconds <= 0 || inDiff < BigInt(0) || outDiff < BigInt(0)) return null;
  return { time: current.time * 1000, inBps: (Number(inDiff) * 8) / seconds, outBps: (Number(outDiff) * 8) / seconds };
}

/** Bacaan langsung harus sepi selama ini sebelum koneksi dinyatakan down, supaya jeda sesaat tidak memicu alarm. */
const quietForMs = 30_000;

/** up: trafik jalan. noTraffic: port menyala tapi trafik tidak jalan. portDown: port mati. `null`: belum terbaca. */
type Health = { state: "up" | "noTraffic" | "portDown"; since: number | null } | null;

function connectionHealth(status: ConnectionStatus | null, points: Point[], live: boolean): Health {
  if (!status) return null;
  if (!status.up) return { state: "portDown", since: status.polledAt };
  if (live && points.length >= 2) {
    const latest = points[points.length - 1];
    if (!trafficStopped(latest)) return { state: "up", since: null };
    let since = latest.time;
    for (let index = points.length - 1; index >= 0 && trafficStopped(points[index]); index--) since = points[index].time;
    return latest.time - since >= quietForMs ? { state: "noTraffic", since } : { state: "up", since: null };
  }
  // Bacaan LibreNMS sudah rata-rata ±5 menit, jadi satu bacaan sepi sudah cukup.
  return trafficStopped(status) ? { state: "noTraffic", since: status.polledAt } : { state: "up", since: null };
}

const alertKey = "tlinet:connection-alert";

/** Notifikasi sistem: lewat aplikasi Android TLINET (1.0.2 ke atas), atau Notification API peramban bila diizinkan. */
function showNotification(title: string, body: string) {
  if (typeof window.TLINETAndroid?.notify === "function") return window.TLINETAndroid.notify(title, body);
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "tlinet-connection" });
  } catch {
    // Chrome di Android hanya mengizinkan notifikasi lewat service worker.
  }
}

/** Satu notifikasi saat koneksi menjadi down dan satu saat pulih; tidak diulang bila halaman dimuat ulang. */
function useDownAlert(health: Health) {
  const state = health?.state;
  useEffect(() => {
    if (!state) return;
    const current = state === "up" ? "up" : "down";
    let previous: string | null = null;
    try {
      previous = localStorage.getItem(alertKey);
      localStorage.setItem(alertKey, current);
    } catch {
      // Tanpa penyimpanan, notifikasi tetap muncul sekali per perubahan selama halaman terbuka.
    }
    if (previous === current) return;
    if (current === "down") {
      showNotification(
        "Koneksi internet down",
        `${state === "portDown" ? "Port koneksi Anda terputus" : "Trafik internet Anda tidak jalan"}. Hubungi IT Support TLINET bila belum pulih.`,
      );
    } else if (previous === "down") {
      showNotification("Koneksi kembali normal", "Trafik internet Anda sudah jalan lagi.");
    }
  }, [state]);
}

const noopSubscribe = () => () => {};

/** Tombol izin notifikasi untuk portal di peramban; aplikasi Android meminta izinnya sendiri saat dibuka. */
function NotificationButton() {
  const [, refresh] = useState(0);
  const permission = useSyncExternalStore(
    noopSubscribe,
    () => ("Notification" in window && !window.TLINETAndroid ? Notification.permission : "unsupported"),
    () => "unsupported",
  );
  if (permission !== "default") return null;
  return (
    <button
      type="button"
      onClick={() => void Notification.requestPermission().then(() => refresh((value) => value + 1))}
      className="flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-muted"
    >
      <Bell className="size-3.5" />
      Aktifkan notifikasi down
    </button>
  );
}

function DownBanner({ health, reportHref }: { health: Health; reportHref?: string }) {
  if (!health || health.state === "up") return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:px-5">
      <TriangleAlert className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Koneksi down.</span> {health.state === "portDown" ? "Port koneksi Anda terputus" : "Trafik internet tidak jalan"}
        {health.since ? ` sejak ${timeFormat.format(health.since)} WITA` : ""}.
      </p>
      {reportHref && (
        <a href={reportHref} target="_blank" rel="noopener" className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white">
          Lapor gangguan
        </a>
      )}
    </div>
  );
}

/** "87,9 Mbps" → ["87,9", "Mbps"], untuk angka besar dengan satuan kecil. */
const splitBitrate = (bps: number) => {
  const text = formatBitrate(bps);
  const cut = text.lastIndexOf(" ");
  return cut > 0 ? [text.slice(0, cut), text.slice(cut + 1)] : [text, ""];
};

/**
 * Kecepatan langsung port pelanggan. Bila Real time tersedia, penghitung router dibaca tiap beberapa detik; jika tidak,
 * kecepatan terakhir dari LibreNMS (diperbarui tiap ±5 menit). Port mati dibaca dari LibreNMS; trafik yang berhenti
 * (lihat `trafficStopped`) juga dihitung down, karena port VLAN bisa tetap menyala walau koneksi pelanggan mati.
 */
function useLiveTraffic(initial: ConnectionStatus | null, realtime: boolean, seconds: number, autoPauseMs: number) {
  const [status, setStatus] = useState(initial);
  const [points, setPoints] = useState<Point[]>(() => (initial ? [{ time: initial.polledAt ?? 0, inBps: initial.inBps, outBps: initial.outBps }] : []));
  const [running, setRunning] = useState(realtime);
  const [error, setError] = useState("");
  const previous = useRef<Counters | null>(null);

  useEffect(() => {
    let stopped = false;
    // Tetap diperiksa saat aplikasi di latar supaya notifikasi down tetap muncul.
    const refresh = async () => {
      try {
        const response = await fetch("/subnet/status", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as ConnectionStatus;
        if (stopped) return;
        setStatus(next);
        // Tanpa Real time, grafik diisi dari pembacaan LibreNMS.
        if (!realtime) setPoints((list) => (list.at(-1)?.time === next.polledAt ? list : [...list, { time: next.polledAt ?? Date.now(), inBps: next.inBps, outBps: next.outBps }].slice(-maxPoints)));
      } catch {
        // Status lama tetap ditampilkan.
      }
    };
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(loop, document.hidden ? statusHiddenMs : statusVisibleMs);
    };
    timer = setTimeout(loop, statusVisibleMs);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [realtime]);

  useEffect(() => {
    if (!realtime || !running) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    previous.current = null;

    async function poll() {
      if (stopped) return;
      // Berhenti sendiri supaya aplikasi yang terbuka lama tidak terus membebani router.
      if (Date.now() - startedAt > autoPauseMs) {
        setRunning(false);
        return;
      }
      if (!document.hidden) {
        try {
          const response = await fetch("/subnet/realtime", { cache: "no-store" });
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
      if (!stopped) timer = setTimeout(poll, seconds * 1000);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [realtime, running, seconds, autoPauseMs]);

  const latest = points.at(-1) ?? null;
  const health = connectionHealth(status, points, realtime && running);
  useDownAlert(health);
  return { status, health, points, latest, running, setRunning, error };
}

/** Garis halus melewati titik-titik (kurva kuadrat di antara titik tengah). */
function smoothPath(coords: [number, number][]) {
  if (coords.length < 2) return "";
  let path = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
  for (let index = 1; index < coords.length - 1; index++) {
    const [x, y] = coords[index];
    const [nx, ny] = coords[index + 1];
    path += ` Q${x.toFixed(1)},${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)},${((y + ny) / 2).toFixed(1)}`;
  }
  const [lx, ly] = coords[coords.length - 1];
  return `${path} L${lx.toFixed(1)},${ly.toFixed(1)}`;
}

/** Skala sumbu Y yang rapi: 1, 2, atau 5 × 10^n di atas nilai tertinggi. */
function niceMax(value: number) {
  if (value <= 0) return 1_000_000;
  const power = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 5, 10].find((step) => step * power >= value) ?? 10) * power;
}

function TrafficChart({ points, height, detailed }: { points: Point[]; height: number; detailed?: boolean }) {
  const id = useId();
  const width = 600;
  const top = niceMax(Math.max(0, ...points.map((point) => Math.max(point.inBps, point.outBps))) * 1.1);
  const coords = (key: "inBps" | "outBps") =>
    points.map((point, index): [number, number] => [points.length < 2 ? width : (index / (points.length - 1)) * width, height - (point[key] / top) * (height - 6)]);
  const download = smoothPath(coords("outBps"));
  const upload = smoothPath(coords("inBps"));

  return (
    <div className="relative">
      {detailed && <span className="absolute top-0 left-0 text-[10px] text-muted-foreground tabular-nums">{formatBitrate(top)}</span>}
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Grafik kecepatan download dan upload">
        <defs>
          <linearGradient id={`${id}-down`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {detailed &&
          [0.25, 0.5, 0.75].map((fraction) => (
            <line key={fraction} x1={0} x2={width} y1={height * fraction} y2={height * fraction} stroke="var(--border)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          ))}
        {download && <path d={`${download} L${width},${height} L0,${height} Z`} fill={`url(#${id}-down)`} />}
        {download && <path d={download} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {upload && <path d={upload} fill="none" className="stroke-emerald-500" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
  );
}

function StatusChip({ health, polledAt, className }: { health: Health; polledAt?: number | null; className?: string }) {
  const up = health ? health.state === "up" : null;
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-semibold", className)}>
      <span className="relative flex size-2.5">
        {up && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
        <span className={cn("relative inline-flex size-2.5 rounded-full", up ? "bg-emerald-500" : up === false ? "bg-destructive" : "bg-muted-foreground")} />
      </span>
      {up ? "Terhubung" : health?.state === "noTraffic" ? "Down · trafik tidak jalan" : health?.state === "portDown" ? "Down · terputus" : "Belum terbaca"}
      {polledAt ? <span className="font-normal text-muted-foreground">· {timeFormat.format(polledAt)} WITA</span> : null}
    </span>
  );
}

/** Pemakaian terhadap kapasitas langganan, berupa busur 270°. */
function Gauge({ bps, capacityBps }: { bps: number; capacityBps: number }) {
  const percent = capacityBps > 0 ? Math.min(100, (bps / capacityBps) * 100) : 0;
  const [value, unit] = splitBitrate(bps);
  const arc = "M43.43,156.57 A80,80 0 1 1 156.57,156.57";
  return (
    <div className="relative mx-auto aspect-[200/170] w-full max-w-60">
      <svg viewBox="0 0 200 170" className="size-full" aria-hidden="true">
        <path d={arc} fill="none" stroke="var(--muted)" strokeWidth={12} strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(percent, 0.5)} 100`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
        <span className="text-xs text-muted-foreground">Download</span>
        <span className="mt-0.5 text-4xl font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
        {capacityBps > 0 && <span className="mt-2 text-xs text-muted-foreground tabular-nums">{Math.round(percent)}% dari {formatBitrate(capacityBps)}</span>}
      </div>
    </div>
  );
}

/** Angka kecepatan dengan label dan panah arah, tanpa kotak berwarna. */
function Speed({ label, bps, tone, size = "md" }: { label: string; bps: number | null; tone: "down" | "up"; size?: "md" | "lg" }) {
  const [value, unit] = bps == null ? ["—", ""] : splitBitrate(bps);
  const Icon = tone === "down" ? ArrowDown : ArrowUp;
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className={cn("size-3.5", tone === "down" ? "text-brand" : "text-emerald-600")} />
        {label}
      </p>
      <p className={cn("mt-0.5 truncate font-semibold tracking-tight tabular-nums", size === "lg" ? "text-2xl" : "text-xl")}>
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

/** Bilah tipis pemakaian terhadap kapasitas langganan. */
function UsageBar({ bps, capacityBps }: { bps: number; capacityBps: number }) {
  const percent = Math.round(Math.min(100, (bps / capacityBps) * 100));
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        Pemakaian {percent}% dari {formatBitrate(capacityBps)}
      </p>
    </div>
  );
}

type Props = { initial: ConnectionStatus | null; realtime: boolean; capacityBps: number; reportHref?: string };

/**
 * Kartu ringkas di Beranda: status, kecepatan terakhir dari LibreNMS, dan pemakaian. Router tidak dibaca langsung di sini
 * (hemat permintaan ke server); kecepatan langsung dan grafiknya ada di tab Koneksi.
 */
export function ConnectionSummaryCard({ initial, capacityBps }: Omit<Props, "realtime">) {
  const { status, health, latest } = useLiveTraffic(initial, false, 5, 0);
  return (
    <Link href="/subnet/trafik" className="group block overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/20">
      <DownBanner health={health} />
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 sm:px-5">
        <div>
          <p className="text-[0.9375rem] font-semibold">Koneksi internet</p>
          <StatusChip health={health} polledAt={status?.polledAt} className="mt-1" />
        </div>
        <span className="flex items-center gap-0.5 text-sm font-medium text-brand-ink">
          Detail
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4 pt-4 sm:px-5">
        <Speed label="Download" bps={latest?.outBps ?? null} tone="down" size="lg" />
        <Speed label="Upload" bps={latest?.inBps ?? null} tone="up" size="lg" />
      </div>
      {capacityBps > 0 && latest ? (
        <div className="px-4 pt-4 pb-4 sm:px-5">
          <UsageBar bps={latest.outBps} capacityBps={capacityBps} />
        </div>
      ) : (
        <div className="h-4" />
      )}
    </Link>
  );
}

const intervals = [5, 10, 30];

/** Tab Koneksi: status, pengukur pemakaian, dan grafik langsung. Grafik MRTG lengkap ada di halaman detail. */
export function ConnectionMonitor({ initial, realtime, capacityBps, reportHref }: Props) {
  const [seconds, setSeconds] = useState(5);
  const { status, health, points, latest, running, setRunning, error } = useLiveTraffic(initial, realtime, seconds, 5 * 60_000);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <DownBanner health={health} reportHref={reportHref} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <StatusChip health={health} polledAt={status?.polledAt} />
        {realtime && (
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
                className={cn("rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors", running && value === seconds ? "bg-background text-brand-ink shadow-sm" : "text-muted-foreground")}
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
        )}
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center">
        <div className="flex flex-col gap-4">
          <Gauge bps={latest?.outBps ?? 0} capacityBps={capacityBps} />
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <Speed label="Download" bps={latest?.outBps ?? null} tone="down" />
            <Speed label="Upload" bps={latest?.inBps ?? null} tone="up" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <p className="font-semibold">{realtime ? "Kecepatan langsung" : "Kecepatan terakhir"}</p>
            <span className="flex gap-3 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand" /> Download
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Upload
              </span>
            </span>
          </div>
          <div className="relative rounded-xl border p-3">
            <TrafficChart points={points} height={170} detailed />
            {points.length < 2 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{running ? "Mengukur kecepatan…" : "Dijeda"}</p>
            )}
          </div>
          <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
            {error ||
              (realtime
                ? running
                  ? `Dibaca langsung dari router tiap ${seconds} detik, berhenti otomatis setelah 5 menit.`
                  : "Dijeda. Tekan tombol putar untuk melanjutkan."
                : "Diperbarui dari sistem monitoring TLINET setiap beberapa menit.")}
          </p>
          <NotificationButton />
        </div>
      </div>

      <Link href="/subnet/trafik/grafik" className="group flex items-center gap-3 border-t px-5 py-4 transition-colors hover:bg-muted/40 active:bg-muted/60">
        <ChartLine className="size-5 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Grafik MRTG lengkap</span>
          <span className="block text-xs text-muted-foreground">Riwayat trafik 1 hari, 1 minggu, dan 1 bulan</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
