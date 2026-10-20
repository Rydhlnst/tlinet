/**
 * Hak akses dashboard. Owner (akun ADMIN_EMAIL di environment) boleh semuanya, termasuk mengelola pengguna; akun staf
 * hanya membuka menu yang hak aksesnya dicentang di menu Pengguna. Modul ini dipakai server (penjaga halaman dan aksi)
 * maupun browser (menyaring sidebar), jadi tidak boleh mengimpor apa pun dari server.
 */

export const permissionDefs = [
  { key: "dashboard", label: "Ringkasan & Prospek Masuk" },
  { key: "content", label: "Halaman, data situs & media", help: "Beranda, paket, FAQ, artikel, klien, dan pustaka media." },
  { key: "customers", label: "Data Pelanggan" },
  { key: "subnet", label: "Subnet", help: "Akses portal pelanggan." },
  { key: "metro", label: "Progres Metro" },
  { key: "billing", label: "Invoice & History Pembayaran" },
  { key: "finance", label: "Keuangan", help: "History pembelian, biaya ke NAP, Selisih Keuntungan, serta Data dan Gaji Karyawan." },
  { key: "accurate", label: "Pencatatan Accurate" },
  { key: "settings", label: "Pengaturan situs & invoice" },
] as const;

/** `users` (mengelola akun staf) hanya untuk owner dan tidak bisa diberikan ke staf. */
export type Permission = (typeof permissionDefs)[number]["key"] | "users";
export type StaffPermission = Exclude<Permission, "users">;

export const staffPermissionKeys = permissionDefs.map((item) => item.key) as StaffPermission[];
export const isStaffPermission = (value: unknown): value is StaffPermission => staffPermissionKeys.includes(value as StaffPermission);

export type AdminUser = { email: string; name: string; role: "owner" | "staff"; permissions: StaffPermission[] };

export const can = (user: Pick<AdminUser, "role" | "permissions">, permission: Permission) => user.role === "owner" || (permission !== "users" && user.permissions.includes(permission));

/** Data CMS per jenis data (lib/cms/entities). Entitas yang tidak dikenal hanya untuk owner. */
const entityPermissions: Record<string, StaffPermission> = {
  leads: "dashboard",
  packages: "content",
  "package-categories": "content",
  "coverage-areas": "content",
  faqs: "content",
  articles: "content",
  clients: "content",
  customers: "customers",
  "customer-payments": "billing",
  invoices: "billing",
  "customer-purchases": "finance",
  employees: "finance",
  salaries: "finance",
};
export const entityPermission = (entityKey: string): Permission => entityPermissions[entityKey] ?? "users";

/** Halaman konten (lib/cms/pages): pengaturan situs dan invoice terpisah dari isi halaman. */
export const pagePermission = (pageKey: string): Permission => (pageKey === "settings" || pageKey === "invoice" ? "settings" : "content");

/** Hak akses yang dibutuhkan sebuah alamat di /admin; dipakai untuk menyaring sidebar dan mencari halaman awal staf. */
export function routePermission(pathname: string): Permission {
  if (pathname === "/admin") return "dashboard";
  const [, , section, key] = pathname.split("/");
  if (section === "data") return entityPermission(key ?? "");
  if (section === "pages") return pagePermission(key ?? "");
  const sections: Record<string, Permission> = { media: "content", subnet: "subnet", forum: "subnet", metro: "metro", keuntungan: "finance", accurate: "accurate", invoice: "billing", users: "users" };
  return sections[section ?? ""] ?? "users";
}

/** Urutan halaman awal: halaman pertama yang boleh dibuka pengguna. */
const landingPages = ["/admin", "/admin/data/customers", "/admin/subnet", "/admin/metro", "/admin/data/invoices", "/admin/keuntungan", "/admin/accurate", "/admin/pages/home", "/admin/pages/settings"];
export const homePath = (user: AdminUser) => landingPages.find((path) => can(user, routePermission(path))) ?? "/admin/login";
