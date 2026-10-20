"use client";

import { Check, Copy, KeyRound, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { deleteSubnetAccessAction, saveSubnetAccessAction } from "@/app/admin/subnet-actions";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteDialog } from "./confirm-delete";
import { whatsappUrl } from "@/lib/format";

/** `email`, `portId`, dan `ip`: usulan untuk akses baru, dari invoice terakhir, nomor VLAN, dan IP Address pelanggan. */
/** Sumber grafik trafik: port VLAN atau antrean QoS (Simple Queue) di LibreNMS. */
export type TrafficSource = { portId: number } | { qosDeviceId: number; qosId: number } | null;
export type SubnetCustomer = { id: string; title: string; phone: string; email: string; source: TrafficSource; ip: string };
export type SubnetAccount = { email: string; active: boolean; source: TrafficSource; pingTarget: string } | null;
export type SubnetPortOption = { portId: number; device: string; name: string; up: boolean };
export type SubnetQosOption = { qosId: number; deviceId: number; device: string; name: string };

const sourceValue = (source: TrafficSource) => (!source ? "" : "portId" in source ? `p:${source.portId}` : `q:${source.qosDeviceId}:${source.qosId}`);
function parseSource(value: string): TrafficSource {
  const [kind, a, b] = value.split(":");
  if (kind === "p" && Number(a) > 0) return { portId: Number(a) };
  if (kind === "q" && Number(a) > 0 && Number(b) > 0) return { qosDeviceId: Number(a), qosId: Number(b) };
  return null;
}

// Daftar port dan antrean QoS LibreNMS dikirim sekali untuk seluruh tabel, bukan per baris.
const PortsContext = createContext<{ ports: SubnetPortOption[] | null; qos: SubnetQosOption[] }>({ ports: null, qos: [] });

/** `ports` null berarti LibreNMS belum diatur (API_LIBRE_NMS kosong) atau sedang tidak bisa dijangkau. */
export function SubnetPortsProvider({ ports, qos, children }: { ports: SubnetPortOption[] | null; qos: SubnetQosOption[]; children: ReactNode }) {
  return <PortsContext.Provider value={{ ports, qos }}>{children}</PortsContext.Provider>;
}

// Tanpa huruf/angka yang mirip (0/O, 1/l/I) supaya mudah diketik ulang pelanggan.
const passwordAlphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomPassword = () => Array.from(crypto.getRandomValues(new Uint32Array(10)), (value) => passwordAlphabet[value % passwordAlphabet.length]).join("");

