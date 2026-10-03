import { useId } from "react";
import { cn } from "@/lib/utils";
import { CmsImage } from "./ui";

/** Lambang TLINET: titik dan kapsul miring bergradasi biru. */
export function BrandMark({ className }: { className?: string }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8 shrink-0", className)} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="4" y1="4" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3d9bff" />
          <stop offset="1" stopColor="#1f3fff" />
        </linearGradient>
      </defs>
      <circle cx="9.5" cy="9.5" r="7.5" fill={`url(#${gradient})`} />
      <path d="M14.5 32 L30 8.5" stroke={`url(#${gradient})`} strokeWidth="13" strokeLinecap="round" />
    </svg>
  );
}

type BrandProps = {
  name: string;
  logoUrl: string;
  /** Akhiran nama yang diberi warna biru, mis. "NET" pada "TLINET". */
  highlight?: string;
  inverted?: boolean;
  className?: string;
  highlightClassName?: string;
};

/** Logo dari CMS bila ada; jika tidak, lambang dan nama merek. */
export function Brand({ name, logoUrl, highlight = "", inverted = false, className, highlightClassName }: BrandProps) {
  if (logoUrl) return <CmsImage src={logoUrl} alt={name} loading="eager" className={cn("h-8 w-auto", className)} />;

  const cut = highlight && name.toLowerCase().endsWith(highlight.toLowerCase()) ? name.length - highlight.length : name.length;
  return (
    <span className={cn("inline-flex items-center gap-2 text-xl font-bold tracking-[0.03em]", inverted && "text-white", className)}>
      <BrandMark />
      <span>
        {name.slice(0, cut)}
        <span
          className={cn("bg-gradient-to-r bg-clip-text text-transparent", inverted ? "from-sky-300 to-brand" : "from-brand to-primary", highlightClassName)}
        >
          {name.slice(cut)}
        </span>
      </span>
    </span>
  );
}
