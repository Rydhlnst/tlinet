"use client";

import { ExternalLink, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/*
 * Ping real-time ke IP pelanggan dari berbagai lokasi lewat Globalping (api.globalping.io, layanan gratis jsDelivr),
 * ditampilkan seperti tabel ping.pe. ping.pe sendiri tidak bisa ditanam: di dalam iframe situs lain pemeriksaan
 * cookie-nya gagal. Permintaan dikirim langsung dari peramban pelanggan, jadi kuotanya (250 tes per jam per IP) milik
 * pelanggan itu sendiri; satu putaran memakai satu tes per lokasi.
 */

const api = "https://api.globalping.io/v1/measurements";
/** 10 lokasi per putaran, dari yang terdekat sampai lintas benua. Putaran berikutnya memakai probe yang sama. */
const locations = [
  { magic: "Indonesia", limit: 3 },
  { magic: "Singapore", limit: 1 },
  { magic: "Asia", limit: 2 },
  { magic: "world", limit: 4 },
];
const packetsPerRound = 4;
/** 12 putaran × 10 lokasi = 120 tes, kira-kira 2 menit; dua sesi masih muat dalam kuota 250 tes per jam. */
const roundsPerSession = 12;
const pauseBetweenRounds = 4_000;

type Probe = { country: string; city: string; network: string; asn: number };
type ProbeResult = {
  probe: Probe;
  result: { status: string; stats?: { min: number; max: number; avg: number; total: number; rcv: number; loss: number }; timings?: { rtt: number }[] };
};
type Row = { key: string; probe: Probe; sent: number; received: number; last: number | null; sum: number; best: number | null; worst: number | null };

const regionNames = new Intl.DisplayNames(["id"], { type: "region" });
const country = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};
const ms = (value: number | null) => (value == null ? "—" : value.toFixed(1));
/** Warna latensi seperti ping.pe: makin merah makin lambat. */
const latencyTone = (value: number | null) => (value == null ? "" : value < 80 ? "bg-emerald-50 text-emerald-800" : value < 200 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800");

async function measure(target: string, reuse: string | null, signal: AbortSignal): Promise<{ id: string; results: ProbeResult[]; reused: boolean }> {
  const response = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "ping", target, locations: reuse ?? locations, measurementOptions: { packets: packetsPerRound } }),
    signal,
  });
  if (response.status === 429) {
    const reset = Number(response.headers.get("x-ratelimit-reset")) || 3600;
    throw new Error(`Batas cek ping tercapai. Coba lagi dalam ${Math.ceil(reset / 60)} menit.`);
  }
  // Probe lama bisa saja sudah offline; pilih lokasi baru.
  if (reuse && !response.ok) return measure(target, null, signal);
  const created = await response.json();
  if (!response.ok || !created.id) throw new Error(created?.error?.message ?? "Cek ping tidak bisa dimulai.");
  // Hasil biasanya selesai dalam beberapa detik; ditanyakan berulang sampai semua lokasi selesai.
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const measurement = await (await fetch(`${api}/${created.id}`, { signal })).json();
    if (measurement.status !== "in-progress") return { id: created.id, results: measurement.results ?? [], reused: Boolean(reuse) };
  }
  throw new Error("Hasil ping terlalu lama. Coba lagi.");
}

