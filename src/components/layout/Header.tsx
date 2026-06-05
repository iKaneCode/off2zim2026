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
  Search,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";
import { MobileMenu } from "../ui/MobileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { usePayment } from "@/contexts/PaymentContext";
import { getAccountRoute } from "@/lib/auth-routing";
import { getSurfaceHref } from "@/lib/app-surface";
import ThemeToggle from "./ThemeToggle";
import SiteLogo from "./SiteLogo";

const navLinks = [
  { label: "Featured", href: "/" },
  { label: "Destinations", href: "/travel-guide" },
  { label: "Stays", href: "/accommodation" },
  { label: "Events", href: "/events" },
  { label: "Things To Do", href: "/activities" },
  { label: "Transport", href: "/transport" },
  { label: "Shop", href: "/shop" },
];

function HeaderIconButton({
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
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1d1d1f] transition hover:bg-black/[0.055] dark:text-white dark:hover:bg-white/[0.09]"
      aria-label={label}
    >
      {children}
    </button>
  );
}

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const { getItemCount } = usePayment();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const accountRoute = getAccountRoute(user);
  const cartCount = getItemCount();

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
    if (!isAccountMenuOpen) return;

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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-[120] border-b border-black/[0.08] bg-white/72 text-[#1d1d1f] backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#050505]/72 dark:text-white">
        <div className="mx-auto grid h-12 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5">
            <HeaderIconButton label="Open menu" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-[18px] w-[18px] text-[#1d1d1f] dark:text-white" />
            </HeaderIconButton>
            <div className="hidden sm:block">
              <SiteLogo width={104} height={34} className="h-8 w-auto" priority />
            </div>
          </div>

          <div className="flex justify-center sm:hidden">
            <SiteLogo width={104} height={34} className="h-8 w-auto" priority />
          </div>

          <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="Primary navigation">
            {navLinks.map((link) => {
              const active = hasMounted && isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-black text-white dark:bg-white dark:text-[#1d1d1f]"
                      : "text-[#424245] hover:bg-black/[0.055] hover:text-[#1d1d1f] dark:text-white/68 dark:hover:bg-white/[0.09] dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-1.5">
            <Link
              href="/travel-guide"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-[#1d1d1f] transition hover:bg-black/[0.055] dark:text-white dark:hover:bg-white/[0.09] md:inline-flex"
              aria-label="Search destinations"
            >
              <Search className="h-[18px] w-[18px]" />
            </Link>

            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            <Link
              href="/checkout"
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1d1d1f] transition hover:bg-black/[0.055] dark:text-white dark:hover:bg-white/[0.09]"
              aria-label="Open basket"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0071e3] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>

            <Link
              href="/trip-planner"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white transition hover:bg-[#147ce5] md:inline-flex"
              aria-label="Open trip planner"
            >
              <CalendarDays className="h-[18px] w-[18px]" />
            </Link>

            {user ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full px-1.5 text-[#1d1d1f] transition hover:bg-black/[0.055] dark:text-white dark:hover:bg-white/[0.09] sm:px-2.5"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-bold text-white dark:bg-white dark:text-[#1d1d1f]">
                    {userInitials}
                  </span>
                  <ChevronDown className={`hidden h-3.5 w-3.5 transition sm:block ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isAccountMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[18rem] rounded-[1.35rem] border border-black/[0.08] bg-white/92 p-2 shadow-[0_26px_80px_rgba(0,0,0,0.2)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#1d1d1f]/92">
                    <div className="rounded-[1rem] bg-black/[0.035] px-4 py-3 dark:bg-white/[0.065]">
                      <div className="truncate text-sm font-bold text-[#1d1d1f] dark:text-white">{userDisplayName}</div>
                      <div className="mt-1 text-xs font-semibold uppercase text-[#86868b]">
                        {user.role} account
                      </div>
                    </div>

                    <div className="mt-2 grid gap-1">
                      <Link
                        href={accountRoute}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-black/[0.045] dark:text-white dark:hover:bg-white/[0.07]"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#0071e3]" />
                        Workspace
                      </Link>
                      <Link
                        href={getSurfaceHref("explorer", "/profile")}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-black/[0.045] dark:text-white dark:hover:bg-white/[0.07]"
                      >
                        <Settings className="h-4 w-4 text-[#0071e3]" />
                        Profile settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-semibold text-[#1d1d1f] transition hover:bg-black/[0.045] dark:text-white dark:hover:bg-white/[0.07]"
                      >
                        <LogOut className="h-4 w-4 text-[#0071e3]" />
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : !isLoading ? (
              <Link
                href={getSurfaceHref("explorer", "/login")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1d1d1f] transition hover:bg-black/[0.055] dark:text-white dark:hover:bg-white/[0.09]"
                aria-label="Traveler login"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
            ) : (
              <span className="h-9 w-9" />
            )}
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide sm:px-6 lg:hidden lg:px-8" aria-label="Mobile public navigation">
          {navLinks.map((link) => {
            const active = hasMounted && isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-black text-white dark:bg-white dark:text-[#1d1d1f]"
                    : "text-[#6e6e73] hover:bg-black/[0.055] dark:text-white/62 dark:hover:bg-white/[0.08]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}
