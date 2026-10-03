import { CmsImage } from "./ui";

type Stat = { value: string; label: string };

function StatTiles({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <dl className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-ink/55 text-left backdrop-blur-md">
      {stats.slice(0, 3).map((stat) => (
        <div key={stat.label} className="flex flex-col-reverse justify-end gap-1 px-4 py-4 sm:px-6">
          <dt className="text-[11px] leading-snug text-white/65 sm:text-xs">{stat.label}</dt>
          <dd className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Visual hero: foto dari CMS (ditampilkan utuh 16:9) atau ilustrasi jaringan fiber. Statistik selalu dari CMS. */
export function HeroVisual({ stats, imageUrl, alt }: { stats: Stat[]; imageUrl: string; alt: string }) {
  if (imageUrl) {
    return (
      <div className="relative w-full overflow-hidden rounded-[1.75rem] bg-ink shadow-2xl shadow-primary/25 ring-1 ring-ink/10 sm:rounded-[2rem]">
        <CmsImage src={imageUrl} alt={alt} loading="eager" fetchPriority="high" className="aspect-[16/9] w-full object-cover" />
        {/* Di layar kecil statistik berada di bawah foto agar tidak menutupinya. */}
        <div className="p-3 md:absolute md:inset-x-5 md:bottom-5 md:p-0">
          <StatTiles stats={stats} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-[2rem] bg-ink p-4 shadow-2xl shadow-primary/20 sm:min-h-[30rem] sm:p-5">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-[38%] left-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/35 blur-3xl" />
        <svg viewBox="0 0 480 480" className="absolute top-[38%] left-1/2 w-[125%] max-w-none -translate-x-1/2 -translate-y-1/2" fill="none">
          {[60, 110, 165, 225].map((radius, index) => (
            <circle key={radius} cx="240" cy="240" r={radius} stroke="white" strokeOpacity={0.16 - index * 0.03} />
          ))}
          <g stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8">
            <path d="M240 240 L352 150" />
            <path d="M240 240 L120 168" />
            <path d="M240 240 L176 372" />
            <path d="M240 240 L378 318" />
          </g>
          <g fill="white">
            <circle cx="352" cy="150" r="5" />
            <circle cx="120" cy="168" r="5" />
            <circle cx="176" cy="372" r="5" />
            <circle cx="378" cy="318" r="5" />
          </g>
          <circle cx="240" cy="240" r="26" fill="var(--brand)" fillOpacity="0.25" className="origin-center animate-ping [animation-duration:3s]" />
          <circle cx="240" cy="240" r="13" fill="var(--brand)" />
          <circle cx="240" cy="240" r="5" fill="white" />
        </svg>
      </div>
      <StatTiles stats={stats} />
    </div>
  );
}
