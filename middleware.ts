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

function isMobileBrowser(request: NextRequest) {
  const mobileHint = request.headers.get("sec-ch-ua-mobile");

  if (mobileHint === "?1") {
    return true;
  }

  const userAgent = request.headers.get("user-agent") || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    userAgent,
  );
}

function isStaticAssetPath(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_expo") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/logos") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  );
}

function isPortalPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/admin-app" ||
    pathname.startsWith("/admin-app/") ||
    pathname === "/provider-dashboard" ||
    pathname.startsWith("/provider-dashboard/") ||
    pathname === "/sp" ||
    pathname.startsWith("/sp/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
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

  if (isStaticAssetPath(internalPath)) {
    return NextResponse.next();
  }

  if (surface === "public") {
    if (isMobileBrowser(request) && !isPortalPath(internalPath)) {
      const url = request.nextUrl.clone();
      url.pathname = "/index.html";
      return NextResponse.rewrite(url);
    }

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
