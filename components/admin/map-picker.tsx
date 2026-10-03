"use client";

import "leaflet/dist/leaflet.css";
import type { Circle, CircleMarker, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";

type Props = {
  lat: unknown;
  lng: unknown;
  radiusKm: unknown;
  onPick: (lat: number, lng: number) => void;
};

const fallbackCenter: [number, number] = [-4.2, 119.95];

/** Koordinat sah atau `null`; (0, 0) dianggap belum diisi. */
function toPoint(lat: unknown, lng: unknown): [number, number] | null {
  const a = Number(lat);
  const b = Number(lng);
  if (lat === "" || lng === "" || lat == null || lng == null) return null;
  if (!Number.isFinite(a) || !Number.isFinite(b) || (a === 0 && b === 0)) return null;
  return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : null;
}

/** Peta kecil di form titik jangkauan: klik untuk menaruh titik, lingkaran mengikuti radius. */
export function MapPicker({ lat, lng, radiusKm, onPick }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const dot = useRef<CircleMarker | null>(null);
  const ring = useRef<Circle | null>(null);
  const pick = useRef(onPick);
  // Bertambah setiap kali peta selesai dibuat, agar titik digambar ulang pada peta yang baru.
  const [mapVersion, setMapVersion] = useState(0);
  const point = toPoint(lat, lng);
  const radius = Math.max(0, Number(radiusKm) || 0) * 1000;
  const [pointLat, pointLng] = point ?? [null, null];

  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;
      const instance = L.map(container.current, { center: fallbackCenter, zoom: 7 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance);
      instance.on("click", (event) => pick.current(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))));
      ring.current = L.circle(fallbackCenter, { radius: 0, weight: 1, opacity: 0.6, fillOpacity: 0.14, interactive: false, className: "area-ring" });
      dot.current = L.circleMarker(fallbackCenter, { radius: 8, weight: 2.5, fillOpacity: 1, interactive: false, className: "area-dot" });
      map.current = instance;
      // Panel samping masih bergeser saat peta dibuat; ukur ulang setelah animasinya selesai.
      setTimeout(() => instance.invalidateSize(), 300);
      setMapVersion((version) => version + 1);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Titik dan lingkaran mengikuti nilai form, baik dari klik peta maupun ketikan manual.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !dot.current || !ring.current) return;
    if (pointLat === null || pointLng === null) {
      dot.current.remove();
      ring.current.remove();
      return;
    }
    const position: [number, number] = [pointLat, pointLng];
    dot.current.setLatLng(position).addTo(instance);
    ring.current.setLatLng(position).setRadius(radius).addTo(instance);
    if (!instance.getBounds().pad(-0.2).contains(position)) instance.setView(position, Math.max(instance.getZoom(), 12));
  }, [mapVersion, pointLat, pointLng, radius]);

  return <div ref={container} className="h-64 w-full overflow-hidden rounded-lg border bg-muted" />;
}
