import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { CommunityChat } from "@/components/site/community-chat";
import { PageHeading } from "@/components/site/subnet-ui";
import { listCommunityMessages } from "@/lib/community";
import { requireDb } from "@/lib/db";
import { subnetAccounts } from "@/lib/db/schema";
import { requireSubnetUser } from "@/lib/subnet";

export const metadata: Metadata = { title: "Komunitas · Portal Subnet" };

/** Chat grup antarpelanggan Subnet. */
export default async function SubnetCommunityPage() {
  const user = await requireSubnetUser();
  const [messages, [account]] = await Promise.all([
    listCommunityMessages(user.customerId),
    requireDb().select({ muted: subnetAccounts.chatMuted }).from(subnetAccounts).where(eq(subnetAccounts.customerId, user.customerId)).limit(1),
  ]);

  return (
    <>
      <PageHeading title="Komunitas" description="Ngobrol dan berbagi info dengan sesama pelanggan Subnet TLINET." />
      <CommunityChat initial={messages} muted={Boolean(account?.muted)} />
    </>
  );
}
