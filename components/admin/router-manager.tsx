"use client";

import { ExternalLink, LoaderCircle, Pencil, Plus, Router, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteRouterAction, saveRouterAction } from "@/app/admin/webfig-actions";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LinkItem } from "@/lib/content/types";
import { validateRouter } from "@/lib/router-links";

type Editing = { index: number | null; label: string; href: string };

/**
 * Daftar router WebFig di halaman Winbox. Admin dengan hak Pengaturan bisa menambah, mengubah, dan menghapus langsung
 * dari sini (juga dari HP); perubahannya langsung aktif tanpa draf.
 */
export function RouterManager({ routers, canEdit }: { routers: LinkItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<{ index: number; item: LinkItem } | null>(null);
  const [pending, startTransition] = useTransition();

  function openEditor(index: number | null) {
    const item = index === null ? null : routers[index];
    setError("");
    setEditing({ index, label: item?.label ?? "", href: item?.href ?? "" });
  }

  function submit() {
    if (!editing) return;
    const checked = validateRouter(editing);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    startTransition(async () => {
      const result = await saveRouterAction(editing.index, checked.router);
      if (result.ok) {
        toast.success(result.message);
        setEditing(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  function confirmRemove() {
    if (!removing) return;
    startTransition(async () => {
      const result = await deleteRouterAction(removing.index, removing.item.href);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setRemoving(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <Button size="lg" className="w-full sm:w-auto" onClick={() => openEditor(null)}>
          <Plus />
          Tambah router
        </Button>
      )}

      {routers.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {routers.map((item, index) => (
            <li key={`${index}-${item.href}`} className="flex items-stretch overflow-hidden rounded-2xl border bg-card">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 flex-1 items-center gap-3 p-4 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink ring-1 ring-brand/10">
                  <Router className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.href}</span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-ink" />
              </a>
              {canEdit && (
                <div className="flex shrink-0 flex-col border-l">
                  <button
                    type="button"
                    onClick={() => openEditor(index)}
                    className="flex flex-1 items-center justify-center px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Ubah ${item.label}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving({ index, item })}
                    className="flex flex-1 items-center justify-center border-t px-3 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    aria-label={`Hapus ${item.label}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Router className="size-6" />
          </span>
          <p className="font-medium">Belum ada router</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {canEdit ? "Tekan Tambah router, isi nama dan alamat WebFig-nya." : "Minta admin dengan akses Pengaturan untuk menambahkan router."}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        WebFig dibuka di tab baru dan tetap meminta login RouterOS. Umumnya hanya bisa diakses dari jaringan internal/VPN router, atau lewat port tunnel
        yang diarahkan ke port web router (80), bukan port Winbox (8291).
      </p>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && !pending && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.index === null ? "Tambah router" : "Ubah router"}</DialogTitle>
            <DialogDescription>Alamat tanpa http:// otomatis dianggap http://.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="router-label">Nama router</Label>
              <Input
                id="router-label"
                value={editing?.label ?? ""}
                placeholder="mis. Router Kantor Bulukumba"
                autoComplete="off"
                onChange={(event) => setEditing((current) => current && { ...current, label: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="router-href">Alamat WebFig</Label>
              <Input
                id="router-href"
                value={editing?.href ?? ""}
                placeholder="http://192.168.88.1"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setEditing((current) => current && { ...current, href: event.target.value })}
              />
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <LoaderCircle className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={removing !== null}
        title={removing ? `router ${removing.item.label}` : "router ini"}
        description="Pintasan router dihapus dari daftar. Router MikroTik-nya sendiri tidak berubah."
        pending={pending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
