"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Flag,
  ListChecks,
  Receipt,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { actionButtonVariants } from "@/components/admin/ActionButton";
import AdminCard from "@/components/admin/AdminCard";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminShell from "@/components/admin/AdminShell";
import AdminStatGrid from "@/components/admin/AdminStatGrid";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/client-api";
import { useSoftRefresh } from "@/hooks/useSoftRefresh";
import { getSurfaceHref } from "@/lib/app-surface";
import { serviceProviderIdToRouteSegment } from "@/lib/service-provider-id";
import { cn } from "@/lib/utils";
import type {
  AdminBookingRecord,
  AdminListingRecord,
  DisputeRecord,
  ProviderCompanyRecord,
} from "@/types/platform";

type DashboardState = {
  providers: ProviderCompanyRecord[];
  bookings: AdminBookingRecord[];
  listings: AdminListingRecord[];
  disputes: DisputeRecord[];
};

function getDisputeTone(status: string) {
  if (["resolved", "closed"].includes(status)) return "success" as const;
  if (status === "under_review") return "pending" as const;
  return "danger" as const;
}

function getProviderTone(status: string) {
  if (status === "basic_approved") return "success" as const;
  if (status === "changes_requested") return "danger" as const;
  if (status === "submitted") return "pending" as const;
  return "neutral" as const;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default function AdminOverviewPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminOverviewContent />
    </ProtectedRoute>
  );
}

