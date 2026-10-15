import { cn } from "@/lib/utils";

/**
 * Peta Sulawesi bertitik-titik yang dibangun dari koordinat garis pantai (bujur, lintang) yang disederhanakan,
 * dengan kota utama dan garis backbone beranimasi. Dipakai sebagai ilustrasi, bukan peta presisi.
 */
const coast: [number, number][] = [
  [119.41, -5.14], [119.4, -5.45], [119.7, -5.68], [120.2, -5.56], [120.45, -5.6], [120.25, -5.12], [120.38, -4.55], [120.42, -3.8],
  [120.2, -3.0], [120.5, -2.65], [121.1, -2.63], [121.0, -3.5], [121.6, -4.05], [121.6, -4.6], [121.9, -4.85], [122.4, -4.75],
  [122.9, -4.4], [122.6, -3.97], [122.2, -3.3], [121.97, -2.55], [121.35, -2.0], [121.75, -1.75], [122.4, -1.4], [122.79, -0.95],
  [123.4, -0.85], [122.65, -0.8], [122.25, -0.9], [121.6, -0.87], [121.2, -1.0], [120.75, -1.39], [120.18, -0.8], [120.05, -0.2],
  [120.2, 0.3], [120.3, 0.5], [121.2, 0.45], [121.94, 0.47], [122.34, 0.5], [123.06, 0.5], [123.6, 0.3], [123.98, 0.39],
  [124.65, 0.8], [124.8, 0.95], [125.18, 1.44], [125.05, 1.72], [124.84, 1.49], [124.58, 1.19], [124.0, 0.95], [123.3, 0.92],
  [122.9, 0.85], [122.2, 1.0], [121.4, 1.17], [120.8, 1.05], [120.4, 0.8], [120.0, 0.4], [119.74, -0.67], [119.6, -1.1],
  [119.37, -1.17], [119.3, -1.9], [118.89, -2.68], [118.97, -3.54], [119.33, -3.42], [119.5, -3.8], [119.62, -4.0], [119.6, -4.4],
  [119.5, -4.8], [119.48, -5.0],
];

const SCALE = 50;
const WIDTH = 345;
const HEIGHT = 395;
const project = ([lng, lat]: [number, number]): [number, number] => [(lng - 118.6) * SCALE, (1.95 - lat) * SCALE];

const outline = coast.map(project);
const outlinePath = `M${outline.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;

const cities = [
  { name: "Makassar", at: [119.41, -5.14], label: "left" },
  { name: "Mamuju", at: [118.89, -2.68], label: "left" },
  { name: "Palu", at: [119.87, -0.9], label: "right" },
  { name: "Gorontalo", at: [123.06, 0.5], label: "below" },
  { name: "Manado", at: [124.84, 1.49], label: "above" },
  { name: "Kendari", at: [122.5, -3.97], label: "right" },
].map((city) => ({ ...city, point: project(city.at as [number, number]) }));

const point = (name: string) => cities.find((city) => city.name === name)!.point;
const arc = (from: string, to: string, bend: number) => {
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  // Titik kendali digeser tegak lurus dari garis lurus agar membentuk lengkung.
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

const links = [
  { d: arc("Makassar", "Mamuju", 0.18), duration: 4.2, delay: 0 },
  { d: arc("Mamuju", "Palu", 0.2), duration: 3.8, delay: 1.1 },
  { d: arc("Palu", "Gorontalo", -0.22), duration: 5, delay: 0.5 },
  { d: arc("Gorontalo", "Manado", -0.2), duration: 3.6, delay: 1.8 },
  { d: arc("Makassar", "Kendari", -0.3), duration: 5.4, delay: 0.9 },
  { d: arc("Palu", "Kendari", -0.35), duration: 6, delay: 2.4 },
  { d: arc("Makassar", "Palu", -0.12), duration: 6.6, delay: 1.4 },
];

/**
 * Titik-titik peta: kisi titik tiap 6 px yang dipotong garis pantai. Keterangan titik ((7x + 13y) mod 5) berulang tiap
 * 5 titik ke kanan dan ke bawah, jadi cukup satu ubin pola 30 px berisi 25 titik. Dulu ~900 elemen dan ~90 KB markup
 * per peta (dua kali lipat di data React); sekarang beberapa elemen saja.
 */
const DOT_STEP = 6;
const DOT_RADIUS = 1.9;
const TILE = DOT_STEP * 5;
const tileDots = Array.from({ length: 25 }, (_, index) => {
  const x = 3 + (index % 5) * DOT_STEP;
  const y = 3 + Math.floor(index / 5) * DOT_STEP;
  return { x, y, level: (x * 7 + y * 13) % 5 };
});

/** `id` membedakan pola titik bila ada lebih dari satu peta di halaman yang sama. */
type Props = { id: string; className?: string; labels?: boolean; tone?: "dark" | "light" };

export function SulawesiMap({ id, className, labels = false, tone = "dark" }: Props) {
  const dark = tone === "dark";
  const pattern = `sulawesi-dots-${id}`;
  const clip = `sulawesi-coast-${id}`;
  return (
    <svg viewBox={`-40 -10 ${WIDTH + 90} ${HEIGHT + 20}`} fill="none" aria-hidden="true" className={cn("overflow-visible", className)}>
      <defs>
        <pattern id={pattern} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {tileDots.map((dot) => (
            <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={DOT_RADIUS} fill={dark ? "#60a5fa" : "#3b82f6"} opacity={dark ? 0.35 + dot.level * 0.12 : 0.22 + dot.level * 0.08} />
          ))}
        </pattern>
        <clipPath id={clip}>
          <path d={outlinePath} />
        </clipPath>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${pattern})`} clipPath={`url(#${clip})`} />
      {links.map((link) => (
        <g key={link.d}>
          <path d={link.d} stroke={dark ? "rgb(147 207 255 / 0.4)" : "rgb(59 130 246 / 0.35)"} strokeWidth="1" />
          <path
            d={link.d}
            pathLength={1}
            strokeDasharray="0.18 0.82"
            strokeWidth="2"
            strokeLinecap="round"
            stroke={dark ? "#c4e7ff" : "#2563eb"}
            className="hero-arc"
            style={{ animationDuration: `${link.duration}s`, animationDelay: `${link.delay}s` }}
          />
        </g>
      ))}
      {cities.map((city, index) => {
        const [x, y] = city.point;
        const text = city.label === "left" ? { x: x - 10, anchor: "end" as const, y: y + 4 } : city.label === "right" ? { x: x + 10, anchor: "start" as const, y: y + 4 } : city.label === "above" ? { x, anchor: "middle" as const, y: y - 11 } : { x, anchor: "middle" as const, y: y + 20 };
        return (
          <g key={city.name}>
            <circle cx={x} cy={y} r="4" fill={dark ? "#e0f2fe" : "#2563eb"} className="hero-node" style={{ animationDelay: `${index * 0.4}s` }} />
            {labels && (
              <text
                x={text.x}
                y={text.y}
                textAnchor={text.anchor}
                fontSize="13"
                fontWeight="600"
                fill={dark ? "white" : "#0b1437"}
                stroke={dark ? "#0b1437" : "white"}
                strokeWidth="3"
                paintOrder="stroke"
              >
                {city.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
