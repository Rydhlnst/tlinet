"use client";

import "leaflet/dist/leaflet.css";
import type { Marker } from "leaflet";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "@/components/site/subnet-connection";
import { Skeleton } from "@/components/ui/skeleton";
import { trafficStopped } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusRefreshMs = 5 * 60_000;
const timeFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" });

type TowerState = "up" | "down" | "unknown";

const stateOf = (status: ConnectionStatus | null): TowerState => (!status ? "unknown" : !status.up || trafficStopped(status) ? "down" : "up");

const labels: Record<TowerState, { title: string; detail: string }> = {
  up: { title: "Normal", detail: "Trafik internet jalan" },
  down: { title: "Down", detail: "Trafik internet tidak jalan" },
  unknown: { title: "Status belum tersedia", detail: "Monitoring koneksi belum diatur" },
};

const pinHtml = (state: TowerState) => `<span class="tower-pin is-${state}"></span>`;

/**
 * Peta lokasi tower pelanggan dengan titik yang berkedip hijau saat trafik jalan dan merah saat down. Statusnya dari
 * /subnet/status (LibreNMS, ±5 menit), diperbarui tiap 5 menit selama halaman terbuka.
 */
export function TowerMap({ lat, lng, name, initial, monitored }: { lat: number; lng: number; name: string; initial: ConnectionStatus | null; monitored: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(initial);
  const state = monitored ? stateOf(status) : "unknown";

  useEffect(() => {
    if (!monitored) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/subnet/status", { cache: "no-store" });
        if (response.ok && !stopped) setStatus((await response.json()) as ConnectionStatus);
      } catch {
        // Status lama tetap ditampilkan.
      }
    }, statusRefreshMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [monitored]);

  useEffect(() => {
    let cancelled = false;
    let remove = () => {};
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;
      const map = L.map(container.current, { center: [lat, lng], zoom: 15, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        detectRetina: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      marker.current = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: pinHtml("unknown"), iconSize: [22, 22], iconAnchor: [11, 11] }), keyboard: false })
        .addTo(map)
        .bindTooltip(name || "Tower", { direction: "top", offset: [0, -14], permanent: true });
      remove = () => {
        marker.current = null;
        map.remove();
      };
      setReady(true);
    })();
    return () => {
      cancelled = true;
      remove();
    };
  }, [lat, lng, name]);

  // Warna titik mengikuti status tanpa membuat ulang peta.
  useEffect(() => {
    const pin = marker.current?.getElement()?.querySelector(".tower-pin");
    if (pin) pin.className = `tower-pin is-${state}`;
  }, [state, ready]);

  const label = labels[state];
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative h-80 w-full bg-muted sm:h-[26rem]">
        <div ref={container} className="size-full" />
        {!ready && <Skeleton className="absolute inset-0 rounded-none" role="status" aria-label="Memuat peta" />}
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="relative mt-1 flex size-3 shrink-0">
            {state !== "unknown" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", state === "up" ? "bg-emerald-400" : "bg-destructive")} />}
            <span className={cn("relative inline-flex size-3 rounded-full", state === "up" ? "bg-emerald-500" : state === "down" ? "bg-destructive" : "bg-muted-foreground")} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{name || "Tower"}</p>
            <p className={cn("text-sm", state === "down" ? "font-medium text-destructive" : "text-muted-foreground")}>
              {label.title} · {label.detail}
              {monitored && status?.polledAt ? ` · ${timeFormat.format(status.polledAt)} WITA` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white"
          >
            <ExternalLink className="size-3.5" />
            Buka di Google Maps
          </a>
        </div>
      </div>
    </section>
  );
}
