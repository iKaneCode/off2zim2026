"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  DollarSign,
  Loader2,
  MessageSquare,
  Package,
  TrendingUp,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";

interface ProviderAnalytics {
  periodLabel: string;
  currency: string;
  metrics: {
    totalRevenue: number;
    periodRevenue: number;
    totalBookings: number;
    periodBookings: number;
    pendingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    activeDisputes: number;
    activeListings: number;
    totalListings: number;
    bookingRate: number;
    averageOrderValue: number;
  };
  revenueSeries: { label: string; revenue: number }[];
  topListings: {
    id: string;
    title: string;
    status: string;
    bookings: number;
    revenue: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    title: string;
    body: string;
    meta: string;
    amount: string;
  }[];
}

function money(value: number, currency = "USD") {
  return `${currency} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function statusTone(type: string) {
  if (type === "dispute") return "text-[#ff8a78]";
  if (type === "payout") return "text-[#8dc9ff]";
  return "text-[#8cf0a1]";
}

export default function ProviderOverview({
  onNavigateToTab,
}: {
  onNavigateToTab?: (tabId: string) => void;
}) {
  const [analytics, setAnalytics] = useState<ProviderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ analytics: ProviderAnalytics }>("/api/provider/analytics")
      .then((payload) => {
        setAnalytics(payload.analytics);
        setError("");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load analytics.")
      )
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = useMemo(() => {
    if (!analytics) return 0;
    return Math.max(...analytics.revenueSeries.map((item) => item.revenue), 1);
  }, [analytics]);

  if (loading) {
    return (
      <div className="theme-panel rounded-[32px] p-8">
        <div className="flex items-center gap-3 text-sm theme-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading provider analytics...
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="theme-panel rounded-[32px] p-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-[#ff8a78]" />
          <div>
            <h2 className="theme-heading text-lg font-semibold">
              Analytics unavailable
            </h2>
            <p className="theme-muted mt-2 text-sm">
              {error || "Provider analytics could not be loaded right now."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Revenue",
      value: money(analytics.metrics.periodRevenue, analytics.currency),
      detail: `${money(analytics.metrics.totalRevenue, analytics.currency)} total`,
      icon: <DollarSign className="h-5 w-5 text-[#8cf0a1]" />,
    },
    {
      title: "Bookings",
      value: analytics.metrics.periodBookings.toString(),
      detail: `${analytics.metrics.totalBookings} total bookings`,
      icon: <Calendar className="h-5 w-5 text-[#8dc9ff]" />,
    },
    {
      title: "Booking rate",
      value: `${analytics.metrics.bookingRate}%`,
      detail: `${analytics.metrics.completedBookings} completed`,
      icon: <TrendingUp className="h-5 w-5 text-[#ffca74]" />,
    },
    {
      title: "Open issues",
      value: analytics.metrics.activeDisputes.toString(),
      detail: `${analytics.metrics.pendingBookings} pending bookings`,
      icon: <MessageSquare className="h-5 w-5 text-[#ff8a63]" />,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="theme-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="theme-heading text-2xl font-semibold">
              Performance overview
            </h2>
            <p className="theme-muted mt-2 text-sm leading-6">
              Live booking, revenue, listing, and dispute performance for your
              provider account.
            </p>
          </div>
          <div className="theme-chip rounded-full px-4 py-2 text-sm">
            {analytics.periodLabel}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.title} className="theme-card-soft p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/[0.05] dark:bg-white/[0.05]">
                  {metric.icon}
                </div>
              </div>
              <div className="theme-heading mt-4 text-3xl font-semibold">
                {metric.value}
              </div>
              <div className="theme-subtle mt-1 text-sm">{metric.title}</div>
              <div className="theme-muted mt-3 text-xs">{metric.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="theme-panel rounded-[32px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="theme-heading text-2xl font-semibold">
                Revenue trend
              </h2>
              <p className="theme-muted mt-1 text-sm">
                Confirmed and completed booking revenue by month.
              </p>
            </div>
            <BarChart3 className="theme-subtle h-6 w-6" />
          </div>

          <div className="mt-6 flex h-72 items-end gap-3 rounded-[24px] border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            {analytics.revenueSeries.map((item) => {
              const height = Math.max((item.revenue / maxRevenue) * 100, 4);
              return (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-52 w-full items-end">
                    <div
                      className="w-full rounded-t-2xl bg-[#ff5630]"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <div className="text-xs theme-muted">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="theme-panel rounded-[32px] p-6">
          <div className="flex items-center justify-between">
            <h2 className="theme-heading text-2xl font-semibold">Recent activity</h2>
            <button
              onClick={() => onNavigateToTab?.("orders")}
              className="theme-muted text-sm hover:text-slate-950 dark:hover:text-white"
            >
              View orders
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {analytics.recentActivity.length > 0 ? (
              analytics.recentActivity.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="theme-card-soft p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="theme-heading font-semibold">{activity.title}</h3>
                      <p className="theme-muted mt-1 text-sm">{activity.body}</p>
                      <p className="theme-subtle mt-2 text-xs">
                        {new Date(activity.meta).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`text-sm font-semibold ${statusTone(activity.type)}`}>
                      {activity.amount}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="theme-card-soft p-5 text-sm theme-muted">
                No booking, dispute, or payout activity yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="theme-panel rounded-[32px] p-6">
          <h2 className="theme-heading text-2xl font-semibold">Listing health</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Active listings"
              value={`${analytics.metrics.activeListings}/${analytics.metrics.totalListings}`}
            />
            <MiniStat
              label="Average order value"
              value={money(analytics.metrics.averageOrderValue, analytics.currency)}
            />
          </div>
          <button
            onClick={() => onNavigateToTab?.("listings")}
            className="mt-5 rounded-full bg-[#ff5630] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff7352]"
          >
            Manage listings
          </button>
        </div>

        <div className="theme-panel rounded-[32px] p-6">
          <h2 className="theme-heading text-2xl font-semibold">Top listings</h2>
          <div className="mt-5 space-y-3">
            {analytics.topListings.length > 0 ? (
              analytics.topListings.map((listing) => (
                <div
                  key={listing.id}
                  className="theme-card-soft flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] dark:bg-white/[0.05]">
                      <Package className="h-4 w-4 text-[#ff7352]" />
                    </div>
                    <div className="min-w-0">
                      <div className="theme-heading truncate font-semibold">
                        {listing.title}
                      </div>
                      <div className="theme-muted mt-1 text-xs">
                        {listing.bookings} bookings - {listing.status}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[#8cf0a1]">
                    {money(listing.revenue, analytics.currency)}
                  </div>
                </div>
              ))
            ) : (
              <div className="theme-card-soft p-5 text-sm theme-muted">
                Add listings and receive bookings to see performance ranking.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="theme-panel rounded-[32px] p-6">
        <h2 className="theme-heading text-2xl font-semibold">Quick actions</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <QuickAction
            title="Add new listing"
            body="Create a stay, activity, service, or product for travelers to book."
            onClick={() => onNavigateToTab?.("listings")}
          />
          <QuickAction
            title="Review orders"
            body="Confirm requests, complete bookings, and monitor disputes."
            onClick={() => onNavigateToTab?.("orders")}
          />
          <QuickAction
            title="Continue verification"
            body="Improve trust and unlock more platform features."
            onClick={() => onNavigateToTab?.("verification")}
          />
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-card-soft p-4">
      <div className="theme-heading text-xl font-semibold">{value}</div>
      <div className="theme-muted mt-1 text-sm">{label}</div>
    </div>
  );
}

function QuickAction({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="theme-card-soft p-5 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
    >
      <div className="theme-heading text-lg font-semibold">{title}</div>
      <p className="theme-muted mt-2 text-sm">{body}</p>
    </button>
  );
}
