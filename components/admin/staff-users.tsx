"use client";

import { Check, Copy, KeyRound, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteStaffUserAction, saveStaffUserAction } from "@/app/admin/users-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { permissionDefs } from "@/lib/permissions";

export type StaffUserView = { id: string; email: string; name: string; permissions: string[]; active: boolean };

// Tanpa huruf/angka yang mirip (0/O, 1/l/I) supaya mudah diketik ulang.
const passwordAlphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomPassword = () => Array.from(crypto.getRandomValues(new Uint32Array(12)), (value) => passwordAlphabet[value % passwordAlphabet.length]).join("");

/** Tombol "Tambah pengguna" (tanpa `user`) atau "Ubah" untuk satu akun staf, beserta dialognya. */
export function StaffUserButton({ user, loginUrl }: { user?: StaffUserView; loginUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Setelah disimpan, dialog menampilkan data masuk untuk disalin dan dikirim ke staf.
  const [saved, setSaved] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setEmail(user?.email ?? "");
    setName(user?.name ?? "");
    setPassword(user ? "" : randomPassword());
    setPermissions(user?.permissions ?? ["customers"]);
    setActive(user?.active ?? true);
    setConfirmDelete(false);
    setSaved(null);
    setCopied(false);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveStaffUserAction(user?.id ?? null, { email, name, password, permissions, active });
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
    if (!user) return;
    startTransition(async () => {
      const result = await deleteStaffUserAction(user.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  const credentials = saved ? [`Login dashboard TLINET: ${loginUrl}`, `Email: ${saved.email}`, ...(saved.password ? [`Kata sandi: ${saved.password}`] : [])].join("\n") : "";

  return (
    <>
      {user ? (
        <Button variant="outline" size="sm" onClick={openDialog}>
          <Pencil />
          Ubah
        </Button>
      ) : (
        <Button size="lg" onClick={openDialog}>
          <Plus />
          Tambah pengguna
        </Button>
      )}
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{user ? "Ubah pengguna" : "Tambah pengguna"}</DialogTitle>
            <DialogDescription>Pengguna staf masuk lewat halaman login dashboard dan hanya melihat menu yang dicentang di bawah.</DialogDescription>
          </DialogHeader>

          {saved ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">{saved.password ? "Kirim data masuk ini ke pengguna. Kata sandi tidak bisa dilihat lagi setelah dialog ditutup." : "Perubahan tersimpan. Kata sandi tidak diubah."}</p>
              <pre className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">{credentials}</pre>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(credentials);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Tersalin" : "Salin"}
                </Button>
                <Button onClick={() => setOpen(false)}>Selesai</Button>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="staff-name">Nama</Label>
                  <Input id="staff-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="mis. Gunawan" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input id="staff-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="staff-password">{user ? "Kata sandi baru (kosongkan bila tidak diganti)" : "Kata sandi"}</Label>
                <div className="flex gap-2">
                  <Input id="staff-password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="font-mono" />
                  <Button type="button" variant="outline" onClick={() => setPassword(randomPassword())} title="Buat kata sandi acak">
                    <KeyRound />
                    Acak
                  </Button>
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Hak akses</legend>
                {permissionDefs.map((item) => {
                  const checked = permissions.includes(item.key);
                  return (
                    <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => setPermissions((current) => (next ? [...current, item.key] : current.filter((key) => key !== item.key)))}
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        <span className="font-medium">{item.label}</span>
                        {"help" in item && <span className="block text-xs text-muted-foreground">{item.help}</span>}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium">Akun aktif</span>
                  <span className="block text-xs text-muted-foreground">Akun nonaktif tidak bisa masuk; sesinya langsung berakhir.</span>
                </span>
                <Switch checked={active} onCheckedChange={setActive} />
              </label>

              <DialogFooter className="gap-2 sm:justify-between">
                {user ? (
                  confirmDelete ? (
                    <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
                      Yakin hapus?
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                      <Trash2 />
                      Hapus
                    </Button>
                  )
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
