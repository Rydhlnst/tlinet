"use client";

import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChartSpec, ChartTone } from "@/lib/ai/types";

/** Grafik yang dirender di panel chat AI dari ChartSpec yang dikembalikan sebuah tool. Mendukung batang dan donat. */

const barTone: Record<ChartTone, { bar: string; dot: string }> = {
  blue: { bar: "from-blue-600 to-blue-400", dot: "bg-blue-500" },
  green: { bar: "from-emerald-600 to-emerald-400", dot: "bg-emerald-500" },
  red: { bar: "from-rose-600 to-rose-400", dot: "bg-rose-500" },
  amber: { bar: "from-amber-500 to-amber-300", dot: "bg-amber-500" },
  purple: { bar: "from-violet-600 to-violet-400", dot: "bg-violet-500" },
};
const donutStroke: Record<ChartTone, string> = {
  blue: "stroke-blue-500",
  green: "stroke-emerald-500",
  red: "stroke-rose-500",
  amber: "stroke-amber-500",
  purple: "stroke-violet-500",
};
const dotColor: Record<ChartTone, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  amber: "bg-amber-500",
  purple: "bg-violet-500",
};

function fmt(value: number, unit?: "rupiah" | "number") {
  if (unit === "rupiah") return value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : value.toLocaleString("id-ID");
  return value.toLocaleString("id-ID");
}

function BarChart({ spec }: { spec: Extract<ChartSpec, { kind: "bar" }> }) {
  const all = spec.series.flatMap((series) => series.values);
  const max = Math.max(1, ...all);
  const power = 10 ** Math.floor(Math.log10(max));
  const top = ([1, 2, 5, 10].find((step) => step * power >= max) ?? 10) * power;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => top * fraction);
  const full = (value: number) => (spec.unit === "rupiah" ? formatRupiah(value) : value.toLocaleString("id-ID"));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {spec.series.map((series) => (
          <span key={series.label} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", barTone[series.tone ?? "blue"].dot)} /> {series.label}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex h-40 flex-col justify-between pb-6 text-right text-[10px] text-muted-foreground tabular-nums">
          {ticks.map((tick, index) => (
            <span key={index} className="-translate-y-1/2 leading-none">
              {fmt(tick, spec.unit)}
            </span>
          ))}
        </div>
        <div className="relative grid h-40 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${spec.categories.length}, minmax(0, 1fr))` }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((_, index) => (
              <span key={index} className="border-t border-dashed border-border" />
            ))}
          </div>
          {spec.categories.map((category, column) => (
            <div key={category} className="relative flex flex-col items-center">
              <div className="flex h-[calc(100%-1.5rem)] w-full items-end justify-center gap-1">
                {spec.series.map((series) => (
                  <div
                    key={series.label}
                    className={cn("w-full max-w-6 rounded-t bg-gradient-to-t", barTone[series.tone ?? "blue"].bar)}
                    style={{ height: `${Math.max(0, (series.values[column] ?? 0) / top) * 100}%` }}
                    title={`${series.label}: ${full(series.values[column] ?? 0)}`}
                  />
                ))}
              </div>
              <span className="mt-2 truncate text-[10px] whitespace-nowrap text-muted-foreground">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonutChart({ spec }: { spec: Extract<ChartSpec, { kind: "donut" }> }) {
  const total = spec.segments.reduce((sum, segment) => sum + segment.value, 0);
  const circumference = 2 * Math.PI * 42;
  let offset = 0;
  const full = (value: number) => (spec.unit === "rupiah" ? formatRupiah(value) : value.toLocaleString("id-ID"));
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <div className="relative size-32">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="12" className="stroke-muted" />
          {spec.segments.map((segment) => {
            const fraction = total ? segment.value / total : 0;
            const dash = `${fraction * circumference} ${circumference}`;
            const element = (
              <circle
                key={segment.label}
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="12"
                className={donutStroke[segment.tone ?? "blue"]}
                strokeDasharray={dash}
                strokeDashoffset={-offset * circumference}
              />
            );
            offset += fraction;
            return element;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{spec.unit === "rupiah" ? fmt(total, "rupiah") : total}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {spec.segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", dotColor[segment.tone ?? "blue"])} />
            <span className="w-24">{segment.label}</span>
            <span className="font-semibold tabular-nums">
              {full(segment.value)} {total ? `(${Math.round((segment.value / total) * 100)}%)` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChatChart({ spec }: { spec: ChartSpec }) {
  return (
    <figure className="my-2 rounded-xl border bg-card p-3">
      {spec.title && <figcaption className="mb-2 text-xs font-semibold text-muted-foreground">{spec.title}</figcaption>}
      {spec.kind === "bar" ? <BarChart spec={spec} /> : <DonutChart spec={spec} />}
    </figure>
  );
}
