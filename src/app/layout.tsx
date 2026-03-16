import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "대기 자가측정 관리 시스템",
  description: "코스맥스 방지시설 운영관리 및 컴플라이언스 통합 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-[#F6F8FB] font-sans">
        <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
