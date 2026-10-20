import { cn } from "@/lib/utils";

/** Menara transmisi rangka baja (garis), digambar dalam kotak 60 × 150 dengan kaki di bawah. */
function Tower({ x, y, scale = 1, stroke }: { x: number; y: number; scale?: number; stroke: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={stroke} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Kaki dan badan */}
      <path d="M8 150 L26 20 M52 150 L34 20 M26 20 L30 4 L34 20" />
      {/* Silang rangka */}
      <path d="M10 136 L48 112 M50 136 L12 112 M13 112 L46 90 M47 112 L14 90 M15 90 L44 70 M45 90 L16 70 M17 70 L42 52 M43 70 L18 52 M19 52 L40 36 M41 52 L20 36" />
      <path d="M12 112 H48 M14 90 H46 M16 70 H44 M18 52 H42 M20 36 H40" />
      {/* Lengan antena */}
      <path d="M8 52 H52 M12 36 H48" />
      <path d="M8 52 v6 M52 52 v6 M12 36 v6 M48 36 v6" />
      <circle cx="30" cy="4" r="2.4" fill={stroke} />
    </g>
  );
}

/**
 * Ilustrasi latar dashboard: siluet kota, menara pemancar, dan garis cahaya data. Dipakai di banner judul halaman dan
 * kaki sidebar. `tone="night"` untuk latar biru gelap (banner Ringkasan dan tema gelap).
 */
export function TowerScene({ className, tone = "day", tower = true, idPrefix = "scene" }: { className?: string; tone?: "day" | "night"; tower?: boolean; idPrefix?: string }) {
  // Tanpa useId supaya bisa dirender di Server Component; dua ilustrasi di satu halaman diberi idPrefix berbeda.
  const id = `tl-${idPrefix}-${tone}`;
  const night = tone === "night";
  const city = night ? "rgba(96,165,250,0.35)" : "rgba(59,130,246,0.18)";
  const cityFront = night ? "rgba(147,197,253,0.45)" : "rgba(59,130,246,0.28)";
  const stroke = night ? "rgba(191,219,254,0.95)" : "rgba(30,64,175,0.75)";

  return (
    <svg viewBox="0 0 420 160" preserveAspectRatio="xMaxYMax meet" className={cn("pointer-events-none select-none", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={night ? "#60a5fa" : "#3b82f6"} stopOpacity="0" />
          <stop offset="60%" stopColor={night ? "#93c5fd" : "#60a5fa"} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={night ? "#3b82f6" : "#93c5fd"} stopOpacity="0.55" />
          <stop offset="100%" stopColor={night ? "#3b82f6" : "#93c5fd"} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="300" cy="70" rx="110" ry="70" fill={`url(#${id}-glow)`} />

      {/* Kota belakang */}
      <path
        fill={city}
        d="M40 160 V118 h14 v-10 h10 v10 h12 V96 h16 v64 Z M100 160 V84 h18 v-8 h6 v8 h14 v76 Z M150 160 V106 h20 v54 Z M176 160 V70 h12 v-10 h8 v10 h12 v90 Z M218 160 V100 h22 v60 Z M330 160 V92 h16 v-6 h8 v6 h14 v68 Z M372 160 V112 h20 v48 Z M396 160 V80 h18 v80 Z"
      />
      {/* Kota depan */}
      <path fill={cityFront} d="M70 160 V128 h18 v32 Z M126 160 V120 h16 v40 Z M200 160 V124 h22 v36 Z M244 160 V134 h26 v26 Z M314 160 V126 h20 v34 Z M352 160 V136 h22 v24 Z" />

      {/* Garis cahaya data menuju menara */}
      <g fill="none" strokeLinecap="round">
        <path d="M120 150 C 200 140, 250 110, 300 60" stroke={`url(#${id}-beam)`} strokeWidth="2" />
        <path d="M60 156 C 170 150, 250 120, 310 72" stroke={`url(#${id}-beam)`} strokeWidth="1.4" opacity="0.8" />
        <path d="M180 158 C 240 150, 300 120, 360 40" stroke={`url(#${id}-beam)`} strokeWidth="1.2" opacity="0.7" />
        <path d="M230 160 C 290 150, 330 110, 400 70" stroke={`url(#${id}-beam)`} strokeWidth="1" opacity="0.55" />
      </g>
      <g fill={night ? "#bfdbfe" : "#60a5fa"}>
        <circle cx="300" cy="60" r="2.2" />
        <circle cx="360" cy="40" r="1.6" />
        <circle cx="400" cy="70" r="1.4" />
        <circle cx="250" cy="100" r="1.2" opacity="0.7" />
      </g>

      {tower && <Tower x={270} y={8} scale={1} stroke={stroke} />}
    </svg>
  );
}
