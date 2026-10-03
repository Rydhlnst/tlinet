import { Mail, MapPin, Phone } from "lucide-react";
import type { LinkItem, SiteSettings } from "@/lib/content/types";
import { whatsappUrl } from "@/lib/format";
import { Brand } from "./brand";
import { SmartLink } from "./ui";

function LinkColumn({ title, links }: { title: string; links: LinkItem[] }) {
  if (!links.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">{title}</h3>
      <ul className="mt-5 flex flex-col gap-3 text-sm">
        {links.map((link) => (
          <li key={link.label + link.href}>
            <SmartLink href={link.href} className="text-white/75 transition-colors hover:text-white">
              {link.label}
            </SmartLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const pageLinks = settings.navLinks.filter((link) => !link.href.includes("#"));
  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="flex flex-col gap-5">
          <Brand name={settings.brandName} highlight={settings.brandHighlight} logoUrl={settings.logoUrl} inverted />
          <p className="max-w-sm text-sm leading-relaxed text-white/65">{settings.footerDescription}</p>
          {settings.socialLinks.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {settings.socialLinks.map((link) => (
                <li key={link.label + link.href}>
                  <SmartLink
                    href={link.href}
                    className="inline-flex rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {link.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        <LinkColumn title="Navigasi" links={pageLinks} />
        <LinkColumn title="Layanan" links={settings.footerServices} />
        <div>
          <h3 className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">Kontak & Lokasi</h3>
          <ul className="mt-5 flex flex-col gap-4 text-sm text-white/75">
            {settings.address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-sky-300" />
                <span className="leading-relaxed">{settings.address}</span>
              </li>
            )}
            {settings.phone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-sky-300" />
                <a
                  href={whatsappUrl(settings.whatsappNumber, settings.whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-sky-300" />
                <a href={`mailto:${settings.email}`} className="hover:text-white">
                  {settings.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.brandName}. Semua hak dilindungi.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {settings.footerLegal.map((link) => (
              <li key={link.label + link.href}>
                <SmartLink href={link.href} className="transition-colors hover:text-white">
                  {link.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
