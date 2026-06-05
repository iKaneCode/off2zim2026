"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { getSurfaceHref } from "@/lib/app-surface";
import { getAccountRoute } from "@/lib/auth-routing";
import { useAuth } from "@/contexts/AuthContext";
import SiteLogo from "./SiteLogo";

const footerColumns = [
  {
    title: "Discover",
    links: [
      { label: "Destinations", href: "/travel-guide" },
      { label: "Stays", href: "/accommodation" },
      { label: "Things to do", href: "/activities" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Plan",
    links: [
      { label: "Trip planner", href: "/trip-planner" },
      { label: "Transport", href: "/transport" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Shop", href: "/shop" },
    ],
  },
  {
    title: "Off2Zim",
    links: [
      { label: "Community guides", href: "/community-guides" },
      { label: "Contact", href: "/contact" },
      { label: "Provider access", href: getSurfaceHref("provider", "/register") },
      { label: "Support", href: "/support" },
    ],
  },
];

const trustItems = [
  { label: "Verified providers", icon: BadgeCheck },
  { label: "Secure checkout", icon: ShieldCheck },
  { label: "Local support", icon: MessageCircle },
];

export default function Footer() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const accountRoute = getAccountRoute(user);

  const handleLogout = async () => {
    await logout();
    router.push(getSurfaceHref("explorer", "/"));
    router.refresh();
  };

  return (
    <footer className="border-t border-black/[0.08] bg-[#f5f5f7] text-[#1d1d1f] dark:border-white/[0.09] dark:bg-[#050505] dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="apple-surface rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1.35fr]">
            <div>
              <SiteLogo width={142} height={44} className="h-11 w-auto" />
              <h2 className="mt-6 max-w-xl text-3xl font-bold leading-tight text-[#1d1d1f] dark:text-white">
                Explore, experience, and enjoy Zimbabwe from one clean travel workspace.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#6e6e73] dark:text-white/62">
                Destination-led discovery, verified providers, trip planning, checkout, and messaging built to feel simple on every screen.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {trustItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/64 px-3 py-2 text-xs font-semibold text-[#424245] backdrop-blur dark:border-white/[0.09] dark:bg-white/[0.06] dark:text-white/72"
                    >
                      <Icon className="h-4 w-4 text-[#0071e3]" />
                      {item.label}
                    </span>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {user ? (
                  <>
                    <Link href={accountRoute} className="apple-action">
                      Open account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button type="button" onClick={handleLogout} className="apple-action-secondary">
                      Sign out
                    </button>
                  </>
                ) : !isLoading ? (
                  <>
                    <Link href={getSurfaceHref("explorer", "/login")} className="apple-action">
                      Traveler login
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href={getSurfaceHref("provider", "/register")} className="apple-action-secondary">
                      Register business
                    </Link>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#86868b] dark:text-white/42">
                    {column.title}
                  </h3>
                  <div className="mt-4 grid gap-3">
                    {column.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-sm font-semibold text-[#424245] transition hover:text-[#0071e3] dark:text-white/72 dark:hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-black/[0.08] pt-5 text-xs font-semibold text-[#86868b] dark:border-white/[0.09] dark:text-white/42 md:flex-row md:items-center md:justify-between">
            <p>(c) 2026 Off2Zim. All rights reserved.</p>
            <p>4 Fairmile Close, Ruwa, Harare, Zimbabwe | info@off2zim.co.zw</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
