"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Compass,
  LogOut,
  MapPinned,
  Settings,
  Menu,
  ShoppingBag,
  LayoutDashboard,
  User,
} from "lucide-react";
import { MobileMenu } from "../ui/MobileMenu";
import { useAuth } from "@/contexts/AuthContext";
import CartComponent from "@/components/payment/CartComponent";
import { getAccountRoute } from "@/lib/auth-routing";
import { getSurfaceHref } from "@/lib/app-surface";
import ThemeToggle from "./ThemeToggle";
import SiteLogo from "./SiteLogo";

type NavGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ label: string; href: string; description: string }>;
};

const navGroups: NavGroup[] = [
  {
    label: "Explore",
    icon: Compass,
    items: [
      {
        label: "Destinations",
        href: "/travel-guide",
        description: "Explore cities, parks, heritage sites, and scenic places across Zimbabwe.",
      },
      {
        label: "Events",
        href: "/events",
        description: "Find festivals, shows, and travel dates worth planning around.",
      },
    ],
  },
  {
    label: "Plan",
    icon: MapPinned,
    items: [
      {
        label: "Trip Planner",
        href: "/trip-planner",
        description: "Build your itinerary, organize each day, and keep your route on track.",
      },
      {
        label: "Transport",
        href: "/transport",
        description: "Flights, cars, buses, taxis, and route planning.",
      },
      {
        label: "Events",
        href: "/events",
        description: "Tickets, festivals, and live dates.",
      },
      {
        label: "Destination services",
        href: "/travel-guide",
        description: "Choose a destination first, then see its stays, dining, and local travel help.",
      },
    ],
  },
];

function DesktopDropdown({
  group,
  isOpen,
  onToggle,
  onClose,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const Icon = group.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-black/[0.06] hover:text-slate-950 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
        aria-expanded={isOpen}
      >
        <Icon className="h-4 w-4 text-[#ff7352]" />
        <span>{group.label}</span>
        <ChevronDown
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.9rem)] z-50 w-[22rem] rounded-[28px] border border-black/12 bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#0e0e0e] dark:shadow-[0_28px_80px_rgba(0,0,0,0.6)]">
          <div className="mb-2 px-3 pt-2">
            <div className="text-xs uppercase tracking-[0.24em] text-black/45 dark:text-white/40">
              {group.label}
            </div>
          </div>
          <div className="grid gap-1">
            {group.items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="rounded-[22px] px-3 py-3 transition hover:bg-black/[0.055] dark:hover:bg-white/7"
              >
                <div className="text-sm font-semibold text-black dark:text-white">
                  {item.label}
                </div>
                <div className="mt-1 text-sm leading-5 text-black/68 dark:text-white/78">
                  {item.description}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const accountRoute = getAccountRoute(user);

  const userInitials = useMemo(() => {
    if (!user) return "";
    return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  }, [user]);

  const userDisplayName = useMemo(() => {
    if (!user) return "";
    return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
  }, [user]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    await logout();
    router.push(getSurfaceHref("explorer", "/"));
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-[120] border-b border-black/10 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#050505] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsMobileMenuOpen(true);
              }}
              className="relative z-[130] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#2a1614] text-[#ff7352] transition hover:bg-[#351b18] md:hidden"
              aria-label="Open menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <SiteLogo
              width={128}
              height={40}
              className="h-9 w-auto sm:h-10"
              priority
            />
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {navGroups.map((group) => (
              <DesktopDropdown
                key={group.label}
                group={group}
                isOpen={openGroup === group.label}
                onToggle={() =>
                  setOpenGroup((current) =>
                    current === group.label ? null : group.label,
                  )
                }
                onClose={() => setOpenGroup(null)}
              />
            ))}

            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-black/[0.06] hover:text-slate-950 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
            >
              Marketplace
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isLoading && !user ? (
              <>
                <Link
                  href={getSurfaceHref("explorer", "/login")}
                  className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-black/[0.06] hover:text-slate-950 dark:text-white dark:hover:bg-white/10 dark:hover:text-white md:inline-flex"
                >
                  Traveler login
                </Link>
                <Link
                  href={getSurfaceHref("explorer", "/register")}
                  className="hidden items-center gap-2 rounded-full bg-[#ff5630] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] md:inline-flex"
                >
                  Create account
                </Link>
              </>
            ) : null}

            <ThemeToggle />

            <div className="hidden md:block">
              <CartComponent />
            </div>

            {user ? (
              <div className="relative hidden md:block" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#161616] dark:text-white dark:hover:bg-[#1d1d1d] md:px-4"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f3f87] text-xs font-semibold text-white">
                    {userInitials}
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.firstName}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isAccountMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.9rem)] z-50 w-[18rem] rounded-[28px] border border-black/12 bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#0e0e0e] dark:shadow-[0_28px_80px_rgba(0,0,0,0.6)]">
                    <div className="rounded-[22px] bg-black/[0.035] px-4 py-4 dark:bg-white/[0.04]">
                      <div className="text-sm font-semibold text-black dark:text-white">{userDisplayName}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                        {user.role} account
                      </div>
                    </div>

                    <div className="mt-2 grid gap-1">
                      <Link
                        href={accountRoute}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[20px] px-3 py-3 text-sm font-medium text-slate-900 transition hover:bg-black/[0.055] dark:text-white/90 dark:hover:bg-white/7"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#ff5630]" />
                        Workspace
                      </Link>
                      <Link
                        href={getSurfaceHref("explorer", "/profile")}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[20px] px-3 py-3 text-sm font-medium text-slate-900 transition hover:bg-black/[0.055] dark:text-white/90 dark:hover:bg-white/7"
                      >
                        <Settings className="h-4 w-4 text-[#ff5630]" />
                        Profile settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-black/[0.055] dark:text-white/90 dark:hover:bg-white/7"
                      >
                        <LogOut className="h-4 w-4 text-[#ff5630]" />
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href={getSurfaceHref("explorer", "/login")}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#161616] dark:text-white dark:hover:bg-[#1d1d1d] md:px-4"
                aria-label="Traveler login"
              >
                <span className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="hidden text-sm font-medium md:inline">
                    Account
                  </span>
                </span>
              </Link>
            )}

            <Link
              href="/checkout"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff5630] text-white transition hover:bg-[#ff6f4d] md:hidden"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
