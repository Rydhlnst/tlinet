import { CalendarDays, CircleCheck, Clock, Wallet, type LucideIcon } from "lucide-react";
import type { EntityDef } from "@/lib/cms/entities";
import { formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Row } from "./record-dialogs";

function Stat({ label, value, hint, icon: Icon, tone, children }: { label: string; value: number; hint: string; icon: LucideIcon; tone?: "good" | "warn"; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            tone === "good" ? "bg-emerald-50 text-emerald-700" : tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-brand-soft text-brand-ink",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{formatRupiah(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

/**
 * Rangkuman nominal di atas tabel: total, yang sudah lunas, yang belum, dan bulan tagihan terbaru.
 * Dihitung dari baris yang sedang tampil, jadi ikut menyempit saat tabel dicari.
 */
export function AmountSummary({ summary, rows }: { summary: NonNullable<EntityDef["summary"]>; rows: Row[] }) {
  const amountOf = (row: Row) => Number(row[summary.amountKey]) || 0;
  const sum = (list: Row[]) => list.reduce((total, row) => total + amountOf(row), 0);
  const paid = rows.filter((row) => row[summary.statusKey] === "paid");
  const unpaid = rows.filter((row) => row[summary.statusKey] !== "paid");
  const total = sum(rows);
  const paidTotal = sum(paid);
  const latest = rows.reduce((max, row) => (String(row[summary.periodKey] ?? "") > max ? String(row[summary.periodKey]) : max), "");
  const latestRows = rows.filter((row) => row[summary.periodKey] === latest);
  const share = total > 0 ? Math.round((paidTotal / total) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Total nominal" value={total} hint={`${rows.length} transaksi · ${share}% sudah lunas`} icon={Wallet}>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100" aria-hidden="true">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${share}%` }} />
        </div>
      </Stat>
      <Stat label="Sudah lunas" value={paidTotal} hint={`${paid.length} transaksi`} icon={CircleCheck} tone="good" />
      <Stat label="Belum lunas" value={sum(unpaid)} hint={`${unpaid.length} transaksi`} icon={Clock} tone="warn" />
      <Stat
        label={latest ? `Tagihan ${formatMonth(latest)}` : "Bulan terbaru"}
        value={sum(latestRows)}
        hint={latest ? `${latestRows.length} transaksi di bulan tagihan terbaru` : "Belum ada data"}
        icon={CalendarDays}
      />
    </div>
  );
}
