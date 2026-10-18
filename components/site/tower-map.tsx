"use client";

import "leaflet/dist/leaflet.css";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Peta kecil lokasi tower pelanggan, bergaya sama dengan peta Area Jangkauan. */
export function TowerMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let remove = () => {};
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;
      const map = L.map(container.current, { center: [lat, lng], zoom: 14, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        detectRetina: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.circleMarker([lat, lng], { radius: 8, weight: 2.5, fillOpacity: 1, className: "area-dot" })
        .addTo(map)
        .bindTooltip(label, { direction: "top", offset: [0, -8], permanent: true });
      remove = () => map.remove();
      setReady(true);
    })();
    return () => {
      cancelled = true;
      remove();
    };
  }, [lat, lng, label]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-56 w-full overflow-hidden rounded-lg border bg-muted">
        <div ref={container} className="size-full" />
        {!ready && <Skeleton className="absolute inset-0 rounded-none" role="status" aria-label="Memuat peta" />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-brand-ink underline-offset-4 hover:underline"
        >
          <ExternalLink className="size-3.5" />
          Buka di Google Maps
        </a>
      </div>
    </div>
  );
}
