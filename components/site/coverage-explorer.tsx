"use client";

import "leaflet/dist/leaflet.css";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { ArrowRight, CircleAlert, CircleCheck, Hourglass, LoaderCircle, LocateFixed, MapPin, MousePointerClick, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CoverageContent } from "@/lib/content/types";
import type { CoverageArea } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { linkButtonClass } from "./ui";

type Point = { lat: number; lng: number };

/** Jarak garis lurus antara dua koordinat, dalam km. */
function distanceKm(a: Point, b: Point) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const kmFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

type Check = { point: Point; areaId: string; distance: number; status: "covered" | "expansion" | "outside" };

/**
 * Menilai satu titik terhadap semua area. Titik di dalam radius area aktif dinyatakan terjangkau; di dalam
 * radius area ekspansi saja berarti ekspansi; di luar semua radius, area terdekat dipakai sebagai acuan.
 */
function evaluate(point: Point, areas: CoverageArea[]): Check | null {
  const ranked = areas.map((area) => ({ area, distance: distanceKm(point, area) })).sort((a, b) => a.distance - b.distance);
  if (!ranked.length) return null;
  const inside = ranked.filter((item) => item.distance <= item.area.radiusKm);
  const best = inside.find((item) => item.area.status !== "expansion") ?? inside[0] ?? ranked[0];
  const status = best.distance > best.area.radiusKm ? "outside" : best.area.status === "expansion" ? "expansion" : "covered";
  return { point, areaId: best.area.id, distance: best.distance, status };
}

const verdictStyles = {
  covered: { icon: CircleCheck, className: "bg-brand-soft text-brand-ink" },
  expansion: { icon: Hourglass, className: "bg-warning/15 text-amber-800" },
  outside: { icon: CircleAlert, className: "bg-muted text-foreground/80" },
};

