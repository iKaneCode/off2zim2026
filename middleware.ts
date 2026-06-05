import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getSurfaceHome,
  isPathAllowedOnSurface,
  getSurfacePrefix,
  getSurfaceHref,
  resolveAppSurface,
  stripSurfacePrefix,
} from "@/lib/app-surface";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host");
  const surface = resolveAppSurface(hostname, pathname);
  const internalPath = stripSurfacePrefix(pathname);
  const isAuthScreen = internalPath === "/login" || internalPath === "/register";
  const isAuthRoute = isAuthScreen || internalPath.startsWith("/auth");
  const withSurfaceHeaders = (url = request.nextUrl.clone()) => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-off2zim-surface", surface);
    if (isAuthRoute) {
      requestHeaders.set("x-off2zim-auth-screen", "true");
    }

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  };

  if (
    internalPath.startsWith("/_next") ||
    internalPath.startsWith("/icons") ||
    internalPath.startsWith("/images") ||
    internalPath.startsWith("/fonts") ||
    internalPath.startsWith("/logos") ||
    internalPath.includes(".")
  ) {
    return NextResponse.next();
  }

  if (surface === "public") {
    if (!isAuthRoute) {
      return NextResponse.next();
    }
    return withSurfaceHeaders();
  }

  if (isAuthRoute) {
    const url = new URL(getSurfaceHref("public", internalPath), request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  if (surface === "admin" && internalPath === "/") {
    const url = new URL(getSurfaceHref("public", "/login"), request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  const surfaceRoot = getSurfacePrefix(surface);

  if (pathname === surfaceRoot) {
    return withSurfaceHeaders();
  }

  if (internalPath === "/") {
    const url = request.nextUrl.clone();
    url.pathname = getSurfaceHome(surface);

    if (pathname !== url.pathname) {
      return withSurfaceHeaders(url);
    }

    return NextResponse.redirect(url);
  }

  if (!isPathAllowedOnSurface(internalPath, surface)) {
    const url = request.nextUrl.clone();
    url.pathname = getSurfaceHome(surface);

    if (pathname !== url.pathname) {
      return withSurfaceHeaders(url);
    }

    return NextResponse.redirect(url);
  }
  if (pathname !== internalPath) {
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    return withSurfaceHeaders(url);
  }

  return withSurfaceHeaders();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
