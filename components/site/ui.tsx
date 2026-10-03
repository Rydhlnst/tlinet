import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AccentText, LinedEyebrow } from "./decor";
import { NodeField } from "./node-field";

const linkButtonVariants = {
  primary: "bg-primary text-primary-foreground shadow-[0_10px_28px_-10px] shadow-primary/80 hover:brightness-110",
  brand: "bg-primary text-primary-foreground shadow-[0_10px_28px_-10px] shadow-primary/80 hover:brightness-110",
  ink: "bg-ink text-white shadow-[0_10px_28px_-14px] shadow-ink/80 hover:bg-ink/90",
  soft: "bg-brand-soft text-brand-ink hover:bg-primary hover:text-primary-foreground",
  outline: "border border-border bg-background text-foreground hover:border-primary/50 hover:text-primary",
  white: "bg-white text-ink shadow-[0_10px_28px_-12px] shadow-black/40 hover:bg-white/90",
  glass: "border border-white/20 bg-white/5 text-white backdrop-blur hover:border-white/35 hover:bg-white/10",
};

const linkButtonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0";

export const linkButtonClass = (variant: keyof typeof linkButtonVariants = "primary", className?: string) =>
  cn(linkButtonBase, linkButtonVariants[variant], className);

const isExternal = (href: string) => /^(https?:|mailto:|tel:)/i.test(href);

/** Tautan bergaya tombol. Tautan keluar dibuka di tab baru. */
export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: { href: string; variant?: keyof typeof linkButtonVariants; children: ReactNode } & Omit<ComponentProps<"a">, "href">) {
  const classes = linkButtonClass(variant, className);
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

export function SmartLink({ href, children, ...props }: { href: string; children: ReactNode } & Omit<ComponentProps<"a">, "href">) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p className={cn("inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-brand-ink uppercase", className)}>
      <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  titleAccent,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Bagian judul yang diberi gradasi biru. */
  titleAccent?: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-3xl flex-col gap-4", align === "center" ? "mx-auto items-center text-center" : "items-start", className)}>
      <LinedEyebrow align={align}>{eyebrow}</LinedEyebrow>
      <h2 className="text-3xl leading-[1.12] font-bold sm:text-4xl lg:text-[2.75rem]">
        <AccentText text={title} accent={titleAccent} />
      </h2>
      {description && <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">{description}</p>}
    </div>
  );
}

/** Hero halaman dalam: judul besar di atas kisi halus. */
export function PageHero({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="surface-ink hero-under-header relative overflow-hidden text-white">
      <NodeField tone="dark" className="[mask-image:linear-gradient(to_bottom,black_45%,transparent)]" />
      <div className="container-page relative flex flex-col items-center gap-5 py-20 text-center sm:py-24">
        {eyebrow && <span className="text-xs font-semibold tracking-[0.22em] text-white/75 uppercase">{eyebrow}</span>}
        <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold sm:text-5xl">{title}</h1>
        {description && <p className="max-w-2xl text-base leading-relaxed text-pretty text-white/70 sm:text-lg">{description}</p>}
        {children}
      </div>
    </section>
  );
}

/** Gambar dari CMS: sumbernya bisa R2, /media, atau URL luar, sehingga tidak lewat next/image. */
export function CmsImage({ alt, className, ...props }: ComponentProps<"img">) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt ?? ""} loading="lazy" decoding="async" className={className} {...props} />;
}
