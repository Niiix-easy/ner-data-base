import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultLocale, type Locale } from "./config";

export async function getTranslations(locale: Locale = defaultLocale) {
  const file = path.join(process.cwd(), "messages", `${locale}.json`);
  const fallback = path.join(process.cwd(), "messages", `${defaultLocale}.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return JSON.parse(await fs.readFile(fallback, "utf8"));
  }
}
