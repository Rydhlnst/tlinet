import type { Metadata } from "next";
import { listMediaAction } from "@/app/admin/actions";
import { MediaLibrary } from "@/components/admin/media-library";
import { requireAdmin } from "@/lib/auth";
import { storageMode } from "@/lib/storage";

export const metadata: Metadata = { title: "Media" };

const storageLabels = { r2: "Cloudflare R2", database: "database Neon (R2 belum diatur)", incomplete: "belum siap (variabel R2 belum lengkap)" };

export default async function MediaPage() {
  await requireAdmin();
  return <MediaLibrary items={await listMediaAction()} storageLabel={storageLabels[storageMode]} />;
}