export function SubnetPing({ target }: { target: string }) {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [round, setRound] = useState(0);
  const [error, setError] = useState("");
  // Id putaran pertama, supaya putaran berikutnya memakai probe (lokasi) yang sama dan barisnya tetap.
  const firstMeasurement = useRef<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let done = 0;

    async function next() {
      try {
        const { id, results, reused } = await measure(target, firstMeasurement.current, controller.signal);
        if (!reused) firstMeasurement.current = id;
        setRows((previous) => {
          const byKey = new Map(previous.map((row) => [row.key, { ...row }]));
          for (const { probe, result } of results) {
            const key = `${probe.country}|${probe.city}|${probe.asn}`;
            const row = byKey.get(key) ?? { key, probe, sent: 0, received: 0, last: null, sum: 0, best: null, worst: null };
            const stats = result.stats;
            if (stats) {
              row.sent += stats.total;
              row.received += stats.rcv;
              if (stats.rcv > 0) {
                row.sum += stats.avg * stats.rcv;
                row.best = row.best == null ? stats.min : Math.min(row.best, stats.min);
                row.worst = row.worst == null ? stats.max : Math.max(row.worst, stats.max);
              }
              row.last = result.timings?.at(-1)?.rtt ?? (stats.rcv > 0 ? stats.avg : null);
            }
            byKey.set(key, row);
          }
          return [...byKey.values()];
        });
        setError("");
        done += 1;
        setRound((value) => value + 1);
        if (done >= roundsPerSession) {
          setRunning(false);
          return;
        }
        timer = setTimeout(next, document.hidden ? pauseBetweenRounds * 4 : pauseBetweenRounds);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Cek ping gagal.");
        setRunning(false);
      }
    }
    void next();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [running, target]);

  // Indonesia lebih dulu, lalu dari yang tercepat.
  const sorted = [...rows].sort(
    (a, b) => Number(b.probe.country === "ID") - Number(a.probe.country === "ID") || (a.received ? a.sum / a.received : Infinity) - (b.received ? b.sum / b.received : Infinity),
  );

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ping ke <span className="font-semibold text-foreground">{target}</span> dari berbagai lokasi.
          {round > 0 && ` Putaran ${round}${running ? "" : " selesai"}.`}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={running ? "outline" : "default"}
            onClick={() => {
              if (!running && round >= roundsPerSession) setRound(0);
              setRunning(!running);
            }}
          >
            {running ? <Pause /> : <Play />}
            {running ? "Jeda" : rows.length ? "Lanjutkan" : "Mulai cek ping"}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={`https://ping.pe/${encodeURIComponent(target)}`} target="_blank" rel="noopener noreferrer" title="Buka di ping.pe">
              <ExternalLink />
              ping.pe
            </a>
          </Button>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table className="text-xs tabular-nums">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3">Lokasi</TableHead>
                <TableHead>Jaringan</TableHead>
                <TableHead className="text-right">Loss</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Last</TableHead>
                <TableHead className="text-right">Avg</TableHead>
                <TableHead className="text-right">Best</TableHead>
                <TableHead className="pr-3 text-right">Worst</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const loss = row.sent ? ((row.sent - row.received) / row.sent) * 100 : 0;
                const avg = row.received ? row.sum / row.received : null;
                return (
                  <TableRow key={row.key}>
                    <TableCell className="pl-3 whitespace-nowrap">
                      <span className="font-medium">{row.probe.city}</span>
                      <span className="text-muted-foreground">, {country(row.probe.country)}</span>
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-muted-foreground" title={`${row.probe.network} (AS${row.probe.asn})`}>
                      {row.probe.network}
                    </TableCell>
                    <TableCell className={cn("text-right", loss > 0 && "bg-red-50 font-semibold text-red-700")}>{loss.toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{row.sent}</TableCell>
                    <TableCell className={cn("text-right", latencyTone(row.last))}>{ms(row.last)}</TableCell>
                    <TableCell className={cn("text-right font-semibold", latencyTone(avg))}>{ms(avg)}</TableCell>
                    <TableCell className="text-right">{ms(row.best)}</TableCell>
                    <TableCell className="pr-3 text-right">{ms(row.worst)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {running ? "Mengirim ping dari berbagai lokasi…" : "Tekan Mulai cek ping untuk melihat latensi dan packet loss secara real-time."}
        </p>
      )}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Satuan ms. {packetsPerRound} ping per lokasi tiap putaran; berhenti sendiri setelah {roundsPerSession} putaran (sekitar 2 menit). Sumber: Globalping.
        </p>
      )}
    </div>
  );
}
