"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RegisterForm from "@/components/auth/RegisterForm";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRoute } from "@/lib/auth-routing";
import {
  AppSurface,
  getDefaultPostAuthRoute,
  getSurfaceHref,
} from "@/lib/app-surface";

type RegisterPageClientProps = {
  surface: AppSurface;
  redirect?: string;
};

export default function RegisterPageClient({
  surface,
  redirect,
}: RegisterPageClientProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo =
    redirect ||
    searchParams?.get("redirect") ||
    (user ? getPostAuthRoute(user) : getDefaultPostAuthRoute(surface, null));

  useEffect(() => {
    if (!isLoading && user) {
      router.push(redirectTo);
    }
  }, [redirectTo, isLoading, router, user]);

  if (isLoading || user) {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center p-8">
        <div className="theme-panel rounded-[28px] px-8 py-6 text-center">
          <p className="theme-muted text-sm">Redirecting to your account...</p>
        </div>
      </div>
    );
  }

  if (surface === "admin") {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="theme-panel w-full max-w-[28rem] rounded-[28px] p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
          <h2 className="theme-heading text-2xl font-semibold">
            Admin access only
          </h2>
          <p className="theme-muted mt-3 text-sm leading-6">
            Admin accounts are created by Off2Zim.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href={getSurfaceHref("admin", "/login")}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff5630] px-5 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
            >
              Go to admin sign in
            </a>
            <a
              href="mailto:info@off2zim.co.zw"
              className="theme-button-secondary inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="theme-page flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <RegisterForm
        surface={surface}
        redirectTo={redirectTo}
        showSocialButtons={false}
      />
    </main>
  );
}
