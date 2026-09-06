"use client";

import { useRouter } from "next/navigation";
import { localeNames, locales } from "@/i18n/config";

export default function LanguageSwitcher({ value }: { value: string }) {
  const router = useRouter();
  return (
    <select
      value={value}
      aria-label="Language"
      onChange={(e) => {
        document.cookie = `nercloud_locale=${e.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.refresh();
      }}
      style={{padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8}}
    >
      {locales.map(locale => <option key={locale} value={locale}>{localeNames[locale]}</option>)}
    </select>
  );
}
