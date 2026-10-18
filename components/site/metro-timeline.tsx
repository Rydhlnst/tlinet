import { Check, CircleAlert } from "lucide-react";
import type { MetroStepRecord } from "@/lib/db/schema";
import { formatStepTime, metroKindLabels, metroProgress, type MetroKind, type MetroStatus } from "@/lib/metro";
import { cn } from "@/lib/utils";

export type MetroTimelineOrder = { kind: MetroKind; capacity: string; previousCapacity: string; steps: Record<string, MetroStepRecord>; status: MetroStatus; rejectReason: string; note: string };

/** Langkah persetujuan menampilkan siapa yang menyetujui. */
const approvalSteps = new Set(["approved", "approved_it"]);

/** Ringkasan satu progres: jenis, kapasitas, dan bilah kemajuan. */
export function MetroSummary({ order }: { order: MetroTimelineOrder }) {
  const progress = metroProgress(order.kind, order.steps);
  const rejected = order.status === "rejected";
  const done = order.status === "done";
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{metroKindLabels[order.kind]}</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight">{order.kind === "upgrade" ? `${order.previousCapacity || "—"} → ${order.capacity}` : order.capacity || "Layanan internet"}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", rejected ? "text-red-700" : done ? "text-emerald-700" : "text-brand-ink")}>
          <span className={cn("size-1.5 rounded-full", rejected ? "bg-red-500" : done ? "bg-emerald-500" : "bg-brand")} />
          {rejected ? "Ditolak" : done ? "Selesai" : "Sedang diproses"}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", rejected ? "bg-red-400" : done ? "bg-emerald-500" : "bg-brand")} style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
          {progress.completed}/{progress.total} langkah
        </span>
      </div>
    </div>
  );
}

/** Semua langkah satu progres, dari Registrasi/Permintaan sampai Selesai, dengan hari, tanggal, dan jam tiap langkah. */
export function MetroTimeline({ order }: { order: MetroTimelineOrder }) {
  const progress = metroProgress(order.kind, order.steps);
  const rejected = order.status === "rejected";

  return (
    <div className="flex flex-col gap-4">
      {order.note && <p className="rounded-lg bg-muted/70 px-3 py-2.5 text-sm">Catatan Anda: {order.note}</p>}
      {rejected && (
        <div className="flex gap-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">Pengajuan ditolak.</span> {order.rejectReason}
          </p>
        </div>
      )}
      <ol className="flex flex-col">
        {progress.steps.map((step, index) => {
          const current = step.state === "current" && !rejected;
          const last = index === progress.steps.length - 1;
          return (
            <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
              {!last && <span className={cn("absolute top-8 bottom-0 left-[0.9375rem] w-0.5 rounded-full", step.state === "done" ? "bg-emerald-200" : "bg-border")} aria-hidden="true" />}
              <span
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.state === "done" ? "bg-emerald-500 text-white" : current ? "bg-brand text-white ring-4 ring-brand/15" : "border-2 border-border bg-card text-muted-foreground",
                )}
              >
                {step.state === "done" ? <Check className="size-4" strokeWidth={3} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-sm font-semibold", step.state === "pending" && "text-muted-foreground")}>{step.label}</p>
                  {current && <span className="text-[11px] font-medium text-brand-ink">sedang diproses</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                {step.record && (
                  <p className="mt-1.5 text-xs font-medium text-foreground">
                    {formatStepTime(step.record.at)}
                    {approvalSteps.has(step.key) && <span className="font-normal text-muted-foreground"> · oleh {step.record.by}</span>}
                  </p>
                )}
                {step.record?.note && <p className="mt-1 rounded-lg bg-muted/70 px-3 py-2 text-xs">{step.record.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
