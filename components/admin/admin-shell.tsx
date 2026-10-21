"use client";

import {
  Banknote,
  Bell,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Handshake,
  Home,
  IdCard,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  MapPinned,
  MessagesSquare,
  Moon,
  Network,
  ShieldCheck,
  LayoutGrid,
  Smartphone,
  Route,
  Newspaper,
  Package,
  ReceiptText,
  ScrollText,
  Search,
  Settings,
  ShoppingBag,
  Stamp,
  Sun,
  Tags,
  Trash2,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { TowerScene } from "./admin-art";
import { NavPending } from "./nav-pending";
import { RouteFade } from "@/components/route-fade";
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
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { adminApk } from "@/lib/admin-app";
import { can, routePermission, type AdminUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** `children`: submenu yang bisa dibuka-tutup; induknya sendiri tetap tautan ke halamannya. */
type NavItem = { href: string; label: string; icon: LucideIcon; keywords?: string; children?: NavItem[] };

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
      { href: "/admin/data/faqs", label: "FAQ", icon: CircleHelp, keywords: "pertanyaan jawaban" },
      { href: "/admin/data/articles", label: "Artikel Berita", icon: Newspaper, keywords: "blog tulisan" },
      { href: "/admin/data/clients", label: "Klien & Mitra", icon: Handshake, keywords: "logo marquee cloud cdn" },
    ],
  },
  {
    // Modul operasional internal: pelanggan dan pembukuan, terpisah dari pengelolaan isi situs.
    label: "Operasional",
    items: [
      { href: "/admin/data/customers", label: "Data Pelanggan", icon: Users, keywords: "customer site id cid foto detail" },
      { href: "/admin/subnet", label: "Subnet", icon: Network, keywords: "portal login akses pelanggan username password" },
      { href: "/admin/forum", label: "Forum Subnet", icon: MessagesSquare, keywords: "komunitas chat grup obrolan pesan gambar moderasi bisukan" },
      { href: "/admin/metro", label: "Progres Metro", icon: Route, keywords: "pemasangan baru upgrade kapasitas instalasi tahapan status" },
      { href: "/admin/data/customer-payments", label: "History Pembayaran Subnet", icon: ReceiptText, keywords: "tagihan bayar lunas riwayat" },
      { href: "/admin/data/customer-purchases", label: "History Pembelian Perusahaan", icon: ShoppingBag, keywords: "beli nap pemasok biaya riwayat" },
      { href: "/admin/keuntungan", label: "Selisih Keuntungan", icon: TrendingUp, keywords: "profit margin laba biaya isp nap" },
      { href: "/admin/data/employees", label: "Data Karyawan", icon: IdCard, keywords: "pegawai staf jabatan rekening" },
      { href: "/admin/data/salaries", label: "Gaji Karyawan", icon: Banknote, keywords: "payroll upah slip lembur bonus potongan" },
      { href: "/admin/data/invoices", label: "Invoice", icon: ScrollText, keywords: "tagihan faktur cetak pdf" },
      { href: "/admin/sampah", label: "Tempat Sampah", icon: Trash2, keywords: "hapus dihapus kembalikan pulihkan restore recycle" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/admin/media", label: "Media", icon: FolderOpen, keywords: "gambar unggah foto r2" },
      { href: "/admin/pages/settings", label: "Pengaturan Situs", icon: Settings, keywords: "merek kontak whatsapp footer navigasi seo logo" },
      { href: "/admin/pages/invoice", label: "Pengaturan Invoice", icon: Stamp, keywords: "rekening bank logo catatan ppn kop" },
      { href: "/admin/users", label: "Pengguna", icon: ShieldCheck, keywords: "akun staf akses hak role rbac login" },
    ],
  },
];

/** Menu yang boleh dibuka pengguna ini; grup tanpa menu tersisa ikut disembunyikan. */
/** Di aplikasi TLINET Admin: Ringkasan dan menu operasional saja. */
const appHrefs = new Set(["/admin"]);

function visibleNav(admin: AdminUser, appMode = false) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !appMode || group.label === "Operasional" || appHrefs.has(item.href))
        .filter((item) => can(admin, routePermission(item.href)))
        .map((item) => ({ ...item, children: item.children?.filter((child) => can(admin, routePermission(child.href))) })),
    }))
    .filter((group) => group.items.length);
}

const isActive = (pathname: string, href: string, exact?: boolean) => pathname === href || (!exact && href !== "/admin" && pathname.startsWith(`${href}/`));

const activeClass =
  "h-9 rounded-lg font-medium data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:shadow-[0_6px_16px_-6px_rgba(37,99,235,0.7)] data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground";