/** Tombol "Buat akses"/"Ubah akses" di menu Subnet beserta dialognya. */
export function SubnetAccessButton({ customer, account, portalUrl }: { customer: SubnetCustomer; account: SubnetAccount; portalUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [source, setSource] = useState("");
  const [pingTarget, setPingTarget] = useState("");
  const { ports, qos } = useContext(PortsContext);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Setelah disimpan dialog menampilkan data login untuk disalin atau dikirim ke pelanggan.
  const [saved, setSaved] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setEmail(account?.email ?? customer.email);
    setPassword(account ? "" : randomPassword());
    setActive(account?.active ?? true);
    setSource(sourceValue(account ? account.source : customer.source));
    setPingTarget(account ? account.pingTarget : customer.ip);
    setConfirmDelete(false);
    setSaved(null);
    setCopied(false);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveSubnetAccessAction(customer.id, { email, password, active, source: parseSource(source), pingTarget });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSaved({ email: email.trim().toLowerCase(), password });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteSubnetAccessAction(customer.id);
      if (result.ok) {
        toast.success(result.message);
        setConfirmDelete(false);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const message = saved
    ? [
        `Halo Bapak/Ibu ${customer.title},`,
        "",
        "Berikut akses portal Subnet TLINET untuk melihat data layanan dan invoice Anda:",
        "",
        `Alamat: ${portalUrl}`,
        `Email: ${saved.email}`,
        ...(saved.password ? [`Password: ${saved.password}`] : []),
        "",
        "Terima kasih.",
      ].join("\n")
    : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      toast.error("Gagal menyalin. Salin teksnya secara manual.");
    }
  }

  return (
    <>
      <Button variant={account ? "outline" : "default"} size="sm" onClick={openDialog}>
        <KeyRound />
        {account ? "Ubah akses" : "Buat akses"}
      </Button>
      <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Akses Subnet</DialogTitle>
            <DialogDescription>{customer.title}</DialogDescription>
          </DialogHeader>

          {saved ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {saved.password
                  ? "Berikan data login ini ke pelanggan. Kata sandi tidak bisa dilihat lagi setelah dialog ditutup."
                  : "Kata sandi tidak diganti; pelanggan tetap memakai kata sandi lamanya."}
              </p>
              <pre className="rounded-lg border bg-muted/50 p-3 font-sans text-sm whitespace-pre-wrap">{message}</pre>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" onClick={copy}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Tersalin" : "Salin"}
                </Button>
                <div className="flex gap-2">
                  {customer.phone && (
                    <Button asChild variant="outline">
                      <a href={whatsappUrl(customer.phone, message)} target="_blank" rel="noopener noreferrer">
                        <WhatsAppIcon className="text-[#1fa855]" />
                        Kirim lewat WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button onClick={() => setOpen(false)}>Selesai</Button>
                </div>
              </DialogFooter>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="subnet-email">Email</Label>
                <Input id="subnet-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" required />
                <p className="text-xs text-muted-foreground">Dipakai pelanggan untuk masuk ke portal Subnet.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subnet-password">{account ? "Kata sandi baru" : "Kata sandi"}</Label>
                <div className="flex gap-2">
                  <Input
                    id="subnet-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder={account ? "Kosongkan bila tidak diganti" : ""}
                    required={!account}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setPassword(randomPassword())} aria-label="Buat kata sandi acak" title="Buat kata sandi acak">
                    <RefreshCw />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minimal 8 karakter. Mengganti kata sandi membuat pelanggan keluar dari portal.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subnet-port">Grafik trafik (MRTG)</Label>
                <select
                  id="subnet-port"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Tidak ditampilkan</option>
                  {[...new Set((ports ?? []).map((port) => port.device))].map((device) => (
                    <optgroup key={device} label={device}>
                      {ports!.filter((port) => port.device === device).map((port) => (
                        <option key={port.portId} value={`p:${port.portId}`}>
                          {port.name}
                          {port.up ? "" : " (down)"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {[...new Set(qos.map((item) => item.device))].map((device) => (
                    <optgroup key={`qos-${device}`} label={`QoS · ${device}`}>
                      {qos.filter((item) => item.device === device).map((item) => (
                        <option key={item.qosId} value={`q:${item.deviceId}:${item.qosId}`}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {/* Pilihan tersimpan yang tidak ada di daftar (mis. LibreNMS sedang tak terjangkau) tetap terpilih. */}
                  {source && !ports?.some((port) => `p:${port.portId}` === source) && !qos.some((item) => `q:${item.deviceId}:${item.qosId}` === source) && (
                    <option value={source}>{source.startsWith("q:") ? `QoS #${source.split(":")[2]}` : `Port #${source.slice(2)}`}</option>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">
                  {ports
                    ? "Port VLAN atau antrean QoS (Simple Queue) pelanggan di LibreNMS. Grafiknya tampil di portal pelanggan."
                    : "Daftar port LibreNMS tidak bisa dimuat. Periksa API_LIBRE_NMS."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subnet-ping">IP untuk cek ping (ping.pe)</Label>
                <Input id="subnet-ping" value={pingTarget} onChange={(event) => setPingTarget(event.target.value)} placeholder="mis. 103.112.139.131" autoComplete="off" />
                <p className="text-xs text-muted-foreground">Ping real-time dari berbagai lokasi ke IP ini tampil di portal pelanggan. Kosongkan bila tidak ditampilkan.</p>
              </div>
              <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <span>
                  <span className="block text-sm font-medium">Akses aktif</span>
                  <span className="block text-xs text-muted-foreground">Bila dimatikan, pelanggan tidak bisa masuk ke portal.</span>
                </span>
                <Switch checked={active} onCheckedChange={setActive} />
              </label>
              <DialogFooter className="gap-2 sm:justify-between">
                {account ? (
                  <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)} disabled={pending}>
                    <Trash2 />
                    Hapus akses
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pending}>
                  {pending && <LoaderCircle className="animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          )}
          <ConfirmDeleteDialog
            open={confirmDelete}
            title="akses portal ini"
            description={`${customer.title} tidak bisa masuk lagi ke portal Subnet dan aplikasi TLINET. Data pelanggannya tidak ikut terhapus, dan aksesnya bisa dikembalikan dari Tempat Sampah selama 30 hari.`}
            pending={pending}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={remove}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
