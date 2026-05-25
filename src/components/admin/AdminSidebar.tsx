"use client";

import Link from "next/link";
import {
  Building2,
  Flag,
  LayoutDashboard,
  ListChecks,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { getSurfaceHref } from "@/lib/app-surface";
import { cn } from "@/lib/utils";

const adminNav = [
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
];

export default function AdminSidebar({ activePath }: { activePath: string }) {
  return (
    <aside className="border-r border-slate-200 bg-[#fbfbfb] dark:border-white/10 dark:bg-[#0b0b0b]">
      <div className="sticky top-0 px-4 py-5">
        <div className="flex items-start justify-between gap-3 px-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-white/35">
              Off2Zim Admin
            </div>
            <div className="mt-3 text-sm text-slate-500 dark:text-white/45">
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
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-[#ff5630] text-white"
                    : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-white/70 dark:hover:bg-white/[0.04] dark:hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
