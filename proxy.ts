import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth-server";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/api/health", "/offline"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await verifyAuthToken(token);
    if (user) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Token invalide" },
      { status: 401 }
    );
  }

  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    if (pathname === "/login") {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const user = await verifyAuthToken(token);
  if (user) {
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (pathname === "/login") {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
