"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, MapPin, MessageCircle } from "lucide-react";
import { getSurfaceHref } from "@/lib/app-surface";
import { getAccountRoute } from "@/lib/auth-routing";
import { useAuth } from "@/contexts/AuthContext";

const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Destinations", href: "/travel-guide" },
      { label: "Trip Planner", href: "/trip-planner" },
      { label: "Local guidance", href: "/travel-guide" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Access",
    links: [
      { label: "Traveler login", href: getSurfaceHref("explorer", "/login") },
      { label: "Create account", href: getSurfaceHref("explorer", "/register") },
      { label: "Register your business", href: getSurfaceHref("provider", "/register") },
      { label: "Provider sign in", href: getSurfaceHref("provider", "/login") },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Main site", href: "/" },
    ],
  },
];

export default function Footer() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const accountRoute = getAccountRoute(user);
  const accessLinks =
    !isLoading && user
      ? [
          { label: "Open account", href: accountRoute },
          { label: "Profile settings", href: getSurfaceHref("explorer", "/profile") },
          { label: "Register your business", href: getSurfaceHref("provider", "/register") },
          { label: "Provider sign in", href: getSurfaceHref("provider", "/login") },
        ]
      : footerColumns.find((column) => column.title === "Access")?.links || [];

  const handleLogout = async () => {
    await logout();
    router.push(getSurfaceHref("explorer", "/"));
    router.refresh();
  };

  return (
    <footer className="border-t border-white/10 bg-[#070707] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-white/10 bg-[#121212] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.28em] text-white/45">
              Off2Zim
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold text-white">
              Off2Zim helps travelers discover Zimbabwe, plan with confidence, and book in one place.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
              Explore destinations, plan your route, ask locals for advice, and request travel help when you need it.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <>
                  <Link
                    href={accountRoute}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
                  >
                    Open account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={getSurfaceHref("explorer", "/login")}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
                  >
                    Traveler login
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={getSurfaceHref("provider", "/register")}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Register your business
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Compass className="h-4 w-4 text-[#7ddf8c]" />
                  Destination-based discovery
                </div>
              </div>
              <div className="rounded-[24px] bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <MessageCircle className="h-4 w-4 text-[#5aa7ff]" />
                  Local advice and travel help
                </div>
              </div>
              <div className="rounded-[24px] bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <ArrowRight className="h-4 w-4 text-[#ffc247]" />
                  Clear next steps
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[32px] border border-white/10 bg-[#121212] p-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-2xl bg-[#2a1614] p-3">
                  <MapPin className="h-4 w-4 text-[#ff7352]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Based in Zimbabwe
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    4 Fairmile Close, Ruwa, Harare, Zimbabwe
                    <br />
                    info@off2zim.co.zw
                    <br />
                    +263 772 316 693
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
              {footerColumns.map((column) => (
                <div
                  key={column.title}
                  className="rounded-[32px] border border-white/10 bg-[#121212] p-6"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {column.title}
                  </h3>
                  <div className="mt-4 space-y-3">
                    {column.links.map((link) => (
                      column.title === "Access" ? null : (
                        <Link
                          key={link.label}
                          href={link.href}
                          className="block text-sm text-white/65 transition hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )
                    ))}
                    {column.title === "Access"
                      ? accessLinks.map((link) => (
                          <Link
                            key={link.label}
                            href={link.href}
                            className="block text-sm text-white/65 transition hover:text-white"
                          >
                            {link.label}
                          </Link>
                        ))
                      : null}
                    {column.title === "Access" && !isLoading && user ? (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block text-left text-sm text-white/65 transition hover:text-white"
                      >
                        Sign out
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Off2Zim. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
