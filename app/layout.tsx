import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getContent } from "@/lib/data";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getContent("settings");
  return {
    metadataBase: new URL(siteUrl),
    title: { default: settings.seoTitle, template: `%s | ${settings.brandName}` },
    description: settings.seoDescription,
    applicationName: settings.brandName,
  };
}

export const viewport: Viewport = { themeColor: "#2456f5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