function AdminOverviewContent() {
  const [state, setState] = useState<DashboardState>({
    providers: [],
    bookings: [],
    listings: [],
    disputes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [providers, bookings, listings, disputes] = await Promise.all([
        apiFetch<{ providers: ProviderCompanyRecord[] }>(
          "/api/admin/providers",
        ),
        apiFetch<{ bookings: AdminBookingRecord[] }>("/api/admin/bookings"),
        apiFetch<{ listings: AdminListingRecord[] }>("/api/admin/listings"),
        apiFetch<{ disputes: DisputeRecord[] }>("/api/admin/disputes"),
      ]);

      setState({
        providers: providers.providers,
        bookings: bookings.bookings,
        listings: listings.listings,
        disputes: disputes.disputes,
      });
      setError("");
    } catch (err) {
      if (!quiet) {
        setError(
          err instanceof Error ? err.message : "Unable to load admin overview.",
        );
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  useSoftRefresh(() => load(true));

  const totalRevenue = useMemo(
    () => state.bookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
    [state.bookings],
  );

  const onboardingPending = useMemo(
    () =>
      state.providers.filter((provider) =>
        ["submitted", "changes_requested"].includes(provider.onboardingStatus),
      ),
    [state.providers],
  );

  const activeDisputes = useMemo(
    () =>
      state.disputes.filter((dispute) =>
        ["open", "under_review"].includes(dispute.status),
      ),
    [state.disputes],
  );

  const recentBookings = useMemo(
    () =>
      [...state.bookings]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 8),
    [state.bookings],
  );

  const recentDisputes = useMemo(
    () =>
      [...state.disputes]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 6),
    [state.disputes],
  );

  const listingsPending = useMemo(
    () =>
      state.listings.filter((listing) => listing.status === "pending_review")
        .length,
    [state.listings],
  );

  const totalUsers = useMemo(() => {
    const travelerIds = new Set(
      state.bookings.map((booking) => booking.customer.id),
    );
    const providerIds = new Set(
      state.providers.map((provider) => provider.ownerUserId),
    );
    return travelerIds.size + providerIds.size;
  }, [state.bookings, state.providers]);

  return (
    <AdminShell
      activePath="/admin/overview"
      title="Overview"
      description="Monitor service-provider onboarding, listings, bookings, disputes, and revenue from one operational dashboard."
      actions={
        <Link
          href={getSurfaceHref("admin", "/admin/service-providers")}
          className={cn(
            actionButtonVariants({ variant: "primary", size: "lg" }),
          )}
        >
          Review service providers
        </Link>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <AdminStatGrid>
        <AdminCard
          label="Total users"
          value={loading ? "—" : totalUsers}
          detail="Traveler and provider accounts in current activity"
          icon={Users}
          tone="info"
        />
        <AdminCard
          label="Service providers"
          value={loading ? "—" : state.providers.length}
          detail={`${onboardingPending.length} awaiting review`}
          icon={Building2}
          tone="warning"
        />
        <AdminCard
          label="Total bookings"
          value={loading ? "—" : state.bookings.length}
          detail="All tracked booking records"
          icon={ListChecks}
          tone="default"
        />
        <AdminCard
          label="Total revenue"
          value={loading ? "—" : `$${totalRevenue.toFixed(2)}`}
          detail="Gross booking volume"
          icon={Receipt}
          tone="success"
        />
        <AdminCard
          label="Active disputes"
          value={loading ? "—" : activeDisputes.length}
          detail="Open and under review"
          icon={Flag}
          tone="danger"
        />
      </AdminStatGrid>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
        <div className="px-6 pt-5">
          <AdminSectionHeader
            title="Pending actions"
            description="Queues that need immediate attention."
          />
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
          {[
            {
              label: "Service-provider approvals",
              value: onboardingPending.length,
              href: "/admin/service-providers",
              icon: Building2,
            },
            {
              label: "Listings pending review",
              value: listingsPending,
              href: "/admin/listings",
              icon: ShoppingBag,
            },
            {
              label: "Disputes requiring review",
              value: activeDisputes.length,
              href: "/admin/disputes",
              icon: Flag,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={getSurfaceHref("admin", item.href)}
                className="rounded-xl border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-white/80">
                      {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      {loading ? "—" : item.value}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-white/[0.05]">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-white/70" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
          <div className="px-6 pt-5">
            <AdminSectionHeader
              title="Recent bookings"
              description="Latest booking activity across the platform."
              action={
                <Link
                  href={getSurfaceHref("admin", "/admin/bookings")}
                  className={cn(
                    actionButtonVariants({ variant: "secondary", size: "sm" }),
                  )}
                >
                  View all bookings
                </Link>
              }
            />
          </div>
          <div className="px-6 pb-6 pt-4">
            <AdminTable
              columns={[
                {
                  key: "booking",
                  header: "Booking",
                  cell: (booking: AdminBookingRecord) => (
                    <div>
                      <div className="font-medium text-slate-950 dark:text-white">
                        {booking.confirmationNumber}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                        {booking.listing?.title || booking.bookingType}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "traveler",
                  header: "Traveler",
                  cell: (booking: AdminBookingRecord) => (
                    <div>
                      <div>{booking.customer.name}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                        {booking.customer.email}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "provider",
                  header: "Provider",
                  cell: (booking: AdminBookingRecord) =>
                    booking.provider?.companyName || "Off2Zim",
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (booking: AdminBookingRecord) => (
                    <StatusBadge
                      tone={
                        booking.status === "COMPLETED"
                          ? "success"
                          : booking.status === "CANCELLED"
                            ? "danger"
                            : "pending"
                      }
                    >
                      {booking.status}
                    </StatusBadge>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  className: "text-right",
                  cell: (booking: AdminBookingRecord) => (
                    <div className="text-right">
                      ${booking.totalAmount.toFixed(2)} {booking.currency}
                    </div>
                  ),
                },
              ]}
              rows={recentBookings}
              rowKey={(booking) => booking.id}
              emptyState="No recent bookings."
            />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010]">
            <AdminSectionHeader
              title="Pending service-provider approvals"
              description="Service-provider accounts waiting for review."
              action={
                <Link
                  href={getSurfaceHref("admin", "/admin/service-providers")}
                  className={cn(
                    actionButtonVariants({ variant: "secondary", size: "sm" }),
                  )}
                >
                  Open service providers
                </Link>
              }
            />
            <div className="mt-4 space-y-3">
              {loading ? (
                <AdminEmptyState title="Loading approvals" />
              ) : onboardingPending.length === 0 ? (
                <AdminEmptyState
                  title="No pending service providers"
                  body="Service-provider approvals will appear here when submissions are ready for review."
                />
              ) : (
                onboardingPending.slice(0, 6).map((provider) => (
                  <Link
                    key={provider.id}
                    href={getSurfaceHref(
                      "admin",
                      `/admin/service-providers/${
                        serviceProviderIdToRouteSegment(
                          provider.serviceProviderId,
                        ) || provider.id
                      }`,
                    )}
                    className="block rounded-xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-950 dark:text-white">
                          {provider.companyName}
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-white/45">
                          {provider.businessCategory || "Category pending"}
                        </div>
                      </div>
                      <StatusBadge
                        tone={getProviderTone(provider.onboardingStatus)}
                      >
                        {formatLabel(provider.onboardingStatus)}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 dark:text-white/35">
                      {provider.documents.length} documents
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010]">
            <AdminSectionHeader
              title="Recent disputes"
              description="Latest dispute activity and review status."
              action={
                <Link
                  href={getSurfaceHref("admin", "/admin/disputes")}
                  className={cn(
                    actionButtonVariants({ variant: "secondary", size: "sm" }),
                  )}
                >
                  View disputes
                </Link>
              }
            />
            <div className="mt-4 space-y-3">
              {loading ? (
                <AdminEmptyState title="Loading disputes" />
              ) : recentDisputes.length === 0 ? (
                <AdminEmptyState
                  title="No disputes"
                  body="Recent dispute cases will appear here."
                />
              ) : (
                recentDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="rounded-xl border border-slate-200 px-4 py-4 dark:border-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-950 dark:text-white">
                          {dispute.bookingConfirmationNumber}
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-white/45">
                          {dispute.reason}
                        </div>
                      </div>
                      <StatusBadge tone={getDisputeTone(dispute.status)}>
                        {formatLabel(dispute.status)}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 dark:text-white/35">
                      {dispute.provider?.companyName || "Off2Zim"} •{" "}
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
