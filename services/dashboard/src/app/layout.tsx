import React from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/contexts/I18nContext";
import SidebarClientWrapper from "@/components/layout/SidebarClientWrapper";

import Providers from "@/components/Providers";
import { NotificationCenter } from "@/components/NotificationCenter";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Ner-Data-Base Dashboard",
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
      className={`${sans.variable} ${mono.variable} font-sans h-full antialiased bg-[#0a0a0a] text-white`}
    >
      <body className="min-h-full flex">
        <NotificationCenter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
