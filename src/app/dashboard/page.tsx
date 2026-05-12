"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import { ArrowRight, Compass, Heart, MapPinned, ReceiptText, ShieldCheck, UserRoundCheck } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { TRIP_PLANNER_STORAGE_KEY } from "@/contexts/TripPlannerContext";
import { explorerWorkspaceCards } from "@/lib/surface-config";
import { apiFetch } from "@/lib/client-api";

interface DashboardStats {
  savedCount: number;
  bookingCount: number;
  plannerItemCount: number;
}

function useDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({ savedCount: 0, bookingCount: 0, plannerItemCount: 0 });

  useEffect(() => {
    // Read planner item count from localStorage (no API needed)
    let plannerItemCount = 0;
    try {
      const raw = localStorage.getItem(TRIP_PLANNER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        plannerItemCount = Array.isArray(parsed.items) ? parsed.items.length : 0;
      }
    } catch { /* ignore */ }

    Promise.all([
      apiFetch<{ favorites: unknown[] }>("/api/favorites").catch(() => ({ favorites: [] })),
      apiFetch<{ bookings: unknown[] }>("/api/bookings").catch(() => ({ bookings: [] })),
    ]).then(([fav, bk]) => {
      setStats({
        savedCount: fav.favorites.length,
        bookingCount: bk.bookings.length,
        plannerItemCount,
      });
    });
  }, []);

  return stats;
}