export function CoverageExplorer({ areas, content }: { areas: CoverageArea[]; content: CoverageContent["map"] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const dots = useRef(new Map<string, CircleMarker>());
  const userDot = useRef<CircleMarker | null>(null);
  // Diisi saat peta siap: menaruh pin di satu titik lalu menilai jangkauannya.
  const checkAt = useRef<(point: Point, fly: boolean) => void>(() => {});

  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(areas[0]?.id ?? "");
  const [check, setCheck] = useState<Check | null>(null);
  const [locating, setLocating] = useState(false);

  const selected = areas.find((area) => area.id === selectedId);
  const cities = useMemo(() => [...new Set(areas.map((area) => area.city))], [areas]);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return areas.filter((area) => `${area.name} ${area.district} ${area.city}`.toLowerCase().includes(term)).slice(0, 6);
  }, [areas, query]);

  useEffect(() => {
    let cancelled = false;
    const markers = dots.current;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;
      const map = L.map(container.current, {
        center: [content.centerLat, content.centerLng],
        zoom: content.zoom,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        detectRetina: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      for (const area of areas) {
        const variant = area.status === "expansion" ? " is-expansion" : "";
        L.circle([area.lat, area.lng], {
          radius: area.radiusKm * 1000,
          weight: 1,
          opacity: 0.5,
          fillOpacity: 0.12,
          dashArray: area.status === "expansion" ? "4 5" : undefined,
          interactive: false,
          className: `area-ring${variant}`,
        }).addTo(map);
        const dot = L.circleMarker([area.lat, area.lng], { radius: 7, weight: 2.5, fillOpacity: 1, bubblingMouseEvents: false, className: `area-dot${variant}` })
          .addTo(map)
          .bindTooltip(area.name, { direction: "top", offset: [0, -8] })
          .on("click", () => setSelectedId(area.id));
        markers.set(area.id, dot);
      }
      checkAt.current = (point, fly) => {
        userDot.current?.remove();
        userDot.current = L.circleMarker([point.lat, point.lng], { radius: 8, weight: 3, fillOpacity: 1, interactive: false, className: "area-dot is-user" })
          .addTo(map)
          .bindTooltip(content.myLocationLabel, { direction: "top", offset: [0, -8] });
        const result = evaluate(point, areas);
        setCheck(result);
        if (!result) return;
        setSelectedId(result.areaId);
        const area = areas.find((item) => item.id === result.areaId);
        if (fly && area) {
          map.flyToBounds(
            [
              [point.lat, point.lng],
              [area.lat, area.lng],
            ],
            { padding: [70, 70], maxZoom: 13, duration: 0.8 },
          );
        }
      };
      map.on("click", (event) => checkAt.current({ lat: event.latlng.lat, lng: event.latlng.lng }, false));
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
      userDot.current = null;
      checkAt.current = () => {};
    };
  }, [areas, content.centerLat, content.centerLng, content.zoom, content.myLocationLabel]);

  // Titik terpilih dibesarkan agar mudah dikenali.
  useEffect(() => {
    if (!ready) return;
    dots.current.forEach((dot, id) => dot.setRadius(id === selectedId ? 11 : 7));
  }, [ready, selectedId]);

  function focusArea(area: CoverageArea) {
    setSelectedId(area.id);
    setQuery("");
    mapRef.current?.flyTo([area.lat, area.lng], 13, { duration: 0.8 });
  }

  function focusCity(city: string) {
    const first = areas.find((area) => area.city === city);
    if (first) focusArea(first);
  }

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Peramban Anda tidak mendukung deteksi lokasi.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        checkAt.current({ lat: coords.latitude, lng: coords.longitude }, true);
      },
      () => {
        setLocating(false);
        toast.error("Lokasi tidak dapat dideteksi. Izinkan akses lokasi atau pilih area secara manual.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Hasil cek hanya ditampilkan selama kartu masih menunjukkan area yang dinilai.
  const verdict = check && selected && check.areaId === selected.id ? check : null;
  const verdictStyle = verdict ? verdictStyles[verdict.status] : null;
  const verdictText = verdict ? { covered: content.coveredText, expansion: content.expansionText, outside: content.outsideText }[verdict.status] : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border bg-card p-4 shadow-xl shadow-primary/5 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={content.searchPlaceholder}
              aria-label={content.searchPlaceholder}
              className="h-12 w-full rounded-2xl border bg-background pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            {query.trim() && (
              <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border bg-popover p-1.5 shadow-xl">
                {matches.length ? (
                  matches.map((area) => (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => focusArea(area)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <MapPin className="size-4 shrink-0 text-brand-ink" />
                        <span className="min-w-0 flex-1 truncate font-medium">{area.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{area.city}</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-3 text-sm text-muted-foreground">Area tidak ditemukan. Coba nama kota atau kecamatan lain.</li>
                )}
              </ul>
            )}
          </div>
          <button type="button" onClick={locate} disabled={locating} className={linkButtonClass("brand", "h-12 px-6 disabled:opacity-70")}>
            {locating ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}
            {content.locateLabel}
          </button>
        </div>

        {cities.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{content.regionsLabel}:</span>
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => focusCity(city)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand hover:text-foreground",
                  selected?.city === city ? "border-brand bg-brand-soft text-brand-ink" : "bg-background text-muted-foreground",
                )}
              >
                <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <div className="overflow-hidden rounded-3xl border bg-card">
          {content.clickHint && (
            <p className="flex items-center gap-2 border-b px-5 py-3 text-xs text-muted-foreground">
              <MousePointerClick className="size-4 shrink-0 text-brand-ink" />
              {content.clickHint}
            </p>
          )}
          <div className="relative h-[24rem] bg-muted sm:h-[32rem]">
            <div ref={container} className="size-full" />
            {!ready && <Skeleton className="absolute inset-0 rounded-none" role="status" aria-label="Memuat peta" />}
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t px-5 py-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand" aria-hidden="true" />
              {content.activeLabel}
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-warning" aria-hidden="true" />
              {content.expansionLabel}
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-ink" aria-hidden="true" />
              {content.myLocationLabel}
            </li>
          </ul>
        </div>

        {selected ? (
          <aside className="flex flex-col rounded-3xl border bg-card p-6 sm:p-7" aria-live="polite">
            {verdict && verdictStyle && (
              <div className={cn("mb-6 flex gap-3 rounded-2xl px-4 py-3.5 text-sm leading-relaxed", verdictStyle.className)}>
                <verdictStyle.icon className="mt-0.5 size-4.5 shrink-0" />
                <p>
                  {verdictText}
                  <span className="mt-1 block text-xs opacity-80">
                    Sekitar {kmFormat.format(verdict.distance)} km dari titik {selected.name} (radius {kmFormat.format(selected.radiusKm)} km).
                  </span>
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase",
                  selected.status === "expansion" ? "bg-warning/15 text-amber-700" : "bg-brand-soft text-brand-ink",
                )}
              >
                {selected.status === "expansion" ? content.expansionLabel : content.activeLabel}
              </span>
              {selected.odpCount > 0 && (
                <span className="rounded-full border px-3 py-1 text-[11px] font-medium text-muted-foreground">{selected.odpCount} ODP Cluster</span>
              )}
            </div>

            <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">{selected.city}</p>
            <h2 className="mt-1.5 text-2xl font-semibold">{selected.name}</h2>
            {selected.district && <p className="mt-1 text-sm text-muted-foreground">{selected.district}</p>}

            <dl className="mt-6 divide-y border-y text-sm">
              {[
                ["Ketersediaan Fiber", selected.fiberAvailability],
                ["Kecepatan Maksimal", selected.maxSpeed],
                ["Radius Coverage", `${kmFormat.format(selected.radiusKm)} km`],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
            </dl>

            {selected.note && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{selected.note}</p>}

            <Link href="/formulir-registrasi" className={linkButtonClass("primary", "mt-7 w-full")}>
              {content.signupLabel}
              <ArrowRight />
            </Link>
          </aside>
        ) : (
          <aside className="flex items-center justify-center rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada titik jangkauan yang ditampilkan.
          </aside>
        )}
      </div>
    </div>
  );
}
