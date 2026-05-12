"use client";

import { useEffect, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AppSurface,
  getSurfaceHref,
  resolveSurfaceFromPath,
} from "@/lib/app-surface";
import { UserRole } from "@/types/auth";
import { getAccountRoute } from "@/lib/auth-routing";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredVerification?: boolean;
  fallback?: ReactNode;
  surface?: AppSurface;
}

const ProtectedRoute = ({
  children,
  requiredRole,
  requiredVerification = false,
  fallback,
  surface,
}: ProtectedRouteProps) => {
  const { user, isLoading, hasRole, isVerified } = useAuth();
  const router = useRouter();
  const accountRoute = getAccountRoute(user);
  const currentSurface =
    surface ||
    (typeof window !== "undefined"
      ? resolveSurfaceFromPath(window.location.pathname)
      : "public");
  const signInHref = getSurfaceHref(currentSurface, "/login");
  const verifyEmailHref = getSurfaceHref(currentSurface, "/auth/verify-email/request");

  useEffect(() => {
    if (!isLoading && !user) {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      const notice =
        typeof window !== "undefined"
          ? sessionStorage.getItem("off2zim_auth_notice")
          : null;
      const reason = notice === "session-expired" ? "&reason=session-expired" : "";

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("off2zim_auth_notice");
      }

      router.replace(`${signInHref}?redirect=${encodeURIComponent(nextPath)}${reason}`);
    }
  }, [isLoading, router, signInHref, user]);

  if (isLoading) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center px-4">
        <div className="theme-panel rounded-[28px] px-8 py-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#ff5630]" />
          <p className="theme-muted mt-4 text-sm">Checking your account access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      fallback || (
        <div className="theme-page min-h-screen flex items-center justify-center px-4">
          <div className="theme-panel max-w-md rounded-[32px] p-8 text-center">
            <h2 className="theme-heading text-2xl font-semibold">Sign in required</h2>
            <p className="theme-muted mt-3 text-sm leading-6">
              This part of Off2Zim is only available inside an active account session.
            </p>
            <Link
              href={signInHref}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      )
    );
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center px-4">
        <div className="theme-panel max-w-md rounded-[32px] p-8 text-center">
          <h2 className="theme-heading text-2xl font-semibold">Access denied</h2>
          <p className="theme-muted mt-3 text-sm leading-6">
            This page requires a different account role. Sign in with the correct workspace or return to your dashboard.
          </p>
          <Link
            href={accountRoute}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
          >
            Go to workspace
          </Link>
        </div>
      </div>
    );
  }

  // Check verification requirement
  if (requiredVerification && !isVerified()) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center px-4">
        <div className="theme-panel max-w-md rounded-[32px] p-8 text-center">
          <h2 className="theme-heading text-2xl font-semibold">Verification required</h2>
          <p className="theme-muted mt-3 text-sm leading-6">
            Verify your account to continue with this feature.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={verifyEmailHref}
              className="inline-flex items-center justify-center rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
            >
              Send verification email
            </Link>
            <Link
              href={accountRoute}
              className="theme-button-secondary inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
            >
              Go to workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
