"use client";

import React from "react";
import Link from "next/link";
import {
  Badge,
  Building2,
  Settings,
  Shield,
  Star,
} from "lucide-react";
import { getSurfaceHref } from "@/lib/app-surface";

interface ProviderProfile {
  name: string;
  logo: string;
  category: string;
  location: string;
  isVerified: boolean;
  verificationLevel: "Basic" | "Verified" | "Premium";
  rating: number;
  reviewCount: number;
  joinDate: string;
}

export default function ProviderDashboardHeader() {
  const provider: ProviderProfile = {
    name: "Victoria Falls Adventure Co.",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop",
    category: "Adventure Activities",
    location: "Victoria Falls, Zimbabwe",
    isVerified: true,
    verificationLevel: "Verified",
    rating: 4.8,
    reviewCount: 127,
    joinDate: "March 2023",
  };

  const getVerificationBadge = (level: string) => {
    switch (level) {
      case "Premium":
        return {
          icon: <Shield className="h-4 w-4" />,
          className: "bg-[#241733] text-[#d0adff]",
          text: "Premium Verified",
        };
      case "Verified":
        return {
          icon: <Badge className="h-4 w-4" />,
          className: "bg-[#13283a] text-[#8dc9ff]",
          text: "Verified",
        };
      default:
        return {
          icon: <Building2 className="h-4 w-4" />,
          className: "bg-black/[0.05] text-slate-700 dark:bg-white/10 dark:text-white/70",
          text: "Basic",
        };
    }
  };

  const badge = getVerificationBadge(provider.verificationLevel);

  return (
    <section className="border-b border-black/10 bg-transparent dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="theme-panel overflow-hidden rounded-[28px] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={provider.logo}
                  alt={provider.name}
                  className="h-20 w-20 rounded-[20px] border border-black/10 object-cover dark:border-white/10"
                />
                {provider.isVerified && (
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-[#13283a] p-1.5">
                    <Badge className="h-3 w-3 text-[#8dc9ff]" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="theme-heading text-3xl font-semibold">{provider.name}</h1>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
                  >
                    {badge.icon}
                    {badge.text}
                  </span>
                </div>
                <div className="theme-muted mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span>{provider.category}</span>
                  <span>{provider.location}</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[#ffc247] text-[#ffc247]" />
                    {provider.rating} ({provider.reviewCount} reviews)
                  </span>
                  <span>Member since {provider.joinDate}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="theme-button-secondary rounded-full px-4 py-3 text-sm font-medium">
                <Settings className="mr-2 inline h-4 w-4" />
                Settings
              </button>
              <button className="rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white">
                View public profile
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <StatCard
              icon={<Shield className="h-5 w-5 text-[#8dc9ff]" />}
              label="Verification"
              value={provider.verificationLevel}
              meta="Verification status"
            />
            <StatCard
              icon={<Star className="h-5 w-5 text-[#ffc247]" />}
              label="Rating"
              value={String(provider.rating)}
              meta={`${provider.reviewCount} customer reviews`}
            />
            <StatCard
              icon={<Building2 className="h-5 w-5 text-[#ff8a63]" />}
              label="Category"
              value="Adventure"
              meta="Main business category"
            />
            <StatCard
              icon={<Badge className="h-5 w-5 text-[#7ddf8c]" />}
              label="Member since"
              value="2023"
              meta={provider.joinDate}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-black/8 pt-5 dark:border-white/8">
            <Link
              href={getSurfaceHref("provider", "/provider-dashboard?tab=listings")}
              className="theme-button-secondary rounded-full px-4 py-2 text-sm font-medium"
            >
              Add listing
            </Link>
            <Link
              href={getSurfaceHref("provider", "/provider-dashboard?tab=orders")}
              className="theme-button-secondary rounded-full px-4 py-2 text-sm font-medium"
            >
              Manage orders
            </Link>
            <Link
              href={getSurfaceHref("provider", "/provider-dashboard?tab=profile")}
              className="theme-button-secondary rounded-full px-4 py-2 text-sm font-medium"
            >
              Update profile
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="theme-card-soft p-4">
      <div className="theme-subtle flex items-center gap-2 text-sm">
        {icon}
        {label}
      </div>
      <div className="theme-heading mt-3 text-3xl font-semibold">{value}</div>
      <div className="theme-subtle mt-1 text-xs">{meta}</div>
    </div>
  );
}
