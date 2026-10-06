"use client";

import {
  BookOpenText,
  Calculator,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Handshake,
  Home,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  MapPinned,
  Newspaper,
  Package,
  ReceiptText,
  Search,
  Settings,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { BrandMark } from "@/components/site/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { accurateFeatures, accurateWebUrl } from "@/lib/accurate-features";

/** `external`: tautan ke luar dashboard, dibuka di tab baru. */
type NavItem = { href: string; label: string; icon: LucideIcon; keywords?: string; external?: boolean };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
      { href: "/admin/data/leads", label: "Prospek Masuk", icon: Inbox, keywords: "leads pendaftaran formulir whatsapp" },
    ],
  },
  {
    label: "Halaman",
    items: [
      { href: "/admin/pages/home", label: "Beranda", icon: Home, keywords: "hero keunggulan langkah" },
      { href: "/admin/pages/coverage", label: "Area Jangkauan", icon: MapPinned, keywords: "peta formulir cek" },
      { href: "/admin/pages/help", label: "Bantuan", icon: LifeBuoy, keywords: "pintasan kategori faq" },
      { href: "/admin/pages/about", label: "Tentang Kami", icon: BookOpenText, keywords: "visi misi nilai profil" },
      { href: "/admin/pages/news", label: "Berita", icon: FileText, keywords: "teks halaman berita" },
      { href: "/admin/pages/register", label: "Formulir Registrasi", icon: ClipboardList, keywords: "pendaftaran daftar" },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/admin/data/packages", label: "Paket Internet", icon: Package, keywords: "harga kecepatan produk" },
      { href: "/admin/data/package-categories", label: "Kategori Paket", icon: Tags, keywords: "rumah bisnis dedicated tab" },
      { href: "/admin/data/coverage-areas", label: "Titik Jangkauan", icon: MapPin, keywords: "peta koordinat area kota" },
      { href: "/admin/data/customers", label: "Data Pelanggan", icon: Users, keywords: "customer site id cid foto detail" },
      { href: "/admin/data/customer-payments", label: "History Pembayaran", icon: ReceiptText, keywords: "tagihan bayar lunas riwayat" },
      { href: "/admin/data/faqs", label: "FAQ", icon: CircleHelp, keywords: "pertanyaan jawaban" },
      { href: "/admin/data/articles", label: "Artikel Berita", icon: Newspaper, keywords: "blog tulisan" },
      { href: "/admin/data/clients", label: "Klien & Mitra", icon: Handshake, keywords: "logo marquee" },
    ],
  },
  {
    label: "Accurate",
    items: [
      { href: "/admin/accurate", label: "Pencatatan Accurate", icon: Calculator, keywords: "akuntansi pembukuan koneksi sinkron" },
      ...accurateFeatures.map((feature) => ({ href: accurateWebUrl, label: feature.label, icon: feature.icon, keywords: "accurate", external: true })),
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/admin/media", label: "Media", icon: FolderOpen, keywords: "gambar unggah foto r2" },
      { href: "/admin/pages/settings", label: "Pengaturan Situs", icon: Settings, keywords: "merek kontak whatsapp footer navigasi seo logo" },
    ],
  },
];

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

function AdminSidebar({ brandName, newLeads }: { brandName: string; newLeads: number }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <Link href="/admin" className="flex items-center gap-2 rounded-lg p-1.5 group-data-[collapsible=icon]:p-0">
          <BrandMark className="size-7" />
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">{brandName}</span>
          <span className="ml-auto rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
            CMS
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-medium tracking-wider uppercase">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, label, icon: Icon, external }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      asChild
                      tooltip={label}
                      isActive={!external && isActive(pathname, href)}
                      className="data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground"
                    >
                      {external ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpenMobile(false)}>
                          <Icon />
                          <span>{label}</span>
                          <ExternalLink className="ml-auto size-3.5! text-muted-foreground" aria-label="Buka di tab baru" />
                        </a>
                      ) : (
                        <Link href={href} onClick={() => setOpenMobile(false)}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                    {href === "/admin/data/leads" && newLeads > 0 && (
                      <SidebarMenuBadge className="rounded-full bg-brand px-1.5 text-brand-foreground peer-hover/menu-button:text-brand-foreground peer-data-active/menu-button:text-brand-foreground">
                        {newLeads}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <Button asChild variant="outline" size="lg" className="w-full bg-background">
          <Link href="/" target="_blank">
            Buka website
            <ExternalLink />
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Cari menu…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Cari menu" description="Lompat ke modul dashboard.">
        <CommandInput placeholder="Ketik nama menu…" />
        <CommandList>
          <CommandEmpty>Menu tidak ditemukan.</CommandEmpty>
          {navGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map(({ href, label, icon: Icon, keywords, external }) => (
                <CommandItem
                  key={label}
                  value={`${label} ${keywords ?? ""}`}
                  onSelect={() => {
                    setOpen(false);
                    if (external) window.open(href, "_blank", "noopener,noreferrer");
                    else router.push(href);
                  }}
                >
                  <Icon />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

type ShellProps = { admin: { email: string; name: string }; brandName: string; newLeads: number; children: ReactNode };

export function AdminShell({ admin, brandName, newLeads, children }: ShellProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <AdminSidebar brandName={brandName} newLeads={newLeads} />
        <SidebarInset className="min-w-0 border md:shadow-none">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:rounded-t-xl">
            <SidebarTrigger />
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <CommandMenu />
            <div className="ml-auto flex items-center gap-1">
              <Button asChild variant="ghost" size="icon-lg" aria-label="Buka website publik">
                <Link href="/" target="_blank">
                  <ExternalLink />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="ml-1 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40" aria-label="Menu akun">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                        {admin.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="grid gap-0.5">
                    <span className="text-sm font-medium text-foreground">{admin.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{admin.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      void logoutAction();
                    }}
                  >
                    <LogOut />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
