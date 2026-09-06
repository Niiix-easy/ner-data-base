import type { Locale } from "./config";
import { localeCurrencies } from "./config";

export function formatCurrency(valueCents: number, locale: Locale, currency = localeCurrencies[locale]) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(valueCents / 100);
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
