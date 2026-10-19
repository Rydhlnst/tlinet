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

/*
 * Real time: penghitung oktet port dibaca langsung dari router lewat SNMP oleh LibreNMS (/realtime/data/{port}), seperti tab
 * "Real time" di LibreNMS. Rute itu hanya untuk sesi login web, bukan token API, jadi server masuk dengan user LibreNMS
 * khusus (sebaiknya hanya bisa membaca, tanpa 2FA) dari LIBRENMS_USERNAME dan LIBRENMS_PASSWORD.
 */

const webUser = () => process.env.LIBRENMS_USERNAME?.trim() ?? "";
const webPassword = () => process.env.LIBRENMS_PASSWORD ?? "";

export const realtimeConfigured = () => Boolean(webUser() && webPassword());

/** Cookie sesi LibreNMS, dipakai ulang selama instance server hidup. Sesi Laravel bawaannya berlaku 2 jam. */
let webSession: { cookie: string; expires: number } | null = null;
let pendingLogin: Promise<string | null> | null = null;

function collectCookies(response: Response, jar: Map<string, string>) {
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0];
    const split = pair.indexOf("=");
    if (split > 0) jar.set(pair.slice(0, split), pair.slice(split + 1));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function login(): Promise<string | null> {
  try {
    const jar = new Map<string, string>();
    const page = await fetch(`${baseUrl}/login`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    let cookie = collectCookies(page, jar);
    const token = (await page.text()).match(/name="_token" value="([^"]+)"/)?.[1];
    if (!token) return null;
    const response = await fetch(`${baseUrl}/login`, {
      method: "POST",
      redirect: "manual",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
      body: new URLSearchParams({ _token: token, username: webUser(), password: webPassword() }),
      signal: AbortSignal.timeout(15_000),
    });
    cookie = collectCookies(response, jar);
    // Berhasil: dialihkan ke halaman selain /login. Gagal: kembali ke /login.
    const location = response.headers.get("location") ?? "";
    if (response.status !== 302 || /\/login(\?|$)/.test(location)) {
      console.error("[librenms] login gagal", response.status);
      return null;
    }
    return cookie;
  } catch (error) {
    console.error("[librenms] login", error);
    return null;
  }
}

async function sessionCookie(forceNew = false) {
  if (!forceNew && webSession && webSession.expires > Date.now()) return webSession.cookie;
  pendingLogin ??= login().finally(() => (pendingLogin = null));
  const cookie = await pendingLogin;
  webSession = cookie ? { cookie, expires: Date.now() + 90 * 60_000 } : null;
  return cookie;
}

/** Penghitung oktet masuk/keluar port saat ini (string, karena bisa melebihi batas angka JavaScript), atau `null`. */
export async function getRealtimeCounters(portId: number): Promise<{ time: number; in: string; out: string } | null> {
  if (!realtimeConfigured()) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const cookie = await sessionCookie(attempt > 0);
    if (!cookie) return null;
    try {
      const response = await fetch(`${baseUrl}/realtime/data/${portId}`, {
        headers: { Cookie: cookie, Accept: "text/plain" },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      // Sesi kedaluwarsa: LibreNMS mengalihkan ke /login; masuk ulang sekali.
      if (response.status === 302 || response.status === 401 || response.status === 419) continue;
      if (!response.ok) return null;
      const [time, inOctets, outOctets] = (await response.text()).trim().split("|");
      if (!/^\d+$/.test(inOctets ?? "") || !/^\d+$/.test(outOctets ?? "")) return null;
      return { time: Number(time), in: inOctets, out: outOctets };
    } catch (error) {
      console.error("[librenms] realtime", portId, error);
      return null;
    }
  }
  return null;
}

/** Halaman web LibreNMS dengan sesi login; masuk ulang sekali bila sesinya kedaluwarsa. `null` bila gagal. */
async function webFetch(path: string, timeoutMs = 15_000): Promise<Response | null> {
  if (!realtimeConfigured()) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const cookie = await sessionCookie(attempt > 0);
    if (!cookie) return null;
    try {
      const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie }, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
      if (response.status === 302 || response.status === 401 || response.status === 419) continue;
      return response.ok ? response : null;
    } catch (error) {
      console.error("[librenms] web", path, error);
      return null;
    }
  }
  return null;
}

/*
 * QoS: antrean Simple Queue MikroTik yang dipantau LibreNMS (tab QoS di halaman perangkat), dipakai untuk pelanggan
 * yang tidak punya port VLAN sendiri. API LibreNMS belum menyediakan QoS, jadi daftar dan grafiknya dibaca dari
 * halaman web dengan user yang sama seperti Real time.
 */

export type LibrenmsQos = { qosId: number; deviceId: number; device: string; name: string };

let qosCache: { list: LibrenmsQos[]; expires: number } | null = null;

/** Semua antrean QoS di semua perangkat, untuk dipilih admin. Disimpan 5 menit. */
export async function listLibrenmsQos(): Promise<LibrenmsQos[]> {
  if (!realtimeConfigured()) return [];
  if (qosCache && qosCache.expires > Date.now()) return qosCache.list;
  const devices = (await json<{ devices?: RawDevice[] }>("/devices?type=all", 300))?.devices ?? [];
  let incomplete = !devices.length;
  const lists = await Promise.all(
    devices.map(async (device) => {
      const html = await (await webFetch(`/device/${device.device_id}/qos`))?.text().catch(() => "");
      if (!html) {
        incomplete = true;
        return [];
      }
      const label = `${device.sysName || device.hostname} (${device.hostname})`;
      const seen = new Map<number, LibrenmsQos>();
      for (const match of html.matchAll(/\/device\/(\d+)\/qos\/show=(\d+)"[^>]*>([^<]+)</g)) {
        const qosId = Number(match[2]);
        const name = match[3].replace(/&amp;/g, "&").trim();
        if (Number(match[1]) === device.device_id && name && !seen.has(qosId)) seen.set(qosId, { qosId, deviceId: device.device_id, device: label, name });
      }
      return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }));
    }),
  );
  const list = lists.flat();
  // Daftar yang tidak lengkap (ada perangkat yang gagal dibaca) hanya disimpan sebentar supaya cepat dicoba lagi.
  qosCache = { list, expires: Date.now() + (incomplete ? 30_000 : 5 * 60_000) };
  return list;
}

/** Usulan antrean QoS dari nama pelanggan (PT atau nama), mis. "PT BULUKUMBA FIBER OPTIC" ↔ "PT.BULUKUMBA FIBER OPTIC". */
export function suggestQos(names: string[], list: LibrenmsQos[]) {
  const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = names.map(key).filter((value) => value.length >= 4);
  return list.find((qos) => wanted.includes(key(qos.name)));
}

/** Grafik trafik antrean QoS (SVG dari LibreNMS), atau `null` bila gagal diambil. */
export async function getQosGraph(deviceId: number, qosId: number, range: TrafficRange) {
  const from = Math.floor(Date.now() / 300_000) * 300 - trafficRanges[range].seconds;
  const response = await webFetch(`/graph?type=device_qos_routeros_simple_traffic&device=${deviceId}&qos_id=${qosId}&from=${from}&width=1000&height=300`, 20_000);
  const type = response?.headers.get("content-type") ?? "";
  if (!response || !type.startsWith("image/")) return null;
  return { body: await response.arrayBuffer(), type };
}
