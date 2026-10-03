import type { CSSProperties } from "react";

/**
 * Garis jaringan beranimasi di atas peta pada foto latar hero. Koordinatnya mengikuti titik-titik terang
 * peta di `public/images/hero-bg.jpg` (1600×668), dan `preserveAspectRatio` disamakan dengan
 * `object-cover object-right` pada fotonya agar keduanya selalu berimpit.
 */
const arcs = [
  { d: "M420 12 Q540 30 688 188", duration: 5.2, delay: 0 },
  { d: "M392 68 Q470 66 584 156", duration: 4.4, delay: 1.6 },
  { d: "M520 88 Q660 -6 808 84", duration: 5.8, delay: 0.8 },
  { d: "M688 188 Q726 104 808 84", duration: 3.8, delay: 2.2 },
  { d: "M688 188 Q790 96 876 104", duration: 4.6, delay: 0.4 },
  { d: "M876 104 Q962 64 1040 156", duration: 4.2, delay: 1.2 },
  { d: "M1040 156 Q1160 86 1276 168", duration: 5, delay: 2.8 },
  { d: "M808 84 Q1030 -34 1260 56", duration: 6.4, delay: 1.9 },
  { d: "M688 188 Q1010 14 1352 308", duration: 7.2, delay: 0.2 },
  { d: "M288 124 Q470 36 688 188", duration: 6, delay: 3.1 },
];

const nodes: [number, number][] = [
  [688, 188],
  [808, 84],
  [876, 104],
  [1040, 156],
  [1276, 168],
  [1260, 56],
  [520, 88],
  [420, 12],
  [584, 156],
  [392, 68],
];

export function HeroArcs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 668" preserveAspectRatio="xMaxYMid slice" fill="none" aria-hidden="true" className={className}>
      {arcs.map((arc) => (
        <g key={arc.d}>
          <path d={arc.d} stroke="rgb(147 207 255 / 0.3)" strokeWidth="1.2" />
          <path
            d={arc.d}
            pathLength={1}
            strokeDasharray="0.16 0.84"
            strokeWidth="2.2"
            strokeLinecap="round"
            stroke="#a9defe"
            className="hero-arc"
            style={{ animationDuration: `${arc.duration}s`, animationDelay: `${arc.delay}s` } as CSSProperties}
          />
        </g>
      ))}
      {nodes.map(([x, y], index) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" fill="#d3eeff" className="hero-node" style={{ animationDelay: `${(index % 5) * 0.5}s` }} />
      ))}
    </svg>
  );
}
