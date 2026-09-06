import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname.startsWith("/login")
  const isApiRoute = request.nextUrl.pathname.startsWith("/api")
  const isStatic = request.nextUrl.pathname.startsWith("/_next") ||
                   request.nextUrl.pathname.includes(".")

  if (isStatic) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get("neer-data-base_admin_auth")

  // For API routes (like proxy endpoints), we just check existence to pass it to the backend.
  // The backend will perform the actual HMAC validation.
  if (isApiRoute) {
     if (request.nextUrl.pathname === "/api/auth/login") {
         return NextResponse.next()
     }
     if (!authCookie || !authCookie.value) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
     }
     return NextResponse.next()
  }

  if (isLoginPage) {
    if (authCookie && authCookie.value) {
        return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  if (!authCookie || !authCookie.value) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
