import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { StaffUserButton } from "@/components/admin/staff-users";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { isStaffPermission, permissionDefs } from "@/lib/permissions";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = { title: "Pengguna" };

const permissionLabel = new Map(permissionDefs.map((item) => [item.key as string, item.label]));

/** Akun staf dashboard dan hak aksesnya; hanya owner (ADMIN_EMAIL) yang bisa membuka halaman ini. */
export default async function UsersPage() {
  await requireAdmin("users");
  const users = await requireDb().select().from(staffUsers).orderBy(asc(staffUsers.name), asc(staffUsers.email));
  const loginUrl = absoluteUrl("/admin/login");

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Akun staf di bawah owner. Setiap akun hanya melihat menu yang dicentang di hak aksesnya, dan aksi di luar hak aksesnya ditolak server. Akun owner (yang diatur di environment) selalu punya akses
            penuh.
          </p>
        </div>
        <StaffUserButton loginUrl={loginUrl} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Pengguna</TableHead>
              <TableHead>Hak akses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Login terakhir</TableHead>
              <TableHead className="pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="pl-4">
                  <span className="font-medium">{user.name || user.email}</span>
                  {user.name && <span className="block text-xs text-muted-foreground">{user.email}</span>}
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.filter(isStaffPermission).map((key) => (
                      <Badge key={key} variant="secondary" className="font-normal">
                        {permissionLabel.get(key)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? "default" : "outline"}>{user.active ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</TableCell>
                <TableCell className="pr-4 text-right">
                  <StaffUserButton loginUrl={loginUrl} user={{ id: user.id, email: user.email, name: user.name, permissions: user.permissions, active: user.active }} />
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Belum ada pengguna staf. Tambahkan akun untuk tim yang hanya butuh sebagian menu, mis. Data Pelanggan, Subnet, dan Progres Metro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
