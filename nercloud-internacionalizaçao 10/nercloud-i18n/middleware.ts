import { NextRequest, NextResponse } from "next/server";
import { localeMiddleware, shouldRunI18n } from "@/i18n/middleware";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (shouldRunI18n(pathname)) {
    const first = pathname.split("/")[1];
    const locales = ["pt-BR","en-US","es-ES","fr-FR","de-DE","it-IT","ja-JP","ko-KR","zh-CN"];
    if (!locales.includes(first)) {
      const locale = req.cookies.get("nercloud_locale")?.value || "pt-BR";
      return NextResponse.redirect(new URL(`/${locale}${pathname}`, req.url));
    }
    return localeMiddleware(req);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
