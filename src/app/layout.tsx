import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/eva/providers";

export const metadata: Metadata = {
  title: "سامانه مانیتورینگ رول‌های EVA",
  description:
    "سامانه پایش رول‌های خام، EVA و برش‌خورده — محاسبه مانده زمان تولید EVA، هشدارهای کیفیت داده و گزارش‌های تحلیلی",
  keywords: ["EVA", "مانیتورینگ", "رول", "مانده زمان", "تولید"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        <Providers>
          {children}
          <Toaster position="bottom-left" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