function AdminSidebar({ admin, brandName, newLeads, appMode }: { admin: AdminUser; brandName: string; newLeads: number; appMode: boolean }) {
  const pathname = usePathname();
  const groups = visibleNav(admin, appMode);
  const showAppDownload = !appMode;
  const { setOpenMobile } = useSidebar();
  // Submenu terbuka sendiri saat salah satu halamannya dibuka; pilihan pengguna menimpa itu.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

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
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-medium tracking-wider uppercase">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, label, icon: Icon, children }) => {
                  const expanded = Boolean(children) && (toggled[href] ?? isActive(pathname, href));
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild tooltip={label} isActive={isActive(pathname, href, Boolean(children))} className={activeClass}>
                        <Link href={href} onClick={() => setOpenMobile(false)}>
                          <Icon />
                          <span>{label}</span>
                          <NavPending />
                        </Link>
                      </SidebarMenuButton>
                      {href === "/admin/data/leads" && newLeads > 0 && (
                        <SidebarMenuBadge className="rounded-full bg-brand px-1.5 text-brand-foreground peer-hover/menu-button:text-brand-foreground peer-data-active/menu-button:text-brand-foreground">
                          {newLeads}
                        </SidebarMenuBadge>
                      )}
                      {children && (
                        <>
                          <SidebarMenuAction
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Tutup" : "Buka"} submenu ${label}`}
                            onClick={() => setToggled((current) => ({ ...current, [href]: !expanded }))}
                            className="peer-data-active/menu-button:text-sidebar-primary-foreground"
                          >
                            <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
                          </SidebarMenuAction>
                          {expanded && (
                            <SidebarMenuSub>
                              {children.map((child) => (
                                <SidebarMenuSubItem key={child.href}>
                                  <SidebarMenuSubButton asChild isActive={isActive(pathname, child.href)} className="data-active:font-medium">
                                    <Link href={child.href} onClick={() => setOpenMobile(false)}>
                                      <child.icon />
                                      <span>{child.label}</span>
                                      <NavPending />
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="relative overflow-hidden pb-28 group-data-[collapsible=icon]:hidden">
        <TowerScene tone="day" idPrefix="sidebar" className="absolute inset-x-0 bottom-0 h-28 w-full dark:hidden" />
        <TowerScene tone="night" idPrefix="sidebar" className="absolute inset-x-0 bottom-0 hidden h-28 w-full dark:block" />
        {showAppDownload && (
          <Button asChild size="lg" className="relative w-full rounded-full shadow-[0_8px_20px_-8px_rgba(37,99,235,0.8)]" title={`Versi ${adminApk.version} · ${adminApk.size} · khusus internal`}>
            <a href={adminApk.path} download>
              <Smartphone />
              Aplikasi Android
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="lg" className="relative w-full rounded-full bg-background">
          <Link href="/" target="_blank">
            Buka website
            <ExternalLink />
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function CommandMenu({ admin, appMode }: { admin: AdminUser; appMode: boolean }) {
  const router = useRouter();
  const groups = visibleNav(admin, appMode);
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
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-full border bg-card px-4 text-sm text-muted-foreground shadow-[0_2px_10px_-6px_rgba(15,23,42,0.25)] transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Cari menu…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Cari menu" description="Lompat ke modul dashboard.">
        <CommandInput placeholder="Ketik nama menu…" />
        <CommandList>
          <CommandEmpty>Menu tidak ditemukan.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items
                .flatMap((item) => [item, ...(item.children ?? [])])
                .map(({ href, label, icon: Icon, keywords }) => (
                  <CommandItem
                    key={href}
                    value={`${label} ${keywords ?? ""}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(href);
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

/** Tab bawah di HP: menu operasional yang paling sering dibuka, dengan label pendek. */
const tabLabels: Record<string, string> = {
  "/admin": "Ringkasan",
  "/admin/data/customers": "Pelanggan",
  "/admin/subnet": "Subnet",
  "/admin/metro": "Metro",
  "/admin/data/invoices": "Invoice",
  "/admin/data/customer-payments": "Pembayaran",
  "/admin/keuntungan": "Keuntungan",
};

/**
 * Navigasi HP (dan aplikasi TLINET Admin): judul halaman di atas, tab bawah untuk menu utama, dan "Menu" untuk sisanya.
 * Di aplikasi hanya Ringkasan dan menu operasional yang tampil.
 */
function MobileNav({ admin, appMode }: { admin: AdminUser; appMode: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = visibleNav(admin, appMode);
  const all = groups.flatMap((group) => group.items);
  // Urutan prioritas mengikuti tabLabels, bukan urutan sidebar.
  const tabs = Object.keys(tabLabels)
    .map((href) => all.find((item) => item.href === href))
    .filter((item) => item !== undefined)
    .slice(0, 4);
  const tabHrefs = new Set(tabs.map((item) => item.href));
  const activeTab = tabs.find((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Menu utama">
        <ul className="mx-auto grid h-16 max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map(({ href, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden="true" />}
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  {tabLabels[href]}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn("relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium", !activeTab ? "text-primary" : "text-muted-foreground")}
            >
              {!activeTab && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden="true" />}
              <LayoutGrid className="size-5" strokeWidth={!activeTab ? 2.2 : 1.8} />
              Menu
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader className="pb-2">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">Semua menu dashboard yang bisa Anda buka.</SheetDescription>
          </SheetHeader>
          {groups.map((group) => {
            // Menu yang sudah ada di tab bawah tidak diulang. Submenu dibuka dari halaman induknya.
            const items = group.items.filter((item) => !tabHrefs.has(item.href));
            if (!items.length) return null;
            return (
              <div key={group.label} className="px-4 pb-3">
                {!appMode && <p className="px-1 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{group.label}</p>}
                <ul className="overflow-hidden rounded-xl border">
                  {items.map(({ href, label, icon: Icon }, index, list) => (
                    <li key={href} className={cn(index < list.length - 1 && "border-b")}>
                      <Link href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-3 py-3 text-sm", isActive(pathname, href) ? "bg-primary/5 font-semibold text-primary" : "hover:bg-muted")}>
                        <Icon className="size-[18px] shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="flex flex-col gap-2 px-4 pt-1">
            {!appMode && (
              <Button asChild variant="outline" className="w-full">
                <a href={adminApk.path} download>
                  <Smartphone />
                  Unduh aplikasi Android
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                void logoutAction();
              }}
            >
              <LogOut />
              Keluar ({admin.name})
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Judul halaman yang sedang dibuka, dari label menunya. */
function useCurrentTitle(admin: AdminUser, appMode: boolean) {
  const pathname = usePathname();
  const items = visibleNav(admin, appMode).flatMap((group) => group.items.flatMap((item) => [item, ...(item.children ?? [])]));
  const match = items.filter((item) => isActive(pathname, item.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Dashboard";
}

/** Ganti tema terang/gelap dashboard (disimpan di peramban, tidak memengaruhi situs publik). */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    // Label dan ikon tidak bergantung pada tema di render pertama (tema baru diketahui di peramban), supaya hidrasi cocok.
    <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Ganti tema terang/gelap" title="Ganti tema terang/gelap" onClick={() => setTheme(dark ? "light" : "dark")}>
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

/** Lonceng: jumlah prospek baru dari formulir situs. */
function LeadsBell({ count }: { count: number }) {
  return (
    <Button asChild variant="ghost" size="icon-lg" className="relative rounded-full" aria-label={count ? `${count} prospek baru` : "Prospek masuk"}>
      <Link href="/admin/data/leads">
        <Bell />
        {count > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-rose-500 ring-2 ring-background" />}
      </Link>
    </Button>
  );
}

type ShellProps = { admin: AdminUser; brandName: string; newLeads: number; appMode: boolean; children: ReactNode };

export function AdminShell({ admin, brandName, newLeads, appMode, children }: ShellProps) {
  const title = useCurrentTitle(admin, appMode);
  return (
    <ThemeProvider attribute="class" storageKey="tlinet-admin-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <SidebarProvider>
          <AdminSidebar admin={admin} brandName={brandName} newLeads={newLeads} appMode={appMode} />
          <SidebarInset className="min-w-0 border bg-[#f5f8fe] md:shadow-none dark:bg-background">
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:h-16 md:rounded-t-xl md:border-b-0 md:bg-[#f5f8fe]/90 md:px-8 dark:md:bg-background/90">
              {/* HP: logo dan judul halaman; menu lewat tab bawah. Layar lebar: sidebar dan pencarian menu. */}
              <div className="flex min-w-0 items-center gap-2.5 md:hidden">
                <BrandMark className="size-6" />
                <span className="truncate text-base font-semibold">{title}</span>
              </div>
              <SidebarTrigger className="hidden md:inline-flex" />
              <span className="hidden h-4 w-px bg-border md:block" aria-hidden="true" />
              <div className="hidden min-w-0 flex-1 md:block">
                <CommandMenu admin={admin} appMode={appMode} />
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="hidden items-center gap-1 md:flex">
                  <LeadsBell count={newLeads} />
                  <ThemeToggle />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="ml-1 flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40" aria-label="Menu akun">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                          {admin.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || admin.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-left leading-tight lg:block">
                        <span className="block max-w-40 truncate text-sm font-semibold">{admin.name}</span>
                        <span className="block text-xs text-muted-foreground">{admin.role === "owner" ? "Admin" : "Staf"}</span>
                      </span>
                      <ChevronDown className="hidden size-4 text-muted-foreground lg:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="grid gap-0.5">
                      <span className="text-sm font-medium text-foreground">{admin.name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">{admin.email}</span>
                      <span className="text-xs font-normal text-muted-foreground">{admin.role === "owner" ? "Owner · akses penuh" : "Staf · akses terbatas"}</span>
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
            {/* Lebar isi mengikuti layar agar tabel berkolom banyak tidak terpotong; dibatasi supaya form tidak melar di monitor sangat lebar. */}
            <RouteFade lift className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-5 p-4 pb-24 md:gap-6 md:p-8">
              {children}
            </RouteFade>
            <MobileNav admin={admin} appMode={appMode} />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
