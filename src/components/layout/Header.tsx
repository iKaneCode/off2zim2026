"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";
import { MobileMenu } from "../ui/MobileMenu";
import { useAuth } from "@/contexts/AuthContext";
import CartComponent from "@/components/payment/CartComponent";
import { getAccountRoute } from "@/lib/auth-routing";
import { getSurfaceHref } from "@/lib/app-surface";
import ThemeToggle from "./ThemeToggle";
import SiteLogo from "./SiteLogo";

const topTabs = [
  { label: "Featured", href: "/" },
  { label: "Stays", href: "/accommodation" },
  { label: "Events", href: "/events" },
  { label: "Experiences", href: "/activities" },
  { label: "Transport", href: "/transport" },
  { label: "Flights", href: "/transport/flights" },
];

function ActionCircle({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[#1c1c1e] transition hover:bg-black/[0.09] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
      aria-label={label}
    >
      {children}
    </button>
  );
}

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
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
    setHasMounted(true);
  }, []);

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

  const isActiveTab = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-[120] bg-[#f2f2f7] text-[#1c1c1e] dark:bg-black dark:text-white">
        <div className="mx-auto flex h-[58px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex w-24 items-center justify-start">
            <ActionCircle label="Open menu" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-5 w-5 text-[#ff3b30]" />
            </ActionCircle>
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <SiteLogo width={156} height={52} className="h-[52px] w-auto" priority />
          </div>

          <div className="flex w-24 items-center justify-end gap-2 sm:w-auto">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <div className="hidden sm:block">
              <CartComponent />
            </div>

            {user ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-black/[0.06] px-3 text-[#1c1c1e] transition hover:bg-black/[0.09] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12] sm:px-4"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1c1c1e] text-xs font-bold text-white dark:bg-white dark:text-[#1c1c1e]">
                    {userInitials}
                  </span>
                  <span className="hidden text-sm font-bold sm:inline">{user.firstName}</span>
                  <ChevronDown className={`hidden h-4 w-4 transition sm:block ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isAccountMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[18rem] rounded-2xl border border-black/10 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#1c1c1e]">
                    <div className="rounded-xl bg-black/[0.04] px-4 py-3 dark:bg-white/[0.06]">
                      <div className="text-sm font-bold text-[#1c1c1e] dark:text-white">{userDisplayName}</div>
                      <div className="mt-1 text-xs font-bold uppercase text-[#8e8e93]">
                        {user.role} account
                      </div>
                    </div>

                    <div className="mt-2 grid gap-1">
                      <Link
                        href={accountRoute}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#1c1c1e] transition hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/[0.06]"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#ff3b30]" />
                        Workspace
                      </Link>
                      <Link
                        href={getSurfaceHref("explorer", "/profile")}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#1c1c1e] transition hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/[0.06]"
                      >
                        <Settings className="h-4 w-4 text-[#ff3b30]" />
                        Profile settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-[#1c1c1e] transition hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/[0.06]"
                      >
                        <LogOut className="h-4 w-4 text-[#ff3b30]" />
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : !isLoading ? (
              <Link
                href={getSurfaceHref("explorer", "/login")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[#1c1c1e] transition hover:bg-black/[0.09] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
                aria-label="Traveler login"
              >
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <span className="h-11 w-11" />
            )}

            <Link
              href="/trip-planner"
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff3b30] text-white transition hover:bg-[#ff5630] sm:flex"
              aria-label="Open trip planner"
            >
              <CalendarDays className="h-5 w-5" />
            </Link>

            <Link
              href="/checkout"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff3b30] text-white transition hover:bg-[#ff5630] sm:hidden"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl overflow-x-auto px-2 pb-1 scrollbar-hide sm:px-4 lg:px-6">
          <div className="flex min-w-max items-center">
            {topTabs.map((tab) => {
              const active = hasMounted && isActiveTab(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative px-4 py-3 text-sm transition ${
                    active
                      ? "font-bold text-[#1c1c1e] dark:text-white"
                      : "font-normal text-[#8e8e93]"
                  }`}
                >
                  {tab.label}
                  {active ? (
                    <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-[#1c1c1e] dark:bg-white" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}
