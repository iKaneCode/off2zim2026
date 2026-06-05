"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Contact,
  Globe2,
  ImagePlus,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  MailCheck,
  MessageSquareText,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Star,
  UserCog,
  UserPlus,
  Wallet,
} from "lucide-react";
import EditableServiceProviderProfile, {
  type ProviderDetailSection,
} from "@/components/admin/EditableServiceProviderProfile";
import { formatProviderStatus } from "@/components/admin/ServiceProviderProfile";
import SiteLogo from "@/components/layout/SiteLogo";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SupportMessagesWorkspace from "@/components/messages/SupportMessagesWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useSupportUnreadCount } from "@/hooks/useSupportUnreadCount";
import { useSoftRefresh } from "@/hooks/useSoftRefresh";
import { apiFetch } from "@/lib/client-api";
import { getSurfaceHref } from "@/lib/app-surface";
import {
  getServiceProviderDisplayId,
  serviceProviderIdToRouteSegment,
  serviceProviderRouteSegmentToId,
} from "@/lib/service-provider-id";
import { cn } from "@/lib/utils";
import type {
  AdminActivityLogRecord,
  ProviderCompanyRecord,
  ProviderListingRecord,
  ProviderOrderRecord,
  ProviderPayoutSettings,
  ServiceProviderCategoryId,
} from "@/types/platform";

interface ProviderDashboardProps {
  routeProviderId?: string;
}

type ProviderTab =
  | "overview"
  | "profile"
  | "contact-person"
  | "operating-time"
  | "listings"
  | "gallery"
  | "company-documents"
  | "bookings"
  | "messages"
  | "revenue"
  | "analytics"
  | "reviews"
  | "account";

interface ProviderAnalytics {
  periodLabel: string;
  providerTier: string;
  tierStatus: string;
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

interface ProviderInsights {
  periodDays: number;
  sampledEvents: number;
  matchedEvents: number;
  uniqueUsers: number;
  topListings: {
    id: string;
    displayId: string;
    title: string;
    views: number;
    bookings: number;
    conversionRate: number;
  }[];
  byCountry: { key: string; count: number }[];
  byCity: { key: string; count: number }[];
  byPlatform: { key: string; count: number }[];
  byDevice: { key: string; count: number }[];
  byEventType: { key: string; count: number }[];
  recent: {
    eventType: string;
    listingTitle?: string | null;
    country?: string | null;
    city?: string | null;
    platform?: string | null;
    createdAt: string;
  }[];
}

const PROVIDER_NAV: Array<{
  id: ProviderTab;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: Building2 },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "messages", label: "Messages", icon: MessageSquareText },
  { id: "contact-person", label: "Contact Person", icon: Contact },
  { id: "operating-time", label: "Operating Time", icon: Clock3 },
  { id: "listings", label: "Listings", icon: ListChecks },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "gallery", label: "Gallery", icon: ImagePlus },
  { id: "company-documents", label: "Company Documents", icon: ShieldCheck },
  { id: "revenue", label: "Revenue", icon: Wallet },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "account", label: "Account", icon: UserCog },
];

const DETAIL_SECTION_BY_TAB: Partial<
  Record<ProviderTab, ProviderDetailSection>
> = {
  profile: "profile",
  "contact-person": "contact-person",
  "operating-time": "operating-time",
  listings: "listings",
  gallery: "gallery",
  "company-documents": "verification",
};

function providerTabForDetailSection(
  section: ProviderDetailSection,
): ProviderTab {
  const match = Object.entries(DETAIL_SECTION_BY_TAB).find(
    ([, detailSection]) => detailSection === section,
  );
  return (match?.[0] as ProviderTab | undefined) ?? "overview";
}

const ZIMBABWE_BANKS = [
  "CBZ Bank",
  "Steward Bank",
  "FBC Bank",
  "NMB Bank",
  "Stanbic Bank Zimbabwe",
  "Standard Chartered Zimbabwe",
  "CABS",
  "ZB Bank",
  "BancABC Zimbabwe",
  "First Capital Bank Zimbabwe",
  "Ecobank Zimbabwe",
  "Nedbank Zimbabwe",
  "POSB",
  "Metbank",
  "AFC Commercial Bank",
  "National Building Society",
];

const PAYOUT_METHODS: Array<{
  value: NonNullable<ProviderPayoutSettings["method"]>;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "bank_transfer", label: "Bank transfer", icon: Landmark },
  { value: "ecocash", label: "EcoCash", icon: Smartphone },
  { value: "onemoney", label: "OneMoney", icon: Smartphone },
  { value: "innbucks", label: "InnBucks", icon: Smartphone },
  { value: "omari", label: "Omari", icon: Smartphone },
  { value: "telecash", label: "Telecash", icon: Smartphone },
];

