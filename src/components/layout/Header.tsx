"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Bus,
  CalendarDays,
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

type NavLinkItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navLinks: NavLinkItem[] = [
  { label: "Destinations", href: "/travel-guide", icon: Compass },
  { label: "Stays", href: "/accommodation", icon: BedDouble },
  { label: "Things to do", href: "/activities", icon: MapPinned },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Transport", href: "/transport", icon: Bus },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
];

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-black/[0.06] hover:text-slate-950 dark:text-white/82 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon className="h-4 w-4 text-[#ff5630]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isLoading && !user ? (
              <Link
                href={getSurfaceHref("explorer", "/register")}
                className="hidden items-center gap-2 whitespace-nowrap rounded-full bg-[#ff5630] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] md:inline-flex"
              >
                Create account
              </Link>
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
