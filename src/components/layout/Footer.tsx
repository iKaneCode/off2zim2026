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
    title: "Book",
    links: [
      { label: "Trip planner", href: "/trip-planner" },
      { label: "Transport", href: "/transport" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Shop", href: "/shop" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Community guides", href: "/community-guides" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
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
    <footer className="border-t border-white/10 bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1.4fr]">
          <div>
            <SiteLogo width={140} height={44} className="h-11 w-auto" />
            <p className="mt-4 max-w-md text-sm leading-6 text-white/62">
              Explore, experience, and enjoy Zimbabwe through destination-led discovery,
              verified providers, trip planning, and a marketplace built for travel.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/76"
                  >
                    <Icon className="h-4 w-4 text-[#ff7352]" />
                    {item.label}
                  </span>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {user ? (
                <>
                  <Link
                    href={accountRoute}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff5630] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff6f4d]"
                  >
                    Open account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]"
                  >
                    Sign out
                  </button>
                </>
              ) : !isLoading ? (
                <>
                  <Link
                    href={getSurfaceHref("explorer", "/login")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff5630] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff6f4d]"
                  >
                    Traveler login
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={getSurfaceHref("provider", "/register")}
                    className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]"
                  >
                    Register business
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-bold uppercase text-white/44">{column.title}</h3>
                <div className="mt-4 grid gap-3">
                  {column.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm font-bold text-white/76 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs font-bold text-white/42 md:flex-row md:items-center md:justify-between">
          <p>(c) 2026 Off2Zim. All rights reserved.</p>
          <p>4 Fairmile Close, Ruwa, Harare, Zimbabwe | info@off2zim.co.zw</p>
        </div>
      </div>
    </footer>
  );
}