function ExplorerDashboardShell() {
  const { user } = useAuth();
  const stats = useDashboardStats();
  const readinessChecks = [
    { label: "Email verified", done: !!user?.isVerified },
    { label: "Phone added", done: !!user?.profile?.phone },
    { label: "Nationality added", done: !!user?.profile?.nationality },
    { label: "Explorer type set", done: !!user?.explorerType || !!user?.profile?.explorerType },
  ];
  const readinessCount = readinessChecks.filter((item) => item.done).length;
  const readinessPercent = Math.round((readinessCount / readinessChecks.length) * 100);

  return (
    <div className="theme-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="theme-panel-strong overflow-hidden rounded-[34px]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <p className="theme-label text-xs uppercase tracking-[0.24em]">
                Traveler workspace
              </p>
              <h1 className="theme-heading mt-3 text-4xl font-semibold">
                {user?.firstName ? `Welcome back, ${user.firstName}` : "Welcome back"}
              </h1>
              <p className="theme-muted mt-4 max-w-2xl text-sm leading-7">
                Trips, bookings, saved places, and planning tools stay connected here.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/trip-planner"
                  className="inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
                >
                  Open planner
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/travel-guide"
                  className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                >
                  Explore destinations
                </Link>
                <Link
                  href="/events"
                  className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                >
                  Explore events
                </Link>
              </div>
            </div>
            <div className="grid gap-3 bg-black/[0.03] p-6 dark:bg-white/[0.02] md:grid-cols-2 md:p-8">
              <WorkspaceStat
                label="Saved places"
                value={stats.savedCount > 0 ? String(stats.savedCount) : "—"}
                meta="Ready to revisit"
                icon={<Heart className="h-5 w-5 text-[#ff7352]" />}
              />
              <WorkspaceStat
                label="Trip plans"
                value={stats.plannerItemCount > 0 ? String(stats.plannerItemCount) : "—"}
                meta={stats.plannerItemCount > 0 ? `Item${stats.plannerItemCount !== 1 ? "s" : ""} in planner` : "Start planning"}
                icon={<MapPinned className="h-5 w-5 text-[#5aa7ff]" />}
              />
              <WorkspaceStat
                label="Bookings"
                value={stats.bookingCount > 0 ? String(stats.bookingCount) : "—"}
                meta="Current trip activity"
                icon={<ReceiptText className="h-5 w-5 text-[#8cf0a1]" />}
              />
              <WorkspaceStat
                label="Account"
                value={user?.explorerType === "local" ? "Local" : "Explorer"}
                meta="Profile status"
                icon={<Compass className="h-5 w-5 text-[#ffc247]" />}
              />
            </div>
          </div>
        </section>

        <section>
          <AppServiceStrip activeLabel="Trip Planner" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="theme-panel rounded-[32px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="theme-label text-xs uppercase tracking-[0.24em]">
                  Account readiness
                </p>
                <h2 className="theme-heading mt-3 text-2xl font-semibold">
                  Keep your travel account ready for your next booking
                </h2>
                <p className="theme-muted mt-3 text-sm leading-6">
                  Verified contact details and a complete profile make booking, support, and account recovery much easier.
                </p>
              </div>
              <div className="theme-card-soft rounded-[24px] px-4 py-3 text-right">
                <div className="theme-heading text-3xl font-semibold">{readinessPercent}%</div>
                <div className="theme-subtle mt-1 text-xs">Profile readiness</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {readinessChecks.map((item) => (
                <div key={item.label} className="theme-card-soft rounded-[22px] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="theme-heading text-sm font-medium">{item.label}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.done
                          ? "bg-[#0f2a1e] text-[#4ade80]"
                          : "bg-[#2d1714] text-[#ffb09c]"
                      }`}
                    >
                      {item.done ? "Ready" : "Action needed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f4d]"
              >
                Complete profile
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!user?.isVerified ? (
                <Link
                  href="/auth/verify-email/request"
                  className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                >
                  Verify email
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4">
            <WorkspaceTrustCard
              title="Email status"
              value={user?.isVerified ? "Verified" : "Pending"}
              body={
                user?.isVerified
                  ? "Your email is confirmed and ready for account recovery."
                  : "Confirm your email to strengthen recovery and account security."
              }
              icon={<ShieldCheck className="h-5 w-5 text-[#5aa7ff]" />}
            />
            <WorkspaceTrustCard
              title="Explorer identity"
              value={user?.explorerType === "local" ? "Local explorer" : "Visiting explorer"}
              body="This helps us show the most relevant planning guidance for your trip."
              icon={<Compass className="h-5 w-5 text-[#ffc247]" />}
            />
            <WorkspaceTrustCard
              title="Profile coverage"
              value={`${readinessCount}/${readinessChecks.length} complete`}
              body="A complete profile helps you move through planning and booking with fewer delays."
              icon={<UserRoundCheck className="h-5 w-5 text-[#8cf0a1]" />}
            />
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {explorerWorkspaceCards.map((card) => {
            const Icon = card.icon;
            return (
              <DashboardCard
                key={card.title}
                title={card.title}
                body={card.body}
                href={card.href}
                label={card.label}
                icon={<Icon className={`h-5 w-5 ${card.accent}`} />}
              />
            );
          })}
        </section>

        <section className="theme-panel rounded-[32px] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="theme-heading text-2xl font-semibold">
                Continue where the trip is moving next
              </h2>
              <p className="theme-muted mt-2 text-sm leading-6">
                Start with a destination, then explore the stays, dining, and local services available there while keeping global tools nearby.
              </p>
            </div>
            <Link
              href="/travel-guide"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-4 py-2 text-sm font-medium theme-muted transition hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              Explore destinations
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function WorkspaceTrustCard({
  title,
  value,
  body,
  icon,
}: {
  title: string;
  value: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <div className="theme-card rounded-[28px] p-5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="theme-subtle text-sm">{title}</span>
      </div>
      <div className="theme-heading mt-4 text-2xl font-semibold">{value}</div>
      <p className="theme-muted mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}

function WorkspaceStat({
  label,
  value,
  meta,
  icon,
}: {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
}) {
  return (
    <div className="theme-card-soft rounded-[26px] p-4">
      <div className="theme-subtle flex items-center gap-2 text-sm">
        {icon}
        {label}
      </div>
      <div className="theme-heading mt-3 text-3xl font-semibold">{value}</div>
      <div className="theme-subtle mt-1 text-xs">{meta}</div>
    </div>
  );
}

function DashboardCard({
  title,
  body,
  href,
  label,
  icon,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="theme-card rounded-[30px] p-6">
      {icon}
      <h2 className="theme-heading mt-4 text-2xl font-semibold">{title}</h2>
      <p className="theme-muted mt-3 text-sm leading-6">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-full border border-black/10 bg-black/[0.04] px-4 py-2 text-sm theme-muted transition hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
      >
        {label}
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <ExplorerDashboardShell />
    </ProtectedRoute>
  );
}
