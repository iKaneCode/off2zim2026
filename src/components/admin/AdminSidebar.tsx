"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Flag,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useSupportUnreadCount } from "@/hooks/useSupportUnreadCount";
import { getSurfaceHref } from "@/lib/app-surface";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

const adminNav: AdminNavItem[] = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  {
    label: "Service Providers",
    href: "/admin/service-providers",
    icon: Building2,
  },
  { label: "Listings", href: "/admin/listings", icon: ShoppingBag },
  { label: "Bookings", href: "/admin/bookings", icon: ListChecks },
  { label: "Disputes", href: "/admin/disputes", icon: Flag },
  { label: "Revenue", href: "/admin/revenue", icon: Wallet },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Messages", href: "/admin/messages", icon: MessageSquareText },
  { label: "Activity Log", href: "/admin/activity-log" },
];

export default function AdminSidebar({ activePath }: { activePath: string }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const unreadMessages = useSupportUnreadCount(
    "/api/admin/messages?summary=unread",
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.push(getSurfaceHref("public", "/"));
  };

  return (
    <aside className="border-r border-slate-200 bg-[#fbfbfb] dark:border-white/10 dark:bg-[#0b0b0b]">
      <div className="sticky top-0 px-4 py-5">
        <div className="flex items-start justify-between gap-3 px-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-950 dark:text-white">
              Off2Zim Admin
            </div>
            <div className="mt-3 text-sm text-slate-950 dark:text-white">
              Marketplace operations
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="mt-6 space-y-1.5">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              activePath === item.href ||
              activePath.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={getSurfaceHref("admin", item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-[#ff5630] font-bold text-white"
                    : "font-medium text-slate-950 hover:bg-white dark:text-white dark:hover:bg-white/[0.04]",
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                <span>{item.label}</span>
                {item.href === "/admin/messages" && unreadMessages > 0 ? (
                  <span
                    className={cn(
                      "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      isActive
                        ? "bg-white text-[#ff5630]"
                        : "bg-rose-500 text-white",
                    )}
                    aria-label={`${unreadMessages} unread messages`}
                  >
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-950 transition hover:bg-white disabled:pointer-events-none disabled:opacity-55 dark:text-white dark:hover:bg-white/[0.04]"
          >
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
