import React from "react";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { I18nProvider } from "@/contexts/I18nContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neer-Data-Base Dashboard",
  description: "ZimaOS Local Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.className} h-full antialiased bg-[#121212] text-white`}
    >
      <body className="min-h-full flex">
        <I18nProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}
