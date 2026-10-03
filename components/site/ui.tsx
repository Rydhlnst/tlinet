import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const linkButtonVariants = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/85",
  brand: "bg-brand text-brand-foreground shadow-sm shadow-brand/25 hover:brightness-105",
  outline: "border border-border bg-background text-foreground hover:bg-muted",
  white: "bg-white text-foreground hover:bg-white/90",
  glass: "border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/15",
};

const linkButtonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0";

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
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", align === "center" && "mx-auto items-center text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl leading-[1.15] font-semibold sm:text-4xl">{title}</h2>
      {description && <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">{description}</p>}
    </div>
  );
}

/** Hero halaman dalam: judul besar di atas kisi halus. */
export function PageHero({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-brand-soft to-background">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="container-page relative flex flex-col items-center gap-5 py-20 text-center sm:py-24">
        {eyebrow && (
          <span className="rounded-full border bg-background px-3.5 py-1 text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase shadow-xs">
            {eyebrow}
          </span>
        )}
        <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold sm:text-5xl">{title}</h1>
        {description && <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">{description}</p>}
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
