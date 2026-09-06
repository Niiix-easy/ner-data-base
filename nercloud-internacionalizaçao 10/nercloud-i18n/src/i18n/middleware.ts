import { NextRequest, NextResponse } from "next/server";
import { detectLocale, normalizeLocale } from "./request";

const COOKIE = "nercloud_locale";

export function localeMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const cookie = req.cookies.get(COOKIE)?.value;
  const locale = normalizeLocale(cookie || detectLocale(req.headers.get("accept-language")));

  const response = NextResponse.next();
  response.cookies.set(COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax"
  });
  response.headers.set("x-nercloud-locale", locale);
  return response;
}

export function shouldRunI18n(pathname: string) {
  return !pathname.startsWith("/_next") && !pathname.startsWith("/api") && !pathname.includes(".");
}
