import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Akun" };

export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Akun</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masuk sebagai {admin.email}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ganti kata sandi</CardTitle>
          <CardDescription>Gunakan kata sandi yang tidak dipakai di layanan lain.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </>
  );
}
