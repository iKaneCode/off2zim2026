"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProviderDashboardHeader from "../../components/provider-dashboard/ProviderDashboardHeader";
import ProviderOverview from "../../components/provider-dashboard/ProviderOverview";
import ListingManagement from "../../components/provider-dashboard/ListingManagement";
import EnhancedOrderManagement from "../../components/provider-dashboard/EnhancedOrderManagement";
import VerificationStatus from "../../components/provider-dashboard/VerificationStatus";
import CompanyProfile from "../../components/provider-dashboard/CompanyProfile";
import ShopProductManagement from "../../components/provider-dashboard/ShopProductManagement";
import SubscriptionManager from "../../components/provider-dashboard/SubscriptionManager";
import { apiFetch } from "@/lib/client-api";
import {
  BarChart3,
  BadgeCheck,
  Building2,
  Package,
  Shield,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react";

interface ProviderStats {
  pendingOrders: number;
  activeDisputes: number;
  verificationProgress: number;
  pendingListings: number;
}

function useProviderStats(): ProviderStats {
  const [stats, setStats] = useState<ProviderStats>({
    pendingOrders: 0,
    activeDisputes: 0,
    verificationProgress: 0,
    pendingListings: 0,
  });

  useEffect(() => {
    Promise.all([
      apiFetch<{ orders: { status: string }[] }>("/api/provider/orders").catch(() => ({ orders: [] })),
      apiFetch<{ disputes: { status: string }[] }>("/api/provider/disputes").catch(() => ({ disputes: [] })),
      apiFetch<{ company: { verificationTier?: string; onboardingStatus?: string; listings?: { status: string }[] } | null }>("/api/provider/company").catch(() => ({ company: null })),
    ]).then(([ordersData, disputesData, companyData]) => {
      const pendingOrders = ordersData.orders.filter((o) =>
        ["PENDING", "REQUESTED", "pending", "requested"].includes(o.status)
      ).length;

      const activeDisputes = disputesData.disputes.filter((d) =>
        !["resolved", "closed"].includes((d.status ?? "").toLowerCase())
      ).length;

      const company = companyData.company;
      let verificationProgress = 0;
      if (company) {
        if (company.verificationTier === "verified_premium") verificationProgress = 100;
        else if (company.verificationTier === "basic") verificationProgress = 75;
        else if (company.onboardingStatus === "pending_review") verificationProgress = 50;
        else if (company.onboardingStatus === "profile_complete") verificationProgress = 25;
        else verificationProgress = 10; // company exists
      }

      const pendingListings = (company?.listings ?? []).filter((l) =>
        l.status === "pending_review"
      ).length;

      setStats({ pendingOrders, activeDisputes, verificationProgress, pendingListings });
    });
  }, []);

  return stats;
}

export default function ProviderDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const notificationData = useProviderStats();

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      description: "Performance, activity, and business updates",
    },
    {
      id: "profile",
      label: "Company Profile",
      icon: Building2,
      description: "Manage your business details and settings",
    },
    {
      id: "listings",
      label: "Listings",
      icon: Package,
      description: "Manage your services, stays, and products",
      badge:
        notificationData.pendingListings > 0
          ? notificationData.pendingListings
          : null,
    },
    {
      id: "orders",
      label: "Orders & Disputes",
      icon: Users,
      description: "Manage bookings, customer requests, and disputes",
      badge: notificationData.pendingOrders + notificationData.activeDisputes,
      badgeColor:
        notificationData.activeDisputes > 0
          ? "bg-[#2a0f0a] text-[#ff8a78]"
          : "bg-[#2a1f00] text-[#ffc247]",
    },
    {
      id: "shop",
      label: "Products",
      icon: ShoppingBag,
      description: "Manage products, stock, and product sales",
    },
    {
      id: "subscriptions",
      label: "Subscriptions",
      icon: BadgeCheck,
      description: "Manage plans, featured placement, and related earnings",
    },
    {
      id: "verification",
      label: "Verification",
      icon: Shield,
      description: "Complete your business verification steps",
      badge: `${notificationData.verificationProgress}%`,
      badgeColor:
        notificationData.verificationProgress === 100
          ? "bg-[#0f2a1e] text-[#4ade80]"
          : "bg-[#13283a] text-[#8dc9ff]",
    },
  ];

  const activeTab =
    tabs.find((tab) => tab.id === searchParams.get("tab"))?.id || "overview";

  const setActiveTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (tabId === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <ProviderOverview onNavigateToTab={setActiveTab} />;
      case "profile":
        return <CompanyProfile />;
      case "listings":
        return <ListingManagement />;
      case "orders":
        return <EnhancedOrderManagement />;
      case "shop":
        return <ShopProductManagement />;
      case "subscriptions":
        return <SubscriptionManager />;
      case "verification":
        return <VerificationStatus />;
      default:
        return <ProviderOverview onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <div className="theme-page min-h-screen">
      <main>
        <ProviderDashboardHeader />

        {/* Navigation Tabs */}
        <div className="sticky top-0 z-40 border-b border-black/10 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#070707]/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Mobile Tab Selector */}
            <div className="sm:hidden py-4">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="theme-input w-full rounded-2xl px-4 py-3"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                    {tab.badge && ` (${tab.badge})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden space-x-8 overflow-x-auto sm:flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-[#ff5630] text-slate-950 dark:text-white"
                        : "border-transparent text-slate-500 hover:text-slate-900 hover:border-black/15 dark:text-white/45 dark:hover:text-white/75 dark:hover:border-white/20"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.badge && (
                      <span
                        className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          tab.badgeColor || "bg-white/10 text-white/80"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Message for New Users */}
          {notificationData.verificationProgress < 50 &&
            activeTab === "overview" && (
              <div className="theme-panel-soft mb-6 rounded-[24px] p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-[#2d1714] p-3 shrink-0">
                    <Star className="w-5 h-5 text-[#ff7352]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold theme-heading">
                      Complete your provider setup
                    </h3>
                    <p className="mb-4 text-sm theme-muted leading-6">
                      Finish your company profile and verification steps to start listing confidently and manage orders more smoothly.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveTab("profile")}
                        className="rounded-full bg-[#ff5630] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ff7352]"
                      >
                        Complete profile
                      </button>
                      <button
                        onClick={() => setActiveTab("verification")}
                        className="theme-button-secondary rounded-full px-5 py-2 text-sm font-medium"
                      >
                        Start verification
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Tab Description */}
          <div className="mb-6">
            <div className="theme-panel-soft rounded-[24px] p-5">
              <div className="flex items-center gap-3">
                {tabs.map((tab) => {
                  if (tab.id === activeTab) {
                    const Icon = tab.icon;
                    return (
                      <React.Fragment key={tab.id}>
                        <div className="rounded-2xl bg-black/[0.05] p-3 dark:bg-white/[0.05]">
                          <Icon className="w-5 h-5 text-[#ff7352]" />
                        </div>
                        <div>
                          <h1 className="theme-heading text-xl font-bold">
                            {tab.label}
                          </h1>
                          <p className="theme-muted text-sm">
                            {tab.description}
                          </p>
                        </div>
                      </React.Fragment>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="transition-all duration-300">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
