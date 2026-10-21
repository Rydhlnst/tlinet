import { asc } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { dataCenters } from "@/lib/db/schema";
import { getPortGraph, getQosGraph, librenmsConfigured, listLibrenmsPorts, listLibrenmsQos, type TrafficRange } from "@/lib/librenms";

/** Sumber grafik MRTG Data Center: "p:<portId>" (port) atau "q:<deviceId>:<qosId>" (antrean QoS); selain itu tidak ada. */
export function parseMrtgSource(value: string): { kind: "port"; portId: number } | { kind: "qos"; deviceId: number; qosId: number } | null {
  const port = value.match(/^p:(\d+)$/);
  if (port) return { kind: "port", portId: Number(port[1]) };
  const qos = value.match(/^q:(\d+):(\d+)$/);
  return qos ? { kind: "qos", deviceId: Number(qos[1]), qosId: Number(qos[2]) } : null;
}

/** Grafik trafik (SVG dari LibreNMS) untuk sumber MRTG sebuah Data Center, atau `null` bila tidak ada atau gagal. */
export async function getMrtgGraph(source: string, range: TrafficRange) {
  const parsed = parseMrtgSource(source);
  if (!parsed) return null;
  return parsed.kind === "port" ? getPortGraph(parsed.portId, range) : getQosGraph(parsed.deviceId, parsed.qosId, range);
}

let optionsCache: { list: { value: string; label: string }[]; expires: number } | null = null;

/**
 * Pilihan isian Grafik MRTG: semua port dan antrean QoS di LibreNMS, disimpan 5 menit karena LibreNMS lambat dibaca.
 * Kegagalan LibreNMS menghasilkan daftar kosong (dan tidak disimpan).
 */
export async function mrtgSourceOptions() {
  if (optionsCache && optionsCache.expires > Date.now()) return optionsCache.list;
  const [ports, qos] = await Promise.all([librenmsConfigured() ? listLibrenmsPorts(null).catch(() => []) : [], listLibrenmsQos().catch(() => [])]);
  const list = [
    // Pilihan Select tidak boleh bernilai kosong; "-" berarti tanpa grafik.
    { value: "-", label: "Tidak ditampilkan" },
    ...ports.map((port) => ({ value: `p:${port.portId}`, label: `${port.device} · ${port.name}${port.up ? "" : " (down)"}` })),
    ...qos.map((item) => ({ value: `q:${item.deviceId}:${item.qosId}`, label: `QoS · ${item.device} · ${item.name}` })),
  ];
  if (ports.length || qos.length) optionsCache = { list, expires: Date.now() + 5 * 60_000 };
  return list;
}

/** Nama singkat sumber grafik bila daftar LibreNMS belum dimuat: "Port #2533" atau "QoS #77"; `null` bila tidak ada. */
export function mrtgFallbackLabel(value: string) {
  const parsed = parseMrtgSource(value);
  return parsed ? (parsed.kind === "port" ? `Port #${parsed.portId}` : `QoS #${parsed.qosId}`) : null;
}

/** Daftar Data Center untuk kolom tabel (nama PT) dan pilihan form pembayaran (PT dan layanannya). */
export async function dataCenterOptions() {
  const rows = await requireDb()
    .select({ id: dataCenters.id, company: dataCenters.company, service: dataCenters.service, status: dataCenters.status })
    .from(dataCenters)
    .orderBy(asc(dataCenters.company));
  return {
    dataCenterNames: rows.map((row) => ({ value: row.id, label: row.company })),
    dataCenters: rows.map((row) => ({ value: row.id, label: [row.company, row.service, row.status !== "active" && "berhenti"].filter(Boolean).join(" · ") })),
  };
}
