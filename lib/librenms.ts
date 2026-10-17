/**
 * Trafik port pelanggan dari LibreNMS (MRTG). Token API (API_LIBRE_NMS) hanya dipakai di server: pelanggan melihat
 * grafik port miliknya lewat /subnet/traffic, tanpa akses ke LibreNMS sendiri.
 */

const baseUrl = (process.env.LIBRENMS_URL || "https://mrtg.translinkinternasional.com").replace(/\/$/, "");
const token = () => process.env.API_LIBRE_NMS?.trim() ?? "";

export const librenmsConfigured = () => Boolean(token());

async function api(path: string, revalidate: number) {
  return fetch(`${baseUrl}/api/v0${path}`, {
    headers: { "X-Auth-Token": token() },
    next: { revalidate },
    signal: AbortSignal.timeout(15_000),
  });
}

async function json<T>(path: string, revalidate: number): Promise<T | null> {
  if (!librenmsConfigured()) return null;
  try {
    const response = await api(path, revalidate);
    return response.ok ? ((await response.json()) as T) : null;
  } catch (error) {
    console.error("[librenms]", path, error);
    return null;
  }
}

export type LibrenmsPort = { portId: number; deviceId: number; device: string; name: string; up: boolean };

type RawPort = { port_id: number; ifName: string | null; ifDescr: string | null; ifOperStatus: string | null };
type RawDevice = { device_id: number; hostname: string; sysName: string | null; status: number | boolean };

/** Semua port VLAN di semua router, untuk dipilih admin. Router yang sedang aktif lebih dulu. */
export async function listLibrenmsPorts(): Promise<LibrenmsPort[]> {
  const devices = (await json<{ devices?: RawDevice[] }>("/devices?type=all", 300))?.devices ?? [];
  const sorted = [...devices].sort((a, b) => Number(Boolean(b.status)) - Number(Boolean(a.status)));
  const lists = await Promise.all(
    sorted.map(async (device) => {
      const ports = (await json<{ ports?: RawPort[] }>(`/devices/${device.device_id}/ports?columns=port_id,ifName,ifDescr,ifOperStatus`, 300))?.ports ?? [];
      const label = `${device.sysName || device.hostname} (${device.hostname})`;
      return ports
        .map((port) => ({ portId: port.port_id, deviceId: device.device_id, device: label, name: (port.ifName || port.ifDescr || "").trim(), up: port.ifOperStatus === "up" }))
        .filter((port) => /vlan/i.test(port.name))
        .sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }));
    }),
  );
  return lists.flat();
}

/** Nomor VLAN di nama port atau isian VLAN pelanggan: "vlan- 1552-PT …" → "1552". */
export const vlanNumber = (value: string) => value.match(/vlan\s*-?\s*(\d+)/i)?.[1] ?? (/^\d+$/.test(value.trim()) ? value.trim() : "");

/** Usulan port untuk pelanggan dari nomor VLAN-nya; port yang sedang up di router aktif didahulukan. */
export function suggestPort(vlan: string, ports: LibrenmsPort[]) {
  const number = vlanNumber(vlan);
  if (!number) return undefined;
  const matches = ports.filter((port) => vlanNumber(port.name) === number);
  return matches.find((port) => port.up) ?? matches[0];
}

export type PortTraffic = { name: string; up: boolean; inBps: number; outBps: number; speedBps: number; polledAt: Date | null };

type RawPortDetail = RawPort & { device_id: number; ifInOctets_rate: number | null; ifOutOctets_rate: number | null; ifSpeed: number | null; poll_time: number | null };

async function portDetail(portId: number) {
  return (await json<{ port?: RawPortDetail[] }>(`/ports/${portId}`, 60))?.port?.[0] ?? null;
}

/** Kecepatan terakhir yang dibaca LibreNMS (bit per detik), atau `null` bila port tidak ditemukan. */
export async function getPortTraffic(portId: number): Promise<PortTraffic | null> {
  const port = await portDetail(portId);
  if (!port) return null;
  return {
    name: (port.ifName || port.ifDescr || "").trim(),
    up: port.ifOperStatus === "up",
    inBps: (port.ifInOctets_rate ?? 0) * 8,
    outBps: (port.ifOutOctets_rate ?? 0) * 8,
    speedBps: port.ifSpeed ?? 0,
    polledAt: port.poll_time ? new Date(port.poll_time * 1000) : null,
  };
}

export const trafficRanges = {
  day: { label: "1 hari", seconds: 86_400 },
  week: { label: "1 minggu", seconds: 7 * 86_400 },
  month: { label: "1 bulan", seconds: 30 * 86_400 },
} as const;
export type TrafficRange = keyof typeof trafficRanges;

/** Grafik trafik port (SVG dari LibreNMS), atau `null` bila gagal diambil. */
export async function getPortGraph(portId: number, range: TrafficRange) {
  const port = await portDetail(portId);
  const name = port?.ifName || port?.ifDescr;
  if (!port || !name) return null;
  // Dibulatkan ke 5 menit supaya permintaan berdekatan memakai grafik yang sama dari cache.
  const from = Math.floor(Date.now() / 300_000) * 300 - trafficRanges[range].seconds;
  try {
    const response = await api(`/devices/${port.device_id}/ports/${encodeURIComponent(name)}/port_bits?from=${from}&width=1000&height=300`, 300);
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) return null;
    return { body: await response.arrayBuffer(), type };
  } catch (error) {
    console.error("[librenms] grafik", portId, error);
    return null;
  }
}

/** "112,09 Mbps" dari bit per detik. */
export function formatBitrate(bps: number) {
  const units = ["bps", "Kbps", "Mbps", "Gbps"];
  let value = bps;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: value < 10 ? 2 : 1 })} ${units[unit]}`;
}
