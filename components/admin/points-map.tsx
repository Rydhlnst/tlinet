"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { MapPinned } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type MapPoint = { id: string; lat: number; lng: number; title: string; detail: string; href?: string; active: boolean };

/** Seluruh Indonesia, dipakai bila belum ada titik. */
const indonesia: [[number, number], [number, number]] = [
  [-11, 95],
  [6, 141],
];

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Peta sebaran titik (mis. tower pelanggan) di atas tabel data: hijau untuk yang aktif, merah untuk yang lain. Titiknya
 * mengikuti baris yang sedang tampil, dan peta menyesuaikan diri agar semua titik terlihat.
 */
export function PointsMap({
  title,
  description,
  points,
  total,
  noun,
  activeLabel,
  inactiveLabel,
}: {
  title: string;
  description: string;
  points: MapPoint[];
  /** Jumlah baris yang tampil, untuk keterangan "n dari total punya titik". */
  total: number;
  /** Mis. "pelanggan". */
  noun: string;
  activeLabel: string;
  inactiveLabel: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;
      const instance = L.map(container.current, { scrollWheelZoom: false, zoomSnap: 0.5 }).fitBounds(indonesia);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        detectRetina: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance);
      layer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  // Titik digambar ulang hanya bila daftarnya berubah, bukan setiap render tabel.
  const signature = points.map((point) => `${point.id}:${point.lat},${point.lng},${point.active}`).join("|");
  useEffect(() => {
    if (!ready || !map.current || !layer.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const instance = map.current;
      const group = layer.current;
      if (cancelled || !instance || !group) return;
      group.clearLayers();
      for (const point of points) {
        const popup = [
          `<p class="points-map-title">${escapeHtml(point.title)}</p>`,
          point.detail && `<p class="points-map-detail">${escapeHtml(point.detail)}</p>`,
          `<p class="points-map-detail">${escapeHtml(point.active ? activeLabel : inactiveLabel)}</p>`,
          point.href && `<a class="points-map-link" href="${escapeHtml(point.href)}">Buka detail</a>`,
        ]
          .filter(Boolean)
          .join("");
        L.marker([point.lat, point.lng], {
          icon: L.divIcon({ className: "", html: `<span class="tower-pin is-small ${point.active ? "is-up" : "is-off"}"></span>`, iconSize: [16, 16], iconAnchor: [8, 8] }),
          keyboard: false,
        })
          .bindTooltip(escapeHtml(point.title), { direction: "top", offset: [0, -10] })
          .bindPopup(popup, { offset: [0, -6] })
          .addTo(group);
      }
      if (points.length) instance.fitBounds(L.latLngBounds(points.map((point) => [point.lat, point.lng])), { padding: [48, 48], maxZoom: 9 });
      else instance.fitBounds(indonesia);
    })();
    return () => {
      cancelled = true;
    };
    // `points` diwakili `signature`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready, activeLabel, inactiveLabel]);

  const activeCount = points.filter((point) => point.active).length;
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)]">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <MapPinned className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            {activeLabel} <span className="text-muted-foreground tabular-nums">({activeCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive" />
            {inactiveLabel} <span className="text-muted-foreground tabular-nums">({points.length - activeCount})</span>
          </span>
        </div>
      </div>
      <div className="relative h-72 w-full bg-muted sm:h-96">
        <div ref={container} className="size-full" />
        {!ready && <Skeleton className="absolute inset-0 rounded-none" role="status" aria-label="Memuat peta" />}
      </div>
      <p className="border-t px-4 py-2.5 text-xs text-muted-foreground md:px-5">
        {points.length} dari {total} {noun} punya titik di peta. Titik diisi lewat Lokasi tower di form, klik titik untuk membuka detail.
      </p>
    </section>
  );
}
