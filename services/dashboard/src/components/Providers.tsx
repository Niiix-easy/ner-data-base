"use client";

import React from "react";
import { I18nProvider } from "@/contexts/I18nContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SidebarClientWrapper from "@/components/layout/SidebarClientWrapper";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SidebarClientWrapper>{children}</SidebarClientWrapper>
      </I18nProvider>
    </ThemeProvider>
  );
}
