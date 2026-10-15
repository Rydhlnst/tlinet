import { CalendarDays, CircleCheck, Clock, Wallet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { EntityDef } from "@/lib/cms/entities";
import { formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Row } from "./record-dialogs";

type Tone = "good" | "warn" | undefined;
type Stat = { label: string; value: number; hint: string; icon: LucideIcon; tone: Tone; extra?: ReactNode };

const iconTone = (tone: Tone) => (tone === "good" ? "bg-emerald-50 text-emerald-700" : tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-brand-soft text-brand-ink");

function Card({ label, value, hint, icon: Icon, tone, extra }: Stat) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", iconTone(tone))}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{formatRupiah(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {extra}
    </div>
  );
}

/** Versi ringkas untuk di dalam panel: satu baris angka tanpa kartu terpisah. */
function Cell({ label, value, hint, icon: Icon, tone }: Stat) {
  return (
    <div className="flex items-start gap-3 bg-card px-5 py-4">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", iconTone(tone))}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-semibold tabular-nums">{formatRupiah(value)}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/**
 * Rangkuman nominal: total, yang sudah lunas, yang belum, dan bulan terbaru.
 * Dihitung dari baris yang diberikan, jadi di tabel yang bisa dicari angkanya ikut menyempit.
 */
export function AmountSummary({ summary, rows, variant = "cards" }: { summary: NonNullable<EntityDef["summary"]>; rows: Row[]; variant?: "cards" | "strip" }) {
  const { paidLabel = "Sudah lunas", unpaidLabel = "Belum lunas", periodLabel = "Tagihan" } = summary;
  const amountOf = (row: Row) => Number(row[summary.amountKey]) || 0;
  const sum = (list: Row[]) => list.reduce((total, row) => total + amountOf(row), 0);
  // Bulan diambil dari tujuh huruf pertama, jadi kolom bulan ("2026-10") dan tanggal ("2026-10-12") sama-sama bisa.
  const monthOf = (row: Row) => String(row[summary.periodKey] ?? "").slice(0, 7);
  const paid = rows.filter((row) => row[summary.statusKey] === "paid");
  const unpaid = rows.filter((row) => row[summary.statusKey] !== "paid");
  const total = sum(rows);
  const paidTotal = sum(paid);
  const latest = rows.reduce((max, row) => (monthOf(row) > max ? monthOf(row) : max), "");
  const latestRows = rows.filter((row) => monthOf(row) === latest);
  const share = total > 0 ? Math.round((paidTotal / total) * 100) : 0;

  const stats: Stat[] = [
    {
      label: "Total nominal",
      value: total,
      hint: `${rows.length} transaksi · ${share}% ${paidLabel.replace(/^sudah /i, "").toLowerCase()}`,
      icon: Wallet,
      tone: undefined,
      extra: (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100" aria-hidden="true">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${share}%` }} />
        </div>
      ),
    },
    { label: paidLabel, value: paidTotal, hint: `${paid.length} transaksi`, icon: CircleCheck, tone: "good" },
    { label: unpaidLabel, value: sum(unpaid), hint: `${unpaid.length} transaksi`, icon: Clock, tone: "warn" },
    {
      label: latest ? `${periodLabel} ${formatMonth(latest)}` : `${periodLabel} terbaru`,
      value: sum(latestRows),
      hint: latest ? `${latestRows.length} transaksi di bulan terbaru` : "Belum ada data",
      icon: CalendarDays,
      tone: undefined,
    },
  ];

  if (variant === "strip") {
    return (
      // Garis antarsel berasal dari latar yang terlihat lewat celah 1px.
      <div className="grid gap-px border-b bg-border sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Cell key={stat.label} {...stat} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} {...stat} />
      ))}
    </div>
  );
}
