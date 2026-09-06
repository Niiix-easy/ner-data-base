export const locales = ["pt-BR","en-US","es-ES","fr-FR","de-DE","it-IT","ja-JP","ko-KR","zh-CN"] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = "pt-BR";

export const localeNames: Record<Locale,string> = {
  "pt-BR":"Português (Brasil)","en-US":"English (US)","es-ES":"Español",
  "fr-FR":"Français","de-DE":"Deutsch","it-IT":"Italiano",
  "ja-JP":"日本語","ko-KR":"한국어","zh-CN":"简体中文"
};

export const localeCurrencies: Record<Locale,string> = {
  "pt-BR":"BRL","en-US":"USD","es-ES":"EUR","fr-FR":"EUR","de-DE":"EUR",
  "it-IT":"EUR","ja-JP":"JPY","ko-KR":"KRW","zh-CN":"CNY"
};
