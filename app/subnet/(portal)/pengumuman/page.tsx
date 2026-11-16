import type { Metadata } from "next";
import { AnnouncementList } from "@/components/site/subnet-announcements";
import { PageHeading } from "@/components/site/subnet-ui";
import { getSubnetAnnouncements } from "@/lib/data";
import { requireSubnetUser } from "@/lib/subnet";

export const metadata: Metadata = { title: "Pemberitahuan · Portal Subnet" };

/** Daftar pengumuman/pemberitahuan aktif dari TLINET untuk pelanggan Subnet. */
export default async function SubnetAnnouncementsPage() {
  await requireSubnetUser();
  const items = await getSubnetAnnouncements();
  return (
    <>
      <PageHeading title="Pemberitahuan" description="Pengumuman dan informasi terbaru dari TLINET." />
      <AnnouncementList items={items} />
    </>
  );
}
