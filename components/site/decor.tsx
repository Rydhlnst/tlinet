import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Menampilkan judul dengan satu bagiannya bergradasi biru. Bila `accent` tidak ada di dalam judul, judul tampil polos. */
export function AccentText({ text, accent, accentClassName }: { text: string; accent?: string; accentClassName?: string }) {
  const at = accent ? text.indexOf(accent) : -1;
  if (!accent || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className={cn("bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent", accentClassName)}>{accent}</span>
      {text.slice(at + accent.length)}
    </>
  );
}

/** Label kecil di atas judul, diapit garis tipis. */
export function LinedEyebrow({ children, tone = "light", align = "center" }: { children: ReactNode; tone?: "light" | "dark"; align?: "center" | "left" }) {
  if (!children) return null;
  const line = cn("h-px w-8", tone === "dark" ? "bg-white/35" : "bg-primary/40");
  return (
    <p className={cn("flex items-center gap-4 text-xs font-semibold tracking-[0.2em] uppercase", tone === "dark" ? "text-white/80" : "text-brand-ink")}>
      {align === "center" ? <span className={line} aria-hidden="true" /> : <span className="size-2 rounded-full bg-primary ring-4 ring-primary/15" aria-hidden="true" />}
      {children}
      <span className={line} aria-hidden="true" />
    </p>
  );
}

/**
 * Latar bagian terang: lengkung tipis dan kisi titik dengan rona biru yang sama dengan hero.
 * Semuanya garis vektor, tanpa blur.
 */
export function SectionBackdrop({ flip = false, className }: { flip?: boolean; className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br from-brand-soft/70 via-background to-brand-soft/50", flip && "-scale-x-100", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" fill="none" className="absolute inset-0 size-full text-primary">
        <defs>
          <pattern id="backdrop-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="currentColor" />
          </pattern>
          <radialGradient id="backdrop-dots-fade" cx="0.5" cy="0.5" r="0.5">
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="backdrop-dots-mask">
            <rect x="1020" y="-40" width="420" height="300" fill="url(#backdrop-dots-fade)" />
          </mask>
        </defs>
        <rect x="1020" y="-40" width="420" height="300" fill="url(#backdrop-dots)" opacity="0.22" mask="url(#backdrop-dots-mask)" />
        <g stroke="currentColor" strokeWidth="1.4" opacity="0.1">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <path key={index} d={`M-60 ${520 + index * 26}C200 ${430 + index * 22} 380 ${700 + index * 14} 760 ${640 + index * 18}S1260 ${470 + index * 24} 1500 ${560 + index * 20}`} />
          ))}
        </g>
        <path d="M1180 -120A420 420 0 0 1 1560 320" stroke="currentColor" strokeWidth="1.4" opacity="0.12" />
        <circle cx="1392" cy="58" r="5" fill="currentColor" opacity="0.3" />
        <circle cx="64" cy="430" r="7" fill="currentColor" opacity="0.14" />
      </svg>
    </div>
  );
}
