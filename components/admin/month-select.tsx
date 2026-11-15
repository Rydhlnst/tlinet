"use client";

import { CalendarDays } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

/** Pemilih bulan di dashboard: mengganti `?bulan=` lalu memuat ulang data bulan itu. */
export function MonthSelect({ options, value }: { options: { value: string; label: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm shadow-sm">
      <CalendarDays className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">Lihat data bulan</span>
      <select
        value={value}
        onChange={(event) => router.push(event.target.value === options[0]?.value ? pathname : `${pathname}?bulan=${event.target.value}`)}
        className="rounded-md border border-input bg-background px-2 py-1 font-semibold text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
