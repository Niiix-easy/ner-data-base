import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/health",
  "/api/system/postgres",
  "/api/system/redis"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    PUBLIC_PATHS.some((path) => pathname === path)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const hasSession = Boolean(request.cookies.get("neercloud_session")?.value);
    if (!hasSession) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get("neercloud_session")?.value);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
