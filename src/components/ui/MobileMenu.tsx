"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Compass,
  LogOut,
  MapPinned,
  Settings,
  ShoppingBag,
  Store,
  LayoutDashboard,
  X,
} from "lucide-react";
import { getSurfaceHref } from "@/lib/app-surface";
import { getAccountRoute } from "@/lib/auth-routing";
import { useAuth } from "@/contexts/AuthContext";
import SiteLogo from "../layout/SiteLogo";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    label: "Discover",
    icon: Compass,
    links: [
      { label: "Explore", href: "/travel-guide" },
      { label: "Stays", href: "/accommodation" },
      { label: "Events", href: "/events" },
      { label: "Experiences", href: "/activities" },
    ],
  },
  {
    label: "Plan and book",
    icon: MapPinned,
    links: [
      { label: "Itinerary", href: "/trip-planner", requiresAuth: true },
      { label: "Transport", href: "/transport" },
      { label: "Flights", href: "/transport/flights" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Shop", href: "/shop" },
    ],
  },
  {
    label: "Off2Zim",
    icon: Store,
    links: [
      { label: "Featured", href: "/featured-section" },
      { label: "Local guides", href: "/community-guides" },
      { label: "Provider access", href: getSurfaceHref("provider", "/register") },
    ],
  },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [openSection, setOpenSection] = useState("Discover");
  const accountRoute = getAccountRoute(user);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => !("requiresAuth" in link) || !link.requiresAuth || Boolean(user)),
    }))
    .filter((section) => section.links.length > 0);

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push(getSurfaceHref("explorer", "/"));
    router.refresh();
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setOpenSection("Discover");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[190] bg-black/62 backdrop-blur-md md:hidden"
        onClick={onClose}
        aria-label="Close menu overlay"
      />

      <div
        className="fixed inset-y-0 left-0 z-[200] flex w-full max-w-[25rem] flex-col border-r border-black/[0.08] bg-white/88 text-[#1d1d1f] shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#101010]/88 dark:text-white dark:shadow-[0_30px_90px_rgba(0,0,0,0.62)] md:hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/[0.08] px-5 pb-4 pt-5 dark:border-white/[0.09]">
          <SiteLogo width={122} height={38} className="h-9 w-auto" priority />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.055] text-[#1d1d1f] transition hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5">
          {user ? (
            <div className="border-b border-black/[0.08] pb-5 dark:border-white/[0.09]">
              <div className="text-xs uppercase tracking-[0.28em] text-[#86868b] dark:text-white/42">
                Signed in
              </div>
              <div className="mt-3 text-2xl font-semibold leading-tight text-[#1d1d1f] dark:text-white">
                {[user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email}
              </div>
              <div className="mt-2 text-sm text-[#6e6e73] dark:text-white/62">
                Your trip plans, saved places, and account tools are ready.
              </div>

              <div className="mt-4 grid gap-3">
                <Link
                  href={accountRoute}
                  onClick={onClose}
                  className="apple-action"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Open account
                </Link>
                <Link
                  href={getSurfaceHref("explorer", "/profile")}
                  onClick={onClose}
                  className="apple-action-secondary"
                >
                  <Settings className="h-4 w-4" />
                  Profile settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="apple-action-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="border-b border-black/[0.08] pb-5 dark:border-white/[0.09]">
              <div className="text-xs uppercase tracking-[0.28em] text-[#86868b] dark:text-white/42">
                Explore | Experience | Enjoy
              </div>
              <div className="mt-3 text-2xl font-semibold leading-tight text-[#1d1d1f] dark:text-white">
                Choose a destination first, then explore the services available there.
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isSectionOpen = openSection === section.label;

              return (
                <div
                  key={section.label}
                  className="rounded-[1.5rem] border border-black/[0.08] bg-black/[0.035] px-4 py-2 backdrop-blur dark:border-white/[0.09] dark:bg-white/[0.055]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSection((current) =>
                        current === section.label ? "" : section.label,
                      )
                    }
                    className="flex w-full items-center justify-between py-3 text-left"
                    aria-expanded={isSectionOpen}
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#0071e3] shadow-sm dark:bg-black/35 dark:text-[#8ec5ff]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                        {section.label}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#86868b] transition dark:text-white/45 ${
                        isSectionOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isSectionOpen ? (
                    <div className="grid gap-1 pb-2">
                      {section.links.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={onClose}
                          className="rounded-[1rem] px-3 py-3 text-sm font-semibold text-[#424245] transition hover:bg-black/[0.05] hover:text-[#1d1d1f] dark:text-white/78 dark:hover:bg-white/[0.08] dark:hover:text-white"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!isLoading && !user ? (
            <div className="mt-6 grid gap-3">
              <Link
                href={getSurfaceHref("explorer", "/login")}
                onClick={onClose}
                className="apple-action-secondary"
              >
                Traveler login
              </Link>
              <Link
                href={getSurfaceHref("explorer", "/register")}
                onClick={onClose}
                className="apple-action"
              >
                Create account
              </Link>
            </div>
          ) : null}

          {user ? (
            <div className="mt-6 flex items-center gap-3 border-t border-black/[0.08] pt-5 text-sm text-[#6e6e73] dark:border-white/[0.09] dark:text-white/62">
              <CalendarDays className="h-4 w-4 text-[#0071e3]" />
              Your itinerary and saved trip tools are available.
            </div>
          ) : null}

          <Link
            href="/checkout"
            onClick={onClose}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#424245] dark:text-white/84"
          >
            <ShoppingBag className="h-4 w-4 text-[#0071e3]" />
            View basket
          </Link>
        </div>
      </div>
    </>
  );
}
