"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminCard from "@/components/admin/AdminCard";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminShell from "@/components/admin/AdminShell";
import AdminStatGrid from "@/components/admin/AdminStatGrid";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterChips from "@/components/ui/FilterChips";
import { apiFetch } from "@/lib/client-api";
import {
  SERVICE_PROVIDER_FILTERS,
  type ServiceProviderCategoryId,
} from "@/lib/service-provider-categories";
import { getSurfaceHref } from "@/lib/app-surface";
import { serviceProviderIdToRouteSegment } from "@/lib/service-provider-id";
import { cn } from "@/lib/utils";
import type { ProviderCompanyRecord } from "@/types/platform";
import {
  categoriesFor,
  formatProviderStatus,
  providerTone,
  serviceProviderCategoryLabels,
} from "@/components/admin/ServiceProviderProfile";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";

type FilterId = "all" | ServiceProviderCategoryId;

export default function AdminProvidersPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminProvidersContent />
    </ProtectedRoute>
  );
}

function AdminProvidersContent() {
  const [providers, setProviders] = useState<ProviderCompanyRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const payload = await apiFetch<{ providers: ProviderCompanyRecord[] }>(
          "/api/admin/providers",
        );
        setProviders(payload.providers);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load service providers.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  const filterOptions = useMemo(
    () =>
      SERVICE_PROVIDER_FILTERS.map((filter) => {
        const count =
          filter.id === "all"
            ? providers.length
            : providers.filter((provider) =>
                categoriesFor(provider).includes(
                  filter.id as ServiceProviderCategoryId,
                ),
              ).length;

        return { ...filter, count };
      }),
    [providers],
  );

  const filteredProviders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return providers.filter((provider) => {
      const matchesFilter =
        selectedFilter === "all" ||
        categoriesFor(provider).includes(selectedFilter);
      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        provider.companyName,
        provider.tradingName,
        provider.businessCategory,
        provider.businessDescription,
        provider.mainContactPerson,
        provider.businessEmail,
        provider.businessPhone,
        provider.physicalAddress,
        provider.headquartersCity,
        ...provider.servicesOffered,
        ...provider.serviceAreas,
        ...categoriesFor(provider).map(
          (category) => serviceProviderCategoryLabels[category],
        ),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [providers, query, selectedFilter]);

  const stats = useMemo(
    () => ({
      total: providers.length,
      pending: providers.filter(
        (provider) => provider.onboardingStatus === "submitted",
      ).length,
      approved: providers.filter(
        (provider) =>
          provider.onboardingStatus === "basic_approved" ||
          (provider.onboardingStatus as string) === "verified_premium",
      ).length,
      changesRequested: providers.filter(
        (provider) => provider.onboardingStatus === "changes_requested",
      ).length,
    }),
    [providers],
  );

  return (
    <AdminShell
      activePath="/admin/service-providers"
      title="Service Providers"
      description="Search, filter, and open service-provider records across stays, events, activities, bus, and flight operations."
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <AdminStatGrid>
        <AdminCard
          label="Service providers"
          value={loading ? "-" : stats.total}
          icon={Building2}
        />
        <AdminCard
          label="Pending"
          value={loading ? "-" : stats.pending}
          icon={FileText}
          tone="warning"
        />
        <AdminCard
          label="Approved"
          value={loading ? "-" : stats.approved}
          icon={BadgeCheck}
          tone="success"
        />
        <AdminCard
          label="Changes requested"
          value={loading ? "-" : stats.changesRequested}
          icon={ShieldCheck}
          tone="danger"
        />
      </AdminStatGrid>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-white/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search service providers by name, service, location, email, or contact"
              className="h-14 w-full rounded-[28px] border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/35 dark:focus:bg-white/[0.08] dark:focus:ring-white/10"
            />
          </div>

          <FilterChips
            options={filterOptions}
            selected={selectedFilter}
            onSelect={(id) => setSelectedFilter(id as FilterId)}
          />
        </div>

        <div className="border-t border-slate-200 px-4 py-4 dark:border-white/10 sm:px-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06]"
                />
              ))}
            </div>
          ) : filteredProviders.length === 0 ? (
            <AdminEmptyState
              title="No service providers found"
              body="Try a different search term or service filter."
            />
          ) : (
            <div className="space-y-3">
              {filteredProviders.map((provider) => (
                <ServiceProviderListCard
                  key={provider.id}
                  provider={provider}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

function ServiceProviderListCard({
  provider,
}: {
  provider: ProviderCompanyRecord;
}) {
  const href = getSurfaceHref(
    "admin",
    `/admin/service-providers/${
      serviceProviderIdToRouteSegment(provider.serviceProviderId) || provider.id
    }`,
  );
  const reviewSummary = getReviewSummary(provider);

  return (
    <Link
      href={href}
      className={cn(
        "group block w-full rounded-xl border border-slate-200 px-4 py-4 transition",
        "hover:border-slate-300 hover:bg-slate-900/[0.03]",
        "dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[0.05]",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 md:justify-start">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-950 group-hover:text-slate-600 dark:text-white dark:group-hover:text-white/70">
                {provider.companyName}
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-slate-500 dark:text-white/45">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-white/40" />
                <span className="truncate">
                  {getOperatingLocation(provider)}
                </span>
              </div>
            </div>
            <ApprovalIndicator provider={provider} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {categoriesFor(provider).length === 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-white/[0.06] dark:text-white/45">
                Uncategorised
              </span>
            ) : (
              categoriesFor(provider).map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/[0.08] dark:text-white/60"
                >
                  {serviceProviderCategoryLabels[category]}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-white/45 md:justify-end md:text-right">
          <span>
            <span className="font-medium text-slate-700 dark:text-white/70">
              Reviewed by:
            </span>{" "}
            {reviewSummary.reviewer}
          </span>
          <span>
            <span className="font-medium text-slate-700 dark:text-white/70">
              Date:
            </span>{" "}
            {reviewSummary.date}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ApprovalIndicator({ provider }: { provider: ProviderCompanyRecord }) {
  const status = provider.onboardingStatus as string;
  const isPremiumApproved =
    provider.verificationTier === "verified_premium" ||
    status === "verified_premium";
  const isBasicApproved = status === "basic_approved";

  if (isPremiumApproved || isBasicApproved) {
    const label = isPremiumApproved ? "Premium approved" : "Basic approved";

    return (
      <span
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
          isPremiumApproved
            ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-300"
            : "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-300/30 dark:bg-sky-400/10 dark:text-sky-300",
        )}
      >
        <CheckCircle2 className="h-5 w-5" />
      </span>
    );
  }

  return (
    <StatusBadge tone={providerTone(provider.onboardingStatus)}>
      {formatProviderStatus(provider.onboardingStatus)}
    </StatusBadge>
  );
}

function getOperatingLocation(provider: ProviderCompanyRecord) {
  const serviceAreas = provider.serviceAreas
    .map((area) => area.trim())
    .filter(Boolean);

  if (serviceAreas.length > 0) {
    const visibleAreas = serviceAreas.slice(0, 2).join(", ");
    const remainingCount = serviceAreas.length - 2;
    return remainingCount > 0
      ? `${visibleAreas} +${remainingCount} more`
      : visibleAreas;
  }

  return (
    provider.headquartersCity?.trim() ||
    provider.physicalAddress?.trim() ||
    "Location pending"
  );
}

function getReviewSummary(provider: ProviderCompanyRecord) {
  const review =
    provider.verificationReviews.find((item) => item.reviewedBy) ?? null;

  if (!review?.reviewedBy) {
    return {
      reviewer: "Awaiting admin review",
      date: "Not reviewed",
    };
  }

  return {
    reviewer: review.reviewedBy.name || review.reviewedBy.email,
    date: formatReviewDate(review.reviewedAt || review.createdAt),
  };
}

function formatReviewDate(value?: string | null) {
  if (!value) {
    return "Not reviewed";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not reviewed";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
