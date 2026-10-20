import { desc, eq, gte } from "drizzle-orm";
import { MessagesSquare, MessageSquareText, Users, VolumeX } from "lucide-react";
import type { Metadata } from "next";
import { CommunityModeration } from "@/components/admin/community-moderation";
import { PageHero, StatCard } from "@/components/admin/page-hero";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { communityMessages, customers, subnetAccounts } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Komunitas Subnet" };

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

/** Moderasi chat grup pelanggan Subnet: pesan terbaru (termasuk yang sudah dihapus), pengumuman admin, dan bisukan. */
export default async function CommunityPage() {
  await requireAdmin("subnet");
  const db = requireDb();
  const weekAgo = daysAgo(7);
  const [rows, recent, muted] = await Promise.all([
    db
      .select({
        id: communityMessages.id,
        customerId: communityMessages.customerId,
        isAdmin: communityMessages.isAdmin,
        authorName: communityMessages.authorName,
        body: communityMessages.body,
        deletedAt: communityMessages.deletedAt,
        createdAt: communityMessages.createdAt,
        company: customers.company,
        name: customers.name,
        muted: subnetAccounts.chatMuted,
      })
      .from(communityMessages)
      .leftJoin(customers, eq(customers.id, communityMessages.customerId))
      .leftJoin(subnetAccounts, eq(subnetAccounts.customerId, communityMessages.customerId))
      .orderBy(desc(communityMessages.createdAt))
      .limit(200),
    db.select({ customerId: communityMessages.customerId }).from(communityMessages).where(gte(communityMessages.createdAt, weekAgo)),
    db.select({ id: subnetAccounts.customerId }).from(subnetAccounts).where(eq(subnetAccounts.chatMuted, true)),
  ]);
  const members = new Set(recent.map((row) => row.customerId).filter(Boolean)).size;

  return (
    <>
      <PageHero
        title="Komunitas Subnet"
        icon={MessagesSquare}
        description="Chat grup semua pelanggan Subnet di portal dan aplikasi TLINET. Kirim pengumuman sebagai Admin TLINET, hapus pesan yang tidak pantas, atau bisukan pelanggan yang mengganggu (mereka tetap bisa membaca)."
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
        <StatCard tone="blue" icon={MessageSquareText} label="Pesan 7 hari terakhir" value={recent.length} hint="Termasuk pesan admin" />
        <StatCard tone="green" icon={Users} label="Pelanggan aktif chat" value={members} hint="Mengirim pesan dalam 7 hari" />
        <StatCard tone="amber" icon={VolumeX} label="Dibisukan" value={muted.length} hint="Hanya bisa membaca" />
      </div>
      <CommunityModeration
        messages={rows.map((row) => ({
          id: row.id,
          customerId: row.customerId,
          admin: row.isAdmin,
          name: row.isAdmin ? row.authorName || "Admin TLINET" : row.company || row.name || "Pelanggan",
          body: row.body,
          at: row.createdAt.getTime(),
          deleted: Boolean(row.deletedAt),
          muted: Boolean(row.muted),
        }))}
      />
    </>
  );
}
