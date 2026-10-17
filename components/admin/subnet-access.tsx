"use client";

import { Check, Copy, KeyRound, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSubnetAccessAction, saveSubnetAccessAction } from "@/app/admin/subnet-actions";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { whatsappUrl } from "@/lib/format";

/** `email`: usulan email untuk akses baru, mis. dari invoice terakhir pelanggan. */
export type SubnetCustomer = { id: string; title: string; phone: string; email: string };
export type SubnetAccount = { email: string; active: boolean } | null;

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Setelah disimpan dialog menampilkan data login untuk disalin atau dikirim ke pelanggan.
  const [saved, setSaved] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setEmail(account?.email ?? customer.email);
    setPassword(account ? "" : randomPassword());
    setActive(account?.active ?? true);
    setConfirmDelete(false);
    setSaved(null);
    setCopied(false);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveSubnetAccessAction(customer.id, { email, password, active });
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
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteSubnetAccessAction(customer.id);
      if (result.ok) {
        toast.success(result.message);
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
              <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <span>
                  <span className="block text-sm font-medium">Akses aktif</span>
                  <span className="block text-xs text-muted-foreground">Bila dimatikan, pelanggan tidak bisa masuk ke portal.</span>
                </span>
                <Switch checked={active} onCheckedChange={setActive} />
              </label>
              <DialogFooter className="gap-2 sm:justify-between">
                {account ? (
                  <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove} disabled={pending}>
                    <Trash2 />
                    {confirmDelete ? "Klik lagi untuk menghapus" : "Hapus akses"}
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
        </DialogContent>
      </Dialog>
    </>
  );
}
