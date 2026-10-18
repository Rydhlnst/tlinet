import type { MetroStepRecord } from "@/lib/db/schema";
import { formatBitrate, parseCapacityBps } from "@/lib/format";

/**
 * Progres Metro: tahapan pemasangan baru dan upgrade kapasitas yang dilihat pelanggan di portal Subnet. Admin menandai
 * tiap langkah selesai (beserta waktunya) dari menu Progres Metro di admin.
 */

export type MetroKind = "install" | "upgrade";
export type MetroStatus = "active" | "done" | "rejected";
export type MetroStep = { key: string; label: string; description: string };

export const metroSteps: Record<MetroKind, MetroStep[]> = {
  install: [
    { key: "registrasi", label: "Registrasi", description: "Pengajuan pemasangan diterima." },
    { key: "approved", label: "Disetujui Admin", description: "Pengajuan diperiksa dan disetujui admin." },
    { key: "alokasi_port", label: "Alokasi Port Metro", description: "Port metro untuk layanan Anda disiapkan." },
    { key: "alokasi_ip", label: "Alokasi IP Publik", description: "IP publik dialokasikan untuk layanan Anda." },
    { key: "onsite", label: "Onsite", description: "Teknisi melakukan instalasi di lokasi." },
    { key: "allow_vlan", label: "Allow VLAN", description: "VLAN layanan Anda diaktifkan di jaringan." },
    { key: "tes_bandwidth", label: "Tes Bandwidth", description: "Kecepatan diuji sesuai kapasitas langganan." },
    { key: "done", label: "Selesai", description: "Layanan aktif dan siap digunakan." },
  ],
  upgrade: [
    { key: "permintaan", label: "Permintaan Upgrade", description: "Permintaan upgrade kapasitas diterima." },
    { key: "approved_it", label: "Disetujui IT", description: "Permintaan diperiksa dan disetujui tim IT." },
    { key: "alokasi", label: "Alokasi", description: "Kapasitas baru dialokasikan di jaringan." },
    { key: "tes_bandwidth", label: "Tes Bandwidth", description: "Kecepatan baru diuji." },
    { key: "done", label: "Selesai", description: "Kapasitas baru sudah aktif." },
  ],
};

export const metroKindLabels: Record<MetroKind, string> = { install: "Pemasangan Baru", upgrade: "Upgrade Kapasitas" };

export const isMetroKind = (value: unknown): value is MetroKind => value === "install" || value === "upgrade";

/** Pilihan kapasitas saat pelanggan mengajukan upgrade (Mbps). */
export const upgradeOptionsMbps = [20, 50, 100, 150, 200, 300, 500, 1000];

export const capacityLabel = (mbps: number) => formatBitrate(mbps * 1_000_000);

/** Pilihan upgrade yang lebih besar dari kapasitas sekarang; semua pilihan bila kapasitas sekarang tidak terbaca. */
export function upgradeOptions(currentCapacity: string) {
  const current = parseCapacityBps(currentCapacity) / 1_000_000;
  return upgradeOptionsMbps.filter((mbps) => !current || mbps > current);
}

/** Langkah-langkah satu order beserta keadaannya, untuk ditampilkan berurutan. */
export function metroProgress(kind: MetroKind, steps: Record<string, MetroStepRecord>) {
  const list = metroSteps[kind];
  const doneCount = list.findIndex((step) => !steps[step.key]);
  const completed = doneCount === -1 ? list.length : doneCount;
  return {
    steps: list.map((step, index) => ({ ...step, record: steps[step.key] ?? null, state: index < completed ? "done" : index === completed ? "current" : "pending" }) as const),
    completed,
    total: list.length,
    next: list[completed] ?? null,
    last: completed > 0 ? list[completed - 1] : null,
  };
}

/** "Senin, 18 Oktober 2026 · 11.50 WITA" — waktu langkah menurut zona kantor (WITA). */
const stepDate = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" });
const stepTime = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });
export const formatStepTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `${stepDate.format(date)} · ${stepTime.format(date)} WITA`;
};

/** Nilai awal input datetime-local (WITA) dan kebalikannya. */
export const toWitaInput = (date: Date) => new Date(date.getTime() + 8 * 3_600_000).toISOString().slice(0, 16);
export const fromWitaInput = (value: string) => {
  const date = new Date(`${value}:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};
