import React from "react";
import { I18nProvider } from "@/contexts/I18nContext";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <div className="min-h-screen w-full bg-gray-900 absolute top-0 left-0 z-50">
        {children}
      </div>
    </I18nProvider>
  );
}
