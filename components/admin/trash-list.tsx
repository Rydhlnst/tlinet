"use client";

import { ArchiveRestore, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { emptyTrashAction, purgeTrashAction, restoreTrashAction } from "@/app/admin/trash-actions";
import { Button } from "@/components/ui/button";
import type { SaveResult } from "@/lib/cms/store";
import type { TrashEntry } from "@/lib/trash";
import { ConfirmDeleteDialog } from "./confirm-delete";

const dateFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Sisa hari sebelum data dibuang otomatis. */
const daysLeft = (deletedAt: number, retention: number) => Math.max(0, Math.ceil(retention - (Date.now() - deletedAt) / 86_400_000));

/** Daftar Tempat Sampah: kembalikan (semua pengguna sesuai hak akses), hapus permanen dan kosongkan (owner). */
export function TrashList({ items, owner, retention }: { items: TrashEntry[]; owner: boolean; retention: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState("");
  const [purging, setPurging] = useState<TrashEntry | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [filter, setFilter] = useState("");

  function run(key: string, action: () => Promise<SaveResult>, after?: () => void) {
    setBusy(key);
    startTransition(async () => {
      const result = await action();
      setBusy("");
      if (result.ok) {
        toast.success(result.message);
        after?.();
        router.refresh();
      } else toast.error(result.message);
    });
  }

  const kinds = [...new Map(items.map((item) => [item.kind, item.label])).entries()];
  const shown = filter ? items.filter((item) => item.kind === filter) : items;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)]">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Saring jenis data" className="h-10 rounded-xl border bg-background px-3 text-sm">
          <option value="">Semua jenis ({items.length})</option>
          {kinds.map(([kind, label]) => (
            <option key={kind} value={kind}>
              {label} ({items.filter((item) => item.kind === kind).length})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Dibuang otomatis setelah {retention} hari.</p>
        {owner && items.length > 0 && (
          <Button variant="outline" className="ml-auto h-10 rounded-xl text-destructive hover:text-destructive" disabled={pending} onClick={() => setEmptying(true)}>
            <Trash2 />
            Kosongkan
          </Button>
        )}
      </div>

      <ul className="divide-y">
        {shown.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{item.label}</span>
                <span className="font-semibold break-words">{item.title}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Dihapus {dateFormat.format(item.deletedAt)} WITA{item.deletedBy && ` oleh ${item.deletedBy}`}
                {item.rows > 1 && ` · termasuk ${item.rows - 1} data terkait`} · sisa {daysLeft(item.deletedAt, retention)} hari
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button className="rounded-full" disabled={pending} onClick={() => run(`restore-${item.id}`, () => restoreTrashAction(item.id))}>
                {busy === `restore-${item.id}` ? <LoaderCircle className="animate-spin" /> : <ArchiveRestore />}
                Kembalikan
              </Button>
              {owner && (
                <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" disabled={pending} onClick={() => setPurging(item)} aria-label={`Hapus permanen ${item.title}`} title="Hapus permanen">
                  <Trash2 />
                </Button>
              )}
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="flex flex-col items-center gap-2 px-4 py-16 text-center text-sm text-muted-foreground">
            <Trash2 className="size-6" />
            Tempat Sampah kosong.
          </li>
        )}
      </ul>

      <ConfirmDeleteDialog
        open={purging !== null}
        title={purging ? `${purging.label.toLowerCase()} ini untuk selamanya` : "data ini"}
        description={purging ? `“${purging.title}” tidak bisa dikembalikan lagi setelah ini.` : undefined}
        confirmLabel="Ya, hapus permanen"
        pending={busy.startsWith("purge-")}
        onCancel={() => setPurging(null)}
        onConfirm={() => purging && run(`purge-${purging.id}`, () => purgeTrashAction(purging.id), () => setPurging(null))}
      />
      <ConfirmDeleteDialog
        open={emptying}
        title={`semua ${items.length} data di Tempat Sampah untuk selamanya`}
        description="Semua isi Tempat Sampah tidak bisa dikembalikan lagi setelah ini."
        confirmLabel="Ya, kosongkan"
        pending={busy === "empty"}
        onCancel={() => setEmptying(false)}
        onConfirm={() => run("empty", () => emptyTrashAction(), () => setEmptying(false))}
      />
    </div>
  );
}
