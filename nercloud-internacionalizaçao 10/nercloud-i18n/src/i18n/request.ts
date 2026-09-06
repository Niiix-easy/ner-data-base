import { defaultLocale, locales, type Locale } from "./config";

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return defaultLocale;
  if ((locales as readonly string[]).includes(value)) return value as Locale;
  const base = value.split("-")[0].toLowerCase();
  return locales.find(x => x.toLowerCase().startsWith(base + "-")) ?? defaultLocale;
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  const candidates = (acceptLanguage ?? "").split(",").map(x => x.split(";")[0].trim());
  for (const candidate of candidates) {
    const found = normalizeLocale(candidate);
    if (found !== defaultLocale || candidate.toLowerCase().startsWith("pt")) return found;
  }
  return defaultLocale;
}
