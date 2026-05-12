"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, MapPinned, Sparkles } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { AppSurface, getDefaultPostAuthRoute } from "@/lib/app-surface";
import { authSurfaceCopy } from "@/lib/surface-config";

type LoginPageClientProps = {
  surface: AppSurface;
  redirect?: string;
};

export default function LoginPageClient({
  surface,
  redirect,
}: LoginPageClientProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams?.get("reason");
  const redirectTo =
    redirect ||
    searchParams?.get("redirect") ||
    (user ? getPostAuthRoute(user) : getDefaultPostAuthRoute(surface, null));
  const panelCopy = authSurfaceCopy[surface].login;
  const shouldRedirectAuthenticatedUser =
    !!user &&
    (surface === "public" ||
      (surface === "explorer" && user.role === "explorer") ||
      (surface === "provider" && user.role === "provider") ||
      (surface === "admin" && user.role === "admin"));

  useEffect(() => {
    if (!isLoading && shouldRedirectAuthenticatedUser) {
      router.push(redirectTo);
    }
  }, [redirectTo, isLoading, router, shouldRedirectAuthenticatedUser]);

  if (isLoading || shouldRedirectAuthenticatedUser) {
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
      {surface === "admin" ? (
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
            <LoginForm
              surface={surface}
              redirectTo={redirectTo}
              title="Admin sign in"
              body={
                user && user.role !== "admin"
                  ? "You are currently signed in with a different account role. Sign in with an admin account to open the admin workspace."
                  : ""
              }
              helpHref="mailto:info@off2zim.co.zw"
              helpLabel="Request admin support"
              signupHref=""
            signupLabel=""
            showSocialButtons={false}
            compactHeader
          />
        </div>
      ) : (
        <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.06fr_0.94fr] lg:px-8">
          <section
            className="relative overflow-hidden rounded-[34px] bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.58)), url('/images/destinations/eastern-highlands.jpg')",
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
                  <Compass className="h-5 w-5 text-[#ffca74]" />
                  <div className="mt-4 text-lg font-semibold">{panelCopy.cardA}</div>
                  <div className="mt-2 text-sm leading-6 text-white/72">
                    {panelCopy.cardABody}
                  </div>
                </div>
                <div className="rounded-[26px] border border-white/15 bg-black/28 p-5 backdrop-blur-sm">
                  <MapPinned className="h-5 w-5 text-[#9fc7ff]" />
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
            <LoginForm
              surface={surface}
              redirectTo={redirectTo}
              showSocialButtons={false}
              body={
                reason === "session-expired"
                  ? "Your session expired, so we signed you out safely. Sign in again to continue your trip planning."
                  : user && user.role !== surface
                    ? `You are currently signed in as ${user.role}. Sign in with your ${
                        surface === "provider" ? "provider" : "traveler"
                      } account to continue here.`
                  : undefined
              }
            />
          </aside>
        </div>
      )}
    </div>
  );
}
