import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content-form";
import { requireAdmin } from "@/lib/auth";
import { pagePermission } from "@/lib/permissions";
import { getPageDef } from "@/lib/cms/pages";
import { getContent } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/admin/pages/[key]">): Promise<Metadata> {
  return { title: getPageDef((await params).key)?.label };
}

export default async function ContentPage({ params }: PageProps<"/admin/pages/[key]">) {
  const key = (await params).key;
  await requireAdmin(pagePermission(key));
  const page = getPageDef(key);
  if (!page) notFound();
  const content = await getContent(page.key);

  return <ContentForm key={page.key} pageKey={page.key} initial={content as unknown as Record<string, unknown>} />;
}
