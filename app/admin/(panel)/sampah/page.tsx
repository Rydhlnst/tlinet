import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { PageHero } from "@/components/admin/page-hero";
import { TrashList } from "@/components/admin/trash-list";
import { requireAdmin } from "@/lib/auth";
import { listTrash, trashRetentionDays } from "@/lib/trash";

export const metadata: Metadata = { title: "Tempat Sampah" };

/** Data yang dihapus dari dashboard, bisa dikembalikan selama 30 hari. Isinya disaring sesuai hak akses pengguna. */
export default async function TrashPage() {
  const admin = await requireAdmin("any");
  const items = await listTrash(admin);

  return (
    <>
      <PageHero
        title="Tempat Sampah"
        icon={Trash2}
        description={`Data yang dihapus dari dashboard masuk ke sini dan bisa dikembalikan seperti semula, termasuk data yang ikut terhapus (mis. pembayaran milik pelanggan). Setelah ${trashRetentionDays} hari dihapus otomatis untuk selamanya.`}
      />
      <TrashList items={items} owner={admin.role === "owner"} retention={trashRetentionDays} />
    </>
  );
}
