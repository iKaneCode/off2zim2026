"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Sparkles, Users } from "lucide-react";
import RegisterForm from "@/components/auth/RegisterForm";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { AppSurface, getDefaultPostAuthRoute, getSurfaceHref } from "@/lib/app-surface";
import { authSurfaceCopy } from "@/lib/surface-config";

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
  const panelCopy = authSurfaceCopy[surface].register;

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

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.06fr_0.94fr] lg:px-8">
        {surface === "admin" ? (
          <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-0 py-2 lg:col-span-2">
            <div className="theme-panel w-full max-w-[28rem] rounded-[32px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
              <h2 className="theme-heading text-3xl font-semibold">
                Admin access only
              </h2>
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
                  Contact platform support
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section
              className="relative overflow-hidden rounded-[34px] bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(0,0,0,0.16), rgba(0,0,0,0.56)), url('/images/victoria-falls.jpg')",
              }}
            >
              <div className="flex h-full min-h-[420px] flex-col justify-between p-6 text-white md:p-8 lg:min-h-[720px] lg:p-10">
                <div>
                  <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/78 backdrop-blur">
                    {panelCopy.eyebrow}
                  </div>
                  <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
                    {panelCopy.title}
                  </h1>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/74 md:text-base">
                    {panelCopy.body}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[26px] border border-white/15 bg-black/28 p-5 backdrop-blur-sm">
                    <Users className="h-5 w-5 text-[#ffca74]" />
                    <div className="mt-4 text-lg font-semibold">{panelCopy.cardA}</div>
                    <div className="mt-2 text-sm leading-6 text-white/72">
                      {panelCopy.cardABody}
                    </div>
                  </div>
                  <div className="rounded-[26px] border border-white/15 bg-black/28 p-5 backdrop-blur-sm">
                    <Building2 className="h-5 w-5 text-[#9fc7ff]" />
                    <div className="mt-4 text-lg font-semibold">{panelCopy.cardB}</div>
                    <div className="mt-2 text-sm leading-6 text-white/72">
                      {panelCopy.cardBBody}
                    </div>
                  </div>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/28 px-4 py-2 text-sm text-white/82 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-[#ffca74]" />
                  Explore | Experience | Enjoy
                </div>
              </div>
            </section>

            <aside className="flex items-center justify-center px-0 py-2 lg:px-10">
              <RegisterForm
                surface={surface}
                redirectTo={redirectTo}
                showSocialButtons={false}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
