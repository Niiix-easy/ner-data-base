import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{locale:string}> }) {
  const {locale} = await params;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  return <html lang={locale}><body>
    <header style={{padding:"14px 24px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between"}}>
      <strong>NERCloud</strong><LanguageSwitcher value={locale}/>
    </header>
    {children}
  </body></html>;
}
