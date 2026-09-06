import { getTranslations } from "@/i18n/get-translations";
import type { Locale } from "@/i18n/config";

export default async function Home({params}:{params:Promise<{locale:Locale}>}) {
 const {locale}=await params; const t=await getTranslations(locale);
 return <main style={{padding:32}}><h1>{t.billing.title}</h1><p>{t.billing.revenue}</p><nav style={{display:"flex",gap:16,flexWrap:"wrap"}}>
  <a href={`/${locale}/usage`}>{t.common.usage}</a>
  <a href={`/${locale}/invoices`}>{t.common.invoices}</a>
  <a href={`/${locale}/payments`}>{t.common.payments}</a>
  <a href={`/${locale}/plans`}>{t.common.plans}</a>
  <a href={`/${locale}/admin`}>{t.common.admin}</a>
 </nav></main>
}