export default function ProviderDashboard({
  routeProviderId,
}: ProviderDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [company, setCompany] = useState<ProviderCompanyRecord | null>(null);
  const [analytics, setAnalytics] = useState<ProviderAnalytics | null>(null);
  const [insights, setInsights] = useState<ProviderInsights | null>(null);
  const [providerListings, setProviderListings] = useState<
    ProviderListingRecord[]
  >([]);
  const [orders, setOrders] = useState<ProviderOrderRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogRecord[]>(
    [],
  );
  const [readinessAttentionSections, setReadinessAttentionSections] = useState<
    ProviderDetailSection[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadWorkspace = async () => {
      setLoading(true);
      try {
        const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
          "/api/provider/company",
        );
        const [
          analyticsPayload,
          insightsPayload,
          listingsPayload,
          ordersPayload,
          activityPayload,
        ] = await Promise.all([
          apiFetch<{
            analytics: ProviderAnalytics;
          }>("/api/provider/analytics").catch(() => null),
          apiFetch<{
            insights: ProviderInsights;
          }>("/api/provider/insights").catch(() => null),
          apiFetch<{
            listings: ProviderListingRecord[];
          }>("/api/provider/listings").catch(() => null),
          apiFetch<{
            orders: ProviderOrderRecord[];
          }>("/api/provider/orders").catch(() => null),
          apiFetch<{
            logs: AdminActivityLogRecord[];
          }>("/api/provider/activity-log?take=80").catch(() => null),
        ]);

        if (!active) return;

        const displayId = getServiceProviderDisplayId(payload.company);
        const routeSegment = serviceProviderIdToRouteSegment(displayId);
        const requestedId = routeProviderId
          ? serviceProviderRouteSegmentToId(routeProviderId)
          : "";

        setCompany(payload.company);
        setAnalytics(analyticsPayload?.analytics ?? null);
        setInsights(insightsPayload?.insights ?? null);
        setProviderListings(listingsPayload?.listings ?? []);
        setOrders(ordersPayload?.orders ?? []);
        setActivityLogs(activityPayload?.logs ?? []);
        setError("");

        if (!routeProviderId || requestedId !== displayId) {
          router.replace(
            getSurfaceHref("provider", `/provider-dashboard/${routeSegment}`),
          );
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the service provider dashboard.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [routeProviderId, router]);

  const activeTab = useMemo<ProviderTab>(() => {
    const requested = searchParams.get("tab");
    if (requested === "verification") return "company-documents";
    return PROVIDER_NAV.some((item) => item.id === requested)
      ? (requested as ProviderTab)
      : "overview";
  }, [searchParams]);

  const displayId = useMemo(
    () => (company ? getServiceProviderDisplayId(company) : ""),
    [company],
  );
  const attentionTabs = useMemo(() => {
    if (readinessAttentionSections) {
      return new Set<ProviderTab>(
        readinessAttentionSections.map(providerTabForDetailSection),
      );
    }
    if (!company) return new Set<ProviderTab>();

    const readiness = buildProviderReadiness(
      company,
      getProviderListingStats(providerListings, company),
      { emailVerified: Boolean(user?.verification?.email) },
    );

    return new Set<ProviderTab>(
      readiness.sections
        .filter(
          (section) =>
            section.availability === "available" &&
            (section.missing.length > 0 ||
              section.reviewState === "pending_review"),
        )
        .map((section) => section.tab),
    );
  }, [
    company,
    providerListings,
    readinessAttentionSections,
    user?.verification?.email,
  ]);

  const refreshActivityLogs = async () => {
    try {
      const payload = await apiFetch<{ logs: AdminActivityLogRecord[] }>(
        "/api/provider/activity-log?take=80",
      );
      setActivityLogs(payload.logs);
    } catch {
      // Activity is supplemental; leave the existing rows in place if refresh fails.
    }
  };

  const refreshOverview = async () => {
    try {
      const [
        companyPayload,
        analyticsPayload,
        listingsPayload,
        activityPayload,
      ] = await Promise.all([
        apiFetch<{ company: ProviderCompanyRecord }>("/api/provider/company"),
        apiFetch<{ analytics: ProviderAnalytics }>(
          "/api/provider/analytics",
        ).catch(() => null),
        apiFetch<{ listings: ProviderListingRecord[] }>(
          "/api/provider/listings",
        ).catch(() => null),
        apiFetch<{ logs: AdminActivityLogRecord[] }>(
          "/api/provider/activity-log?take=80",
        ).catch(() => null),
      ]);
      setCompany(companyPayload.company);
      setAnalytics(analyticsPayload?.analytics ?? null);
      setProviderListings(listingsPayload?.listings ?? []);
      setActivityLogs(activityPayload?.logs ?? []);
    } catch {
      // Preserve the current overview during a brief background refresh failure.
    }
  };
  useSoftRefresh(refreshOverview, { enabled: activeTab === "overview" });

  const handleProviderChange = (nextCompany: ProviderCompanyRecord) => {
    setCompany(nextCompany);
    void refreshActivityLogs();
  };

  const handleListingsChange = (nextListings: ProviderListingRecord[]) => {
    setProviderListings(nextListings);
    void refreshActivityLogs();
  };

  const setActiveTab = (tab: ProviderTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  if (loading) {
    return (
      <ProviderGate
        icon={<ShieldCheck className="h-6 w-6 text-[#ff7352]" />}
        title="Loading provider workspace"
        body="Checking your service provider profile, listings, gallery, and readiness status."
      />
    );
  }

  if (error || !company) {
    return (
      <ProviderGate
        icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
        title="Provider workspace unavailable"
        body={
          error || "No service provider profile was found for this account."
        }
      />
    );
  }

  const detailSection = DETAIL_SECTION_BY_TAB[activeTab];

  return (
    <div
      className={cn(
        "bg-slate-100/70 dark:bg-[#050505]",
        activeTab === "messages" ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <div
        className={cn(
          "grid lg:grid-cols-[250px_minmax(0,1fr)]",
          activeTab === "messages" ? "h-full" : "min-h-screen",
        )}
      >
        <ProviderSidebar
          activeTab={activeTab}
          attentionTabs={attentionTabs}
          company={company}
          onNavigate={setActiveTab}
        />
        <main
          className={cn(
            "min-w-0",
            activeTab === "messages" && "flex h-full flex-col overflow-hidden",
          )}
        >
          <ProviderDashboardHeader
            company={company}
            displayId={displayId}
            onStatusClick={() => setActiveTab("overview")}
          />
          <div
            className={cn(
              "px-4 py-6 sm:px-6",
              activeTab === "messages"
                ? "min-h-0 flex-1 overflow-hidden"
                : "space-y-6",
            )}
          >
            {activeTab === "overview" ? (
              <ProviderOverview
                analytics={analytics}
                activityLogs={activityLogs}
                company={company}
                emailVerified={Boolean(user?.verification?.email)}
                listings={providerListings}
                onNavigate={setActiveTab}
                onProviderChange={handleProviderChange}
                onReadinessAttentionChange={setReadinessAttentionSections}
              />
            ) : null}

            {detailSection ? (
              <EditableServiceProviderProfile
                mode="provider"
                activeSection={detailSection}
                provider={company}
                onProviderChange={handleProviderChange}
                onProviderListingsChange={handleListingsChange}
                onActivityLogChange={refreshActivityLogs}
                onReadinessAttentionChange={setReadinessAttentionSections}
              />
            ) : null}

            {activeTab === "bookings" ? (
              <BookingsPanel
                analytics={analytics}
                company={company}
                listings={providerListings}
                orders={orders}
              />
            ) : null}

            {activeTab === "revenue" ? (
              <RevenuePanel
                analytics={analytics}
                company={company}
                orders={orders}
                onProviderChange={handleProviderChange}
              />
            ) : null}

            {activeTab === "messages" ? <MessagesPanel /> : null}

            {activeTab === "analytics" ? (
              <AnalyticsPanel
                analytics={analytics}
                insights={insights}
                listings={providerListings}
              />
            ) : null}

            {activeTab === "reviews" ? (
              <ReviewsPanel company={company} />
            ) : null}

            {activeTab === "account" ? (
              <AccountPanel
                company={company}
                emailVerified={Boolean(user?.verification?.email)}
                onActivityLogChange={refreshActivityLogs}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProviderSidebar({
  activeTab,
  attentionTabs,
  onNavigate,
}: {
  activeTab: ProviderTab;
  attentionTabs: ReadonlySet<ProviderTab>;
  company: ProviderCompanyRecord;
  onNavigate: (tab: ProviderTab) => void;
}) {
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const unreadMessages = useSupportUnreadCount(
    "/api/provider/messages?summary=unread",
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.push(getSurfaceHref("provider", "/login"));
  };

  return (
    <aside className="border-r border-slate-200 bg-[#fbfbfb] dark:border-white/10 dark:bg-[#0b0b0b]">
      <div className="sticky top-0 flex min-h-screen flex-col px-4 py-5">
        <div className="flex min-h-14 items-center px-3">
          <SiteLogo
            href={getSurfaceHref("provider", "/provider-dashboard")}
            width={144}
            height={45}
            className="h-11 w-auto"
            priority
          />
        </div>

        <nav className="mt-6 flex-1 space-y-1.5">
          {PROVIDER_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const needsAttention = attentionTabs.has(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                  active
                    ? "bg-[#ff5630] font-bold text-white"
                    : "font-medium text-slate-950 hover:bg-white dark:text-white dark:hover:bg-white/[0.04]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
                {needsAttention ||
                (item.id === "messages" && unreadMessages > 0) ? (
                  <span className="ml-auto flex items-center gap-2">
                    {needsAttention ? (
                      <span
                        className="relative flex h-2.5 w-2.5"
                        aria-label="Attention required"
                      >
                        <span
                          className={cn(
                            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
                            active ? "bg-white" : "bg-rose-500",
                          )}
                        />
                        <span
                          className={cn(
                            "relative inline-flex h-2.5 w-2.5 rounded-full",
                            active ? "bg-white" : "bg-rose-500",
                          )}
                        />
                      </span>
                    ) : null}
                    {item.id === "messages" && unreadMessages > 0 ? (
                      <span
                        className={cn(
                          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                          active
                            ? "bg-white text-[#ff5630]"
                            : "bg-rose-500 text-white",
                        )}
                        aria-label={`${unreadMessages} unread messages`}
                      >
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
          <div className="flex items-center justify-between rounded-xl px-3 py-2">
            <span className="text-sm font-medium text-slate-950 dark:text-white">
              Theme
            </span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-950 transition hover:bg-white disabled:pointer-events-none disabled:opacity-55 dark:text-white dark:hover:bg-white/[0.04]"
          >
            <LogOut className="h-4 w-4" />
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function ProviderDashboardHeader({
  company,
  displayId,
  onStatusClick,
}: {
  company: ProviderCompanyRecord;
  displayId: string;
  onStatusClick: () => void;
}) {
  const title =
    company.tradingName || company.companyName || "Service Provider";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#050505]/95 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {title}
            </h1>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/45">
              {displayId}
            </span>
          </div>
          <ProviderHeaderStatus provider={company} onClick={onStatusClick} />
        </div>

        <div className="text-left text-sm text-slate-500 dark:text-white/45 sm:text-right">
          <div>
            <span className="font-medium text-slate-700 dark:text-white/70">
              Registration Date:
            </span>{" "}
            <span>{formatDisplayDate(company.createdAt)}</span>
          </div>
          <div className="mt-1">
            <span className="font-medium text-slate-700 dark:text-white/70">
              Subscription Tier:
            </span>{" "}
            <span className="font-semibold text-slate-950 dark:text-white">
              {formatDisplayLabel(company.providerTier)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProviderOverview({
  analytics,
  activityLogs,
  company,
  emailVerified,
  listings,
  onNavigate,
  onProviderChange,
  onReadinessAttentionChange,
}: {
  analytics: ProviderAnalytics | null;
  activityLogs: AdminActivityLogRecord[];
  company: ProviderCompanyRecord;
  emailVerified: boolean;
  listings: ProviderListingRecord[];
  onNavigate: (tab: ProviderTab) => void;
  onProviderChange: (company: ProviderCompanyRecord) => void;
  onReadinessAttentionChange: (sections: ProviderDetailSection[]) => void;
}) {
  const listingStats = getProviderListingStats(listings, company);
  const readiness = buildProviderReadiness(company, listingStats, {
    emailVerified,
  });
  const metrics = analytics?.metrics;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Readiness"
          value={`${readiness.percent}%`}
          helper={`${readiness.completed}/${readiness.total} sections complete`}
        />
        <MetricCard
          label="Revenue"
          value={formatMoney(metrics?.periodRevenue ?? 0, analytics?.currency)}
          helper={analytics?.periodLabel ?? "Last 30 days"}
        />
        <MetricCard
          label="Bookings"
          value={String(
            metrics?.totalBookings ?? company.bookingStats?.total ?? 0,
          )}
          helper={`${metrics?.pendingBookings ?? company.bookingStats?.pending ?? 0} pending`}
        />
        <MetricCard
          label="Listings"
          value={String(listingStats.total)}
          helper={`${listingStats.active} active`}
        />
      </section>

      <section className="space-y-5">
        <EditableServiceProviderProfile
          mode="provider"
          activeSection="readiness"
          provider={company}
          onProviderChange={onProviderChange}
          onReadinessAttentionChange={onReadinessAttentionChange}
          onReadinessNavigate={(section) =>
            onNavigate(providerTabForDetailSection(section))
          }
        />

        <Panel title="Recent activity">
          {activityLogs.length ? (
            <div className="overflow-x-auto font-mono">
              <table className="min-w-[1080px] w-full border-collapse text-left text-xs">
                <thead className="border-b border-slate-300 text-slate-500 dark:border-white/15 dark:text-white/40">
                  <tr>
                    <th className="px-3 py-2 font-medium uppercase tracking-[0.14em]">
                      timestamp
                    </th>
                    <th className="px-3 py-2 font-medium uppercase tracking-[0.14em]">
                      user
                    </th>
                    <th className="px-3 py-2 font-medium uppercase tracking-[0.14em]">
                      name
                    </th>
                    <th className="px-3 py-2 font-medium uppercase tracking-[0.14em]">
                      email
                    </th>
                    <th className="px-3 py-2 font-medium uppercase tracking-[0.14em]">
                      details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {activityLogs.slice(0, 12).map((log) => (
                    <ActivityLogRow
                      key={log.id}
                      log={log}
                      contactName={company.mainContactPerson}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="Provider profile edits, listing changes, gallery updates, logins, and logouts will appear here." />
          )}
        </Panel>
      </section>
    </div>
  );
}

function BookingsPanel({
  analytics,
  company,
  listings,
  orders,
}: {
  analytics: ProviderAnalytics | null;
  company: ProviderCompanyRecord;
  listings: ProviderListingRecord[];
  orders: ProviderOrderRecord[];
}) {
  const metrics = analytics?.metrics;
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const service = company.serviceCategories[0] || "things_to_do";
  const activeListings = listings.filter((listing) =>
    ["active", "approved"].includes(listing.status),
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const selectedOrders = orders.filter((order) =>
    bookingTouchesDate(order, selectedDate),
  );
  const totalUnits = Math.max(
    activeListings.reduce(
      (total, listing) => total + getListingBookableUnits(listing, service),
      0,
    ),
    0,
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total bookings"
          value={String(
            metrics?.totalBookings ?? company.bookingStats?.total ?? 0,
          )}
          helper="All time"
        />
        <MetricCard
          label="Pending"
          value={String(
            metrics?.pendingBookings ?? company.bookingStats?.pending ?? 0,
          )}
          helper="Need action"
        />
        <MetricCard
          label="Completed"
          value={String(metrics?.completedBookings ?? 0)}
          helper="Confirmed stays and services"
        />
        <MetricCard
          label="Disputes"
          value={String(
            metrics?.activeDisputes ?? company.bookingStats?.disputed ?? 0,
          )}
          helper="Active cases"
        />
      </section>

      <Panel title="Booking calendar">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((current) => addMonths(current, -1))
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/[0.04]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {formatCalendarMonth(calendarMonth)}
                </div>
                <div className="text-xs text-slate-500 dark:text-white/45">
                  {formatServiceBookingLabel(service)}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((current) => addMonths(current, 1))
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/[0.04]"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/35">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const dayOrders = orders.filter((order) =>
                  bookingTouchesDate(order, key),
                );
                const availabilityTone = getBookingCalendarTone({
                  bookings: dayOrders.length,
                  totalUnits,
                  past: isPastCalendarDate(day),
                });
                const selected = selectedDate === key;
                const inMonth = day.getMonth() === calendarMonth.getMonth();

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "min-h-20 rounded-xl border p-2 text-left transition",
                      availabilityTone,
                      !inMonth && "opacity-40",
                      selected &&
                        "ring-2 ring-[#ff5630] ring-offset-2 ring-offset-white dark:ring-offset-[#101010]",
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {day.getDate()}
                    </div>
                    <div className="mt-2 text-xs text-slate-600 dark:text-white/60">
                      {dayOrders.length
                        ? `${dayOrders.length} booked`
                        : totalUnits
                          ? `${totalUnits} open`
                          : "N/A"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04] lg:w-80">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
              Selected date
            </div>
            <div className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
              {formatDisplayDate(selectedDate)}
            </div>
            <div className="mt-4 space-y-2">
              {selectedOrders.length ? (
                selectedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-[#101010]"
                  >
                    <div className="font-semibold text-slate-950 dark:text-white">
                      {order.listing?.title || "Booking"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                      {order.confirmationNumber} | {order.customer.name}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="capitalize text-slate-500 dark:text-white/45">
                        {order.status.toLowerCase()}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatMoney(order.totalAmount, order.currency)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="No bookings recorded for this date." />
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Booking activity">
        {orders.length ? (
          <div className="space-y-3">
            {orders.slice(0, 8).map((order) => (
              <div
                key={order.id}
                className="grid gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 md:grid-cols-[1fr_140px_140px]"
              >
                <div>
                  <div className="font-semibold text-slate-950 dark:text-white">
                    {order.listing?.title || order.bookingType}
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-white/45">
                    {order.customer.name} | {order.confirmationNumber}
                  </div>
                </div>
                <div className="capitalize text-slate-500 dark:text-white/45">
                  {order.status.toLowerCase()}
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {formatMoney(order.totalAmount, order.currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Booking requests will appear here when tourists start booking your listings." />
        )}
      </Panel>
    </div>
  );
}

function RevenuePanel({
  analytics,
  company,
  orders,
  onProviderChange,
}: {
  analytics: ProviderAnalytics | null;
  company: ProviderCompanyRecord;
  orders: ProviderOrderRecord[];
  onProviderChange: (company: ProviderCompanyRecord) => void;
}) {
  const metrics = analytics?.metrics;
  const [payoutForm, setPayoutForm] = useState<ProviderPayoutSettings>(() =>
    normalizePayoutSettings(company.payoutSettings),
  );
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState("");
  const maxRevenue = Math.max(
    ...(analytics?.revenueSeries.map((item) => item.revenue) ?? [0]),
    1,
  );
  const paymentOrders = orders.filter((order) =>
    ["CONFIRMED", "COMPLETED", "confirmed", "completed"].includes(order.status),
  );

  useEffect(() => {
    setPayoutForm(normalizePayoutSettings(company.payoutSettings));
  }, [company.payoutSettings]);

  const updatePayout = (patch: Partial<ProviderPayoutSettings>) => {
    setPayoutNotice("");
    setPayoutForm((current) => ({ ...current, ...patch }));
  };

  const savePayoutSettings = async () => {
    setPayoutSaving(true);
    setPayoutNotice("");
    try {
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company",
        {
          method: "PATCH",
          body: JSON.stringify({
            payoutSettings: {
              ...payoutForm,
              updatedAt: new Date().toISOString(),
            },
          }),
        },
      );
      onProviderChange(payload.company);
      setPayoutNotice("Payout method saved for Off2Zim settlements.");
    } catch (err) {
      setPayoutNotice(
        err instanceof Error ? err.message : "Unable to save payout method.",
      );
    } finally {
      setPayoutSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total revenue"
          value={formatMoney(metrics?.totalRevenue ?? 0, analytics?.currency)}
          helper="Confirmed and completed"
        />
        <MetricCard
          label="Period revenue"
          value={formatMoney(metrics?.periodRevenue ?? 0, analytics?.currency)}
          helper={analytics?.periodLabel ?? "Last 30 days"}
        />
        <MetricCard
          label="Average order"
          value={formatMoney(
            metrics?.averageOrderValue ?? 0,
            analytics?.currency,
          )}
          helper="Per confirmed booking"
        />
        <MetricCard
          label="Booking rate"
          value={`${metrics?.bookingRate ?? 0}%`}
          helper="Non-cancelled bookings"
        />
      </section>

      <Panel title="Revenue trend">
        <div className="flex h-72 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          {(analytics?.revenueSeries.length
            ? analytics.revenueSeries
            : Array.from({ length: 6 }, (_, index) => ({
                label: `M${index + 1}`,
                revenue: 0,
              }))
          ).map((item) => {
            const height = Math.max((item.revenue / maxRevenue) * 100, 4);

            return (
              <div
                key={item.label}
                className="flex flex-1 flex-col items-center gap-3"
              >
                <div className="flex h-52 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-[#ff5630]"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-white/45">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Payout method">
          <div className="space-y-4">
            {payoutNotice ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
                {payoutNotice}
              </div>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Payment method
              </span>
              <select
                value={payoutForm.method || ""}
                onChange={(event) =>
                  updatePayout({
                    method: event.target
                      .value as ProviderPayoutSettings["method"],
                  })
                }
                className="min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#ff5630] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                <option value="">Select</option>
                {PAYOUT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>

            {payoutForm.method === "bank_transfer" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                    Bank name
                  </span>
                  <select
                    value={payoutForm.bankName || ""}
                    onChange={(event) =>
                      updatePayout({ bankName: event.target.value })
                    }
                    className="min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#ff5630] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  >
                    <option value="">Select</option>
                    {ZIMBABWE_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </label>
                <PayoutInput
                  label="Account name"
                  value={payoutForm.accountName || ""}
                  onChange={(value) => updatePayout({ accountName: value })}
                />
                <PayoutInput
                  label="Account number"
                  value={payoutForm.accountNumber || ""}
                  onChange={(value) => updatePayout({ accountNumber: value })}
                />
                <PayoutInput
                  label="Branch"
                  value={payoutForm.branchName || ""}
                  onChange={(value) => updatePayout({ branchName: value })}
                />
              </div>
            ) : payoutForm.method ? (
              <div className="grid gap-3 md:grid-cols-2">
                <PayoutInput
                  label="Wallet account name"
                  value={payoutForm.walletName || payoutForm.accountName || ""}
                  onChange={(value) =>
                    updatePayout({ walletName: value, accountName: value })
                  }
                />
                <PayoutInput
                  label="Mobile number"
                  value={payoutForm.mobileNumber || ""}
                  onChange={(value) => updatePayout({ mobileNumber: value })}
                />
              </div>
            ) : null}

            <PayoutInput
              label="Settlement notes"
              value={payoutForm.notes || ""}
              onChange={(value) => updatePayout({ notes: value })}
            />

            <button
              type="button"
              onClick={savePayoutSettings}
              disabled={payoutSaving || !payoutForm.method}
              className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-45 dark:bg-white dark:text-slate-950"
            >
              {payoutSaving ? "Saving..." : "Save payout method"}
            </button>
          </div>
        </Panel>

        <Panel title="Payment activity">
          {paymentOrders.length ? (
            <div className="space-y-2">
              {paymentOrders.slice(0, 6).map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-950 dark:text-white">
                      {order.confirmationNumber}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatMoney(order.totalAmount, order.currency)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                    {order.paymentStatus} | {formatDisplayDate(order.updatedAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Confirmed booking payments and Off2Zim settlement history will appear here." />
          )}
        </Panel>
      </section>

      <Panel title="Top listings">
        {analytics?.topListings.length ? (
          <div className="space-y-3">
            {analytics.topListings.map((listing) => (
              <div
                key={listing.id}
                className="grid gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10 md:grid-cols-[1fr_120px_140px]"
              >
                <div className="font-semibold text-slate-950 dark:text-white">
                  {listing.title}
                </div>
                <div className="text-slate-500 dark:text-white/45">
                  {listing.bookings} bookings
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {formatMoney(listing.revenue, analytics.currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Revenue will appear here after confirmed bookings." />
        )}
      </Panel>
    </div>
  );
}

function MessagesPanel() {
  return (
    <SupportMessagesWorkspace mode="provider" className="h-full min-h-0" />
  );
}

function AnalyticsPanel({
  analytics,
  insights,
  listings,
}: {
  analytics: ProviderAnalytics | null;
  insights: ProviderInsights | null;
  listings: ProviderListingRecord[];
}) {
  const topListing = insights?.topListings[0];
  const topCountry = insights?.byCountry[0];
  const topPlatform = insights?.byPlatform[0];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Profile events"
          value={String(insights?.matchedEvents ?? 0)}
          helper={`${insights?.periodDays ?? 30} day sample`}
        />
        <MetricCard
          label="Unique users"
          value={String(insights?.uniqueUsers ?? 0)}
          helper="Known signed-in viewers"
        />
        <MetricCard
          label="Top listing"
          value={topListing?.displayId || "N/A"}
          helper={topListing?.title || `${listings.length} listings tracked`}
        />
        <MetricCard
          label="Top location"
          value={topCountry?.key || "N/A"}
          helper={`${topCountry?.count ?? 0} events`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Listing performance">
          {insights?.topListings.length ? (
            <div className="space-y-3">
              {insights.topListings.map((listing) => (
                <div
                  key={listing.id}
                  className="grid gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10 md:grid-cols-[1fr_90px_90px_110px]"
                >
                  <div>
                    <div className="font-mono text-xs text-slate-500 dark:text-white/40">
                      {listing.displayId}
                    </div>
                    <div className="mt-1 font-semibold text-slate-950 dark:text-white">
                      {listing.title}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-white/35">
                      Views
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {listing.views}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-white/35">
                      Bookings
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {listing.bookings}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-white/35">
                      Conversion
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {listing.conversionRate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Listing visits will appear here once tourist app and public profile events include listing IDs." />
          )}
        </Panel>

        <Panel title="Audience">
          <div className="space-y-4">
            <InsightList
              title="Countries"
              items={insights?.byCountry ?? []}
              icon={<Globe2 className="h-4 w-4" />}
            />
            <InsightList
              title="Cities"
              items={insights?.byCity ?? []}
              icon={<Globe2 className="h-4 w-4" />}
            />
            <InsightList
              title="Platform"
              items={insights?.byPlatform ?? []}
              icon={<MonitorSmartphone className="h-4 w-4" />}
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Event stream">
          {insights?.recent.length ? (
            <div className="space-y-2 font-mono text-xs">
              {insights.recent.map((event, index) => (
                <div
                  key={`${event.eventType}-${event.createdAt}-${index}`}
                  className="rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {event.eventType}
                    </span>
                    <span className="text-slate-400 dark:text-white/35">
                      {formatDisplayDateTime(event.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-white/45">
                    {event.listingTitle || "Provider profile"} |{" "}
                    {event.city || event.country || "Unknown location"} |{" "}
                    {event.platform || "Unknown platform"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Realtime-style event rows will appear as tourist views are tracked." />
          )}
        </Panel>

        <Panel title="Recommended actions">
          <div className="space-y-2 text-sm text-slate-600 dark:text-white/60">
            {[
              topListing
                ? `Refresh gallery images for ${topListing.title} to improve conversion.`
                : "Add listing-level view tracking to identify your strongest listing.",
              topPlatform
                ? `Most traffic is on ${topPlatform.key}; review that experience first.`
                : "Capture platform and device for every tourist app profile view.",
              (analytics?.metrics.pendingBookings ?? 0) > 0
                ? "Reply to pending bookings quickly to protect booking conversion."
                : "Use special offers when traffic is high but bookings are low.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
              >
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function ReviewsPanel({ company }: { company: ProviderCompanyRecord }) {
  const rating = company.ratingStats?.average ?? 0;
  const reviewCount = company.ratingStats?.reviewCount ?? 0;
  const distribution = company.ratingStats?.distribution ?? {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  const max = Math.max(...Object.values(distribution), 1);

  return (
    <Panel title="Reviews">
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-3xl font-bold text-slate-950 dark:text-white">
            <Star className="h-7 w-7 fill-[#ffc247] text-[#ffc247]" />
            {rating ? rating.toFixed(1) : "N/A"}
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-white/45">
            {reviewCount} reviews
          </div>
        </div>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star as keyof typeof distribution] ?? 0;
            return (
              <div
                key={star}
                className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 text-sm"
              >
                <span className="font-medium text-slate-600 dark:text-white/60">
                  {star} star
                </span>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#ffc247]"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="text-right text-slate-500 dark:text-white/45">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function AccountPanel({
  company,
  emailVerified,
  onActivityLogChange,
}: {
  company: ProviderCompanyRecord;
  emailVerified: boolean;
  onActivityLogChange: () => void;
}) {
  const { user } = useAuth();
  const [accountEmail, setAccountEmail] = useState(
    user?.email || company.businessEmail,
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Manager");
  const [notice, setNotice] = useState("");
  const [resetting, setResetting] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  useEffect(() => {
    setAccountEmail(user?.email || company.businessEmail);
  }, [company.businessEmail, user?.email]);

  const saveEmail = async () => {
    if (!accountEmail.trim() || savingEmail) return;
    setSavingEmail(true);
    setNotice("");
    try {
      const payload = await apiFetch<{ user: typeof user }>(
        "/api/provider/account",
        {
          method: "PATCH",
          body: JSON.stringify({ email: accountEmail.trim() }),
        },
      );
      if (payload.user && typeof window !== "undefined") {
        localStorage.setItem("off2zim_user", JSON.stringify(payload.user));
      }
      onActivityLogChange();
      setNotice(
        "Email updated. Verify the new address before submitting reviews.",
      );
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Unable to update email address.",
      );
    } finally {
      setSavingEmail(false);
    }
  };

  const sendVerificationEmail = async () => {
    if (!accountEmail.trim() || sendingVerification) return;
    setSendingVerification(true);
    setNotice("");
    try {
      const payload = await apiFetch<{
        ok: boolean;
        delivered: boolean;
        verificationUrl?: string;
      }>("/api/auth/verify-email/request", {
        method: "POST",
        body: JSON.stringify({ email: accountEmail.trim() }),
      });
      setNotice(
        payload.verificationUrl
          ? `Verification link generated: ${payload.verificationUrl}`
          : "Verification email sent.",
      );
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Unable to send verification email.",
      );
    } finally {
      setSendingVerification(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!accountEmail || resetting) return;
    setResetting(true);
    setNotice("");
    try {
      const payload = await apiFetch<{
        ok: boolean;
        delivered: boolean;
        resetUrl?: string;
      }>("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: accountEmail }),
      });
      setNotice(
        payload.resetUrl
          ? `Reset link generated: ${payload.resetUrl}`
          : "Password reset link sent to the account email.",
      );
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Unable to request a password reset right now.",
      );
    } finally {
      setResetting(false);
    }
  };

  const requestInvite = () => {
    if (!inviteEmail.trim()) {
      setNotice("Add an email address before inviting a team member.");
      return;
    }
    setNotice(
      `${inviteRole} invite captured in the UI. Connect the provider-team backend before sending live invites.`,
    );
  };

  return (
    <div className="space-y-5">
      {notice ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-[#101010] dark:text-white/60">
          {notice}
        </div>
      ) : null}

      <Panel title="Email verification">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
              Account email
            </span>
            <input
              type="email"
              value={accountEmail}
              onChange={(event) => setAccountEmail(event.target.value)}
              className="min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#ff5630] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveEmail}
              disabled={savingEmail || !accountEmail.trim()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-45 dark:bg-white dark:text-slate-950"
            >
              {savingEmail ? "Saving..." : "Update email"}
            </button>
            <button
              type="button"
              onClick={sendVerificationEmail}
              disabled={sendingVerification || emailVerified}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.04]"
            >
              <MailCheck className="h-4 w-4" />
              {sendingVerification
                ? "Sending..."
                : emailVerified
                  ? "Verified"
                  : "Verify"}
            </button>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-white/[0.04] dark:text-white/60">
          {emailVerified ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          {emailVerified ? "Email verified" : "Email verification required"}
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Account users">
          <div className="space-y-3">
            <div className="grid gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10 md:grid-cols-[1fr_140px_120px] md:items-center">
              <div>
                <div className="font-semibold text-slate-950 dark:text-white">
                  {user?.name ||
                    [user?.firstName, user?.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    user?.email ||
                    "Account owner"}
                </div>
                <div className="mt-1 text-slate-500 dark:text-white/45">
                  {accountEmail}
                </div>
              </div>
              <span className="text-slate-500 dark:text-white/45">
                Super admin
              </span>
              <button
                type="button"
                disabled
                className="h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-400 dark:border-white/10 dark:text-white/30"
              >
                Protected
              </button>
            </div>

            <div className="grid gap-3 rounded-xl border border-dashed border-slate-200 p-3 dark:border-white/10 md:grid-cols-[1fr_160px_auto] md:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                  New user email
                </span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#ff5630] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                  Role
                </span>
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#ff5630] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                >
                  <option>Manager</option>
                  <option>Listings editor</option>
                  <option>Bookings support</option>
                  <option>Finance viewer</option>
                </select>
              </label>
              <button
                type="button"
                onClick={requestInvite}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                <UserPlus className="h-4 w-4" />
                Add user
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Security">
          <div className="space-y-3 text-sm text-slate-600 dark:text-white/60">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <div className="font-semibold text-slate-950 dark:text-white">
                Password
              </div>
              <p className="mt-1">
                Send a password reset link to the account email. The password is
                never shown or edited inside the dashboard.
              </p>
              <button
                type="button"
                onClick={requestPasswordReset}
                disabled={resetting}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#ff5630] px-4 text-sm font-semibold text-white transition hover:bg-[#e84b29] disabled:pointer-events-none disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {resetting ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function ProviderHeaderStatus({
  provider,
  onClick,
}: {
  provider: ProviderCompanyRecord;
  onClick: () => void;
}) {
  const requiredDocumentsApproved = [
    "certificate_of_incorporation",
    "contact_person_id",
    "tax_clearance",
  ].every((type) =>
    provider.documents.some(
      (document) => document.type === type && document.status === "approved",
    ),
  );
  const hasRequiredProfile =
    Boolean(provider.tradingName || provider.companyName) &&
    Boolean(provider.businessPhone) &&
    Boolean(provider.businessEmail) &&
    Boolean(provider.businessDescription) &&
    provider.serviceAreas.length > 0 &&
    provider.serviceCategories.length > 0;
  const hasListings = (provider.listingStats?.active ?? 0) > 0;
  const isOnline =
    provider.onboardingStatus === "basic_approved" &&
    ["active", "trialing"].includes(provider.tierStatus) &&
    requiredDocumentsApproved &&
    hasRequiredProfile &&
    hasListings;
  const label = isOnline ? "Online" : "Attention Required";

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex items-center gap-2 rounded-full text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-[#ff5630]/15"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
            isOnline ? "bg-emerald-500" : "bg-rose-500",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            isOnline
              ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]"
              : "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]",
          )}
        />
      </span>
      <span
        className={
          isOnline
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-rose-700 dark:text-rose-300"
        }
      >
        {label}
      </span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101010]">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
        {label}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-white/45">
        {helper}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010]">
      <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PayoutInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add"
        className="min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#ff5630] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30"
      />
    </label>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "success"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
          : tone === "warning"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
            : "bg-slate-100 text-slate-600 dark:bg-white/[0.08] dark:text-white/45",
      )}
    >
      {label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/45">
      {message}
    </div>
  );
}

function ActivityRow({
  item,
}: {
  item: ProviderAnalytics["recentActivity"][number];
}) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10">
      <div className="font-semibold text-slate-950 dark:text-white">
        {item.title}
      </div>
      <div className="mt-1 text-slate-500 dark:text-white/45">{item.body}</div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400 dark:text-white/35">
        <span>{formatDisplayDate(item.meta)}</span>
        <span>{item.amount}</span>
      </div>
    </div>
  );
}

function ActivityLogRow({
  log,
  contactName,
}: {
  log: AdminActivityLogRecord;
  contactName?: string | null;
}) {
  return (
    <tr className="align-top hover:bg-slate-50 dark:hover:bg-white/[0.03]">
      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-white/60">
        {formatDisplayDateTime(log.createdAt)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-700 dark:text-white/70">
        {formatActivityUser(log)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-700 dark:text-white/70">
        {log.actor.role === "provider"
          ? contactName || log.actor.name
          : log.actor.name}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-white/60">
        {log.actor.email}
      </td>
      <td className="px-3 py-3 text-slate-900 dark:text-white">
        {formatActivityDetails(log)}
      </td>
    </tr>
  );
}

function formatActivityUser(log: AdminActivityLogRecord) {
  if (log.actor.role === "provider") return "Super admin";
  if (log.actor.role === "admin") return "Off2Zim admin";
  return formatDisplayLabel(log.actor.role);
}

function formatActivityDetails(log: AdminActivityLogRecord) {
  const metadata = log.metadata ?? {};
  const displayId =
    readActivityString(metadata.listingDisplayId) ||
    readActivityString(metadata.targetDisplayId) ||
    log.targetDisplayId ||
    "";
  const title =
    readActivityString(metadata.title) ||
    readActivityString(metadata.listingTitle);
  const fields = Array.isArray(metadata.updatedFields)
    ? metadata.updatedFields
        .filter((field): field is string => typeof field === "string")
        .map(formatActivityField)
        .filter(Boolean)
    : [];

  switch (log.action) {
    case "user_signed_up":
      return "Created the service provider account.";
    case "provider_logged_in":
      return "Signed in.";
    case "provider_logged_out":
      return "Signed out.";
    case "provider_listing_created":
      return `Created listing ${displayId || title || ""}`.trim() + ".";
    case "provider_listing_updated":
      return fields.length > 0
        ? `Updated listing ${displayId || title || ""}: ${fields.join(", ")}.`
        : `Updated listing ${displayId || title || ""}.`;
    case "provider_listing_deleted":
      return `Deleted listing ${displayId || title || ""}`.trim() + ".";
    case "listing_updated":
      return `Reviewed listing ${displayId || title || ""}`.trim() + ".";
    case "provider_media_uploaded":
      return `Uploaded gallery image for ${displayId || "a listing"} for Off2Zim review.`;
    case "provider_media_reviewed":
      return `Reviewed gallery image for ${displayId || "a listing"}.`;
    case "provider_review_updated":
      return `Reviewed service provider profile${
        readActivityString(metadata.status)
          ? `: ${formatActivityField(readActivityString(metadata.status))}`
          : ""
      }.`;
    case "provider_section_reviewed":
      return `${formatDisplayLabel(
        readActivityString(metadata.section) || "Section",
      )} was ${formatActivityField(
        readActivityString(metadata.decision) || "reviewed",
      )}.`;
    case "provider_gallery_enabled":
      return "Enabled listing gallery.";
    case "provider_gallery_disabled":
      return "Disabled listing gallery.";
    case "provider_profile_image_updated":
      return "Updated profile picture.";
    case "provider_cover_image_updated":
      return "Updated cover image.";
    case "provider_operating_time_enabled":
      return "Enabled operating time.";
    case "provider_operating_time_disabled":
      return "Disabled operating time.";
    case "provider_operating_time_updated":
      return "Updated operating time.";
    case "provider_payout_method_updated":
      return `Updated payout method${
        readActivityString(metadata.payoutMethod)
          ? ` to ${formatDisplayLabel(readActivityString(metadata.payoutMethod))}`
          : ""
      }.`;
    case "provider_premium_upgrade_requested":
      return "Requested upgrade to Premium.";
    case "provider_premium_upgrade_status_updated":
      return "Updated Premium upgrade request.";
    case "provider_account_email_updated":
      return "Updated account email. Email verification is required again.";
    case "provider_profile_updated":
      return fields.length > 0
        ? `Updated profile details: ${fields.join(", ")}.`
        : "Updated profile details.";
    default:
      return sanitizeActivitySummary(log.summary);
  }
}

function readActivityString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatActivityField(value: string) {
  const clean = value
    .replace(/^__off2zim_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return clean ? formatDisplayLabel(clean) : "";
}

function sanitizeActivitySummary(value: string) {
  const clean = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean
    ? `${clean.charAt(0).toUpperCase()}${clean.slice(1)}`
    : "Activity recorded.";
}

function InsightList({
  title,
  items,
  icon,
}: {
  title: string;
  items: { key: string; count: number }[];
  icon: ReactNode;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
        {icon}
        {title}
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <div key={`${title}-${item.key}`} className="text-sm">
              <div className="mb-1 flex items-center justify-between gap-3 text-slate-600 dark:text-white/60">
                <span className="truncate">{item.key}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[#ff5630]"
                  style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-white/45">
          No data yet.
        </div>
      )}
    </div>
  );
}

function ProviderGate({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="theme-page flex min-h-screen items-center justify-center px-4">
      <div className="theme-panel max-w-md rounded-[28px] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.06]">
          {icon}
        </div>
        <h1 className="theme-heading mt-4 text-2xl font-semibold">{title}</h1>
        <p className="theme-muted mt-3 text-sm leading-6">{body}</p>
      </div>
    </div>
  );
}

function buildProviderReadiness(
  company: ProviderCompanyRecord,
  listingStats = getProviderListingStats([], company),
  options: { emailVerified?: boolean } = {},
) {
  const sections: Array<{
    label: string;
    tab: ProviderTab;
    missing: string[];
    availability: "available" | "optional" | "unavailable";
    reviewState?: "pending_review";
    unavailableReason?: string;
  }> = [
    {
      label: "Profile",
      tab: "profile",
      availability: "available",
      reviewState: company.pendingReviewSections?.includes("Profile")
        ? "pending_review"
        : undefined,
      missing: [
        !company.profileImageUrl ? "Profile picture" : "",
        !(company.tradingName || company.companyName) ? "Display name" : "",
        !company.businessPhone ? "Business phone" : "",
        !company.businessEmail ? "Business email" : "",
        !company.businessDescription ? "About us" : "",
        company.serviceAreas.length === 0 ? "Operating locations" : "",
        company.serviceCategories.length === 0 ? "Service" : "",
      ].filter(Boolean),
    },
    {
      label: "Contact Person",
      tab: "contact-person",
      availability: "available",
      reviewState:
        company.pendingReviewSections?.includes("Contact Person") ||
        hasPendingDocument(company, "contact_person_id")
          ? "pending_review"
          : undefined,
      missing: [
        !company.mainContactPerson ? "Name" : "",
        !company.contactPersonPhone ? "Phone number" : "",
        !company.contactPersonIdType ? "ID type" : "",
        !company.contactPersonIdNumber ? "ID / passport number" : "",
        !hasApprovedOrUploadedDocument(company, "contact_person_id")
          ? "ID document"
          : "",
      ].filter(Boolean),
    },
    {
      label: "Operating Time",
      tab: "operating-time",
      availability: isOperatingTimeConfigured(company.operatingHours)
        ? "available"
        : "unavailable",
      reviewState: company.pendingReviewSections?.includes("Operating Time")
        ? "pending_review"
        : undefined,
      unavailableReason: "Switched off",
      missing: [],
    },
    {
      label: "Listings",
      tab: "listings",
      availability: "available",
      reviewState: listingStats.pending > 0 ? "pending_review" : undefined,
      missing:
        listingStats.total === 0
          ? ["At least one listing"]
          : listingStats.active === 0 && listingStats.pending === 0
            ? ["At least one approved listing"]
            : [],
    },
    {
      label: "Gallery",
      tab: "gallery",
      availability: company.tierFeatures.includes("gallery_management")
        ? company.galleryEnabled === false
          ? "unavailable"
          : "available"
        : "unavailable",
      unavailableReason: company.tierFeatures.includes("gallery_management")
        ? "Switched off"
        : company.premiumUpgradeStatus === "pending"
          ? "Premium upgrade pending"
          : "Premium feature",
      reviewState: company.pendingReviewSections?.includes("Gallery")
        ? "pending_review"
        : undefined,
      missing:
        company.tierFeatures.includes("gallery_management") &&
        company.galleryEnabled !== false
          ? listingStats.active > 0
            ? []
            : ["Approved listing required"]
          : [],
    },
    {
      label: "Premium Upgrade",
      tab: "profile",
      availability:
        company.providerTier === "premium" ||
        ["pending", "approved"].includes(company.premiumUpgradeStatus ?? "")
          ? "available"
          : "unavailable",
      reviewState:
        company.premiumUpgradeStatus === "pending"
          ? "pending_review"
          : undefined,
      unavailableReason: "No upgrade requested",
      missing: [],
    },
    {
      label: "Company Documents",
      tab: "company-documents",
      availability: "available",
      reviewState:
        company.pendingReviewSections?.some((section) =>
          ["Company Verification", "ZIMRA and Tax Clearance"].includes(section),
        ) ||
        hasPendingDocument(company, "certificate_of_incorporation") ||
        hasPendingDocument(company, "tax_clearance")
          ? "pending_review"
          : undefined,
      missing: [
        !company.legalCompanyName ? "Registered company name" : "",
        !company.incorporationDate ? "Date incorporated" : "",
        !company.businessRegistrationNumber ? "Registration number" : "",
        !hasApprovedOrUploadedDocument(company, "certificate_of_incorporation")
          ? "Certificate of incorporation"
          : "",
        !company.zimraBpNumber ? "ZIMRA BP number" : "",
        !company.tinNumber ? "TIN number" : "",
        !company.taxClearanceExpiresAt ? "Tax clearance expiry" : "",
        !hasApprovedOrUploadedDocument(company, "tax_clearance")
          ? "Tax clearance"
          : "",
      ].filter(Boolean),
    },
    {
      label: "Verify Email",
      tab: "account",
      availability: "available",
      missing: options.emailVerified ? [] : ["Verify email address"],
    },
  ];
  const requiredSections = sections.filter(
    (section) =>
      section.availability === "available" &&
      section.label !== "Premium Upgrade",
  );
  const completed = requiredSections.filter(
    (section) =>
      section.missing.length === 0 && section.reviewState !== "pending_review",
  ).length;

  return {
    sections,
    completed,
    total: requiredSections.length,
    percent: Math.round(
      (completed / Math.max(requiredSections.length, 1)) * 100,
    ),
  };
}

function hasApprovedOrUploadedDocument(
  company: ProviderCompanyRecord,
  type: string,
) {
  return company.documents.some(
    (document) =>
      document.type === type &&
      ["uploaded", "approved", "pending_review"].includes(document.status),
  );
}

function hasPendingDocument(company: ProviderCompanyRecord, type: string) {
  return company.documents.some(
    (document) =>
      document.type === type &&
      ["uploaded", "pending", "pending_review"].includes(document.status),
  );
}

function isOperatingTimeConfigured(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized || normalized === "closed") return false;

  try {
    const parsed = JSON.parse(normalized) as { enabled?: unknown };
    if (typeof parsed.enabled === "boolean") return parsed.enabled;
  } catch {
    // Legacy human-readable operating hours are active when present.
  }

  return true;
}

function getProviderListingStats(
  listings: ProviderListingRecord[],
  company: ProviderCompanyRecord,
) {
  const source = listings.length
    ? listings
    : Array.from({
        length: company.listingStats?.total ?? 0,
      }).map((_, index) => ({
        id: `${index}`,
        status:
          index < (company.listingStats?.active ?? 0)
            ? "active"
            : index <
                (company.listingStats?.active ?? 0) +
                  (company.listingStats?.pending ?? 0)
              ? "pending_review"
              : "draft",
      }));

  return {
    total: source.length,
    active: source.filter((listing) =>
      ["active", "approved"].includes(listing.status),
    ).length,
    pending: source.filter((listing) =>
      ["pending", "pending_review"].includes(listing.status),
    ).length,
  };
}

function normalizePayoutSettings(
  value?: ProviderPayoutSettings | null,
): ProviderPayoutSettings {
  return {
    method: value?.method || "",
    accountName: value?.accountName || "",
    bankName: value?.bankName || "",
    branchName: value?.branchName || "",
    accountNumber: value?.accountNumber || "",
    mobileNumber: value?.mobileNumber || "",
    walletName: value?.walletName || "",
    notes: value?.notes || "",
    updatedAt: value?.updatedAt,
  };
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateKey(date);
}

function bookingTouchesDate(order: ProviderOrderRecord, key: string) {
  const start = dateOnly(order.checkIn) || dateOnly(order.createdAt);
  const end = dateOnly(order.checkOut) || start;
  return Boolean(start && key >= start && key <= end);
}

function isPastCalendarDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target < today;
}

function getListingBookableUnits(
  listing: ProviderListingRecord,
  service: ServiceProviderCategoryId,
) {
  const metadata = listing.metadata ?? {};
  if (service === "stays") {
    return (
      getNestedNumber(metadata, ["stayDetails", "totalUnits"]) ||
      listing.capacity ||
      1
    );
  }
  if (service === "events") {
    return (
      getNestedNumber(metadata, ["eventDetails", "totalTickets"]) ||
      listing.capacity ||
      1
    );
  }
  if (service === "things_to_do") {
    return (
      getNestedNumber(metadata, ["activityDetails", "maxParticipants"]) ||
      listing.capacity ||
      1
    );
  }
  return listing.capacity || 1;
}

function getNestedNumber(
  value: Record<string, unknown>,
  path: [string, string],
) {
  const parent = value[path[0]];
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return 0;
  const next = (parent as Record<string, unknown>)[path[1]];
  const parsed = typeof next === "number" ? next : Number(next);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBookingCalendarTone({
  bookings,
  totalUnits,
  past,
}: {
  bookings: number;
  totalUnits: number;
  past: boolean;
}) {
  if (totalUnits <= 0) {
    return "border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]";
  }

  const availableRatio = Math.max(totalUnits - bookings, 0) / totalUnits;
  if (availableRatio === 0) {
    return past
      ? "border-rose-100 bg-rose-50/50 dark:border-rose-400/10 dark:bg-rose-400/5"
      : "border-rose-200 bg-rose-50 dark:border-rose-400/25 dark:bg-rose-400/10";
  }
  if (availableRatio < 0.5) {
    return past
      ? "border-amber-100 bg-amber-50/50 dark:border-amber-400/10 dark:bg-amber-400/5"
      : "border-amber-200 bg-amber-50 dark:border-amber-400/25 dark:bg-amber-400/10";
  }
  return past
    ? "border-emerald-100 bg-emerald-50/40 dark:border-emerald-400/10 dark:bg-emerald-400/5"
    : "border-emerald-200 bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-400/10";
}

function formatCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatServiceBookingLabel(service: ServiceProviderCategoryId) {
  if (service === "stays") return "Room bookings and nightly availability";
  if (service === "events") return "Ticket sales and event dates";
  if (service === "things_to_do") return "Activity bookings and time slots";
  if (service === "bus") return "Seat bookings and route activity";
  return "Flight bookings and route activity";
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDisplayDateTime(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDisplayLabel(value: string) {
  return formatProviderStatus(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
