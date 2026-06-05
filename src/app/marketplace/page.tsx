"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Filter, Grid, List, MapPin, Search, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import type { PublicListingRecord } from "@/types/platform";
import FilterChips from "@/components/ui/FilterChips";
import ServiceSubtypeChips from "@/components/ui/ServiceSubtypeChips";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import {
  getServiceGroup,
  getSubtypesForGroup,
  inferServiceGroup,
  inferServiceSubtype,
  serviceGroups,
  type ServiceGroupId,
} from "@/lib/taxonomy";

function MarketplacePageContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams?.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams?.get("category") || "all"
  );
  const [selectedServiceGroup, setSelectedServiceGroup] = useState(
    searchParams?.get("serviceGroup") || "all"
  );
  const [selectedSubtype, setSelectedSubtype] = useState(searchParams?.get("subtype") || "all");
  const [destinationFilter] = useState(searchParams?.get("destination") || "");
  const [listingType] = useState(searchParams?.get("listingType") || "all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [listings, setListings] = useState<PublicListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadListings = async () => {
      try {
        const payload = await apiFetch<{ listings: PublicListingRecord[] }>(
          `/api/listings?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(selectedCategory)}&listingType=${encodeURIComponent(listingType)}&serviceGroup=${encodeURIComponent(selectedServiceGroup)}&subtype=${encodeURIComponent(selectedSubtype)}&destination=${encodeURIComponent(destinationFilter)}`
        );
        setListings(payload.listings);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load public listings.");
      } finally {
        setLoading(false);
      }
    };

    const timeout = window.setTimeout(loadListings, 200);
    return () => window.clearTimeout(timeout);
  }, [destinationFilter, listingType, searchQuery, selectedCategory, selectedServiceGroup, selectedSubtype]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of listings) {
      counts.set(listing.category, (counts.get(listing.category) || 0) + 1);
    }

    return [
      { id: "all", label: "All Listings", count: listings.length },
      ...Array.from(counts.entries()).map(([category, count]) => ({
        id: category,
        label: category,
        count,
      })),
    ];
  }, [listings]);
  const activeGroup =
    selectedServiceGroup !== "all"
      ? getServiceGroup(selectedServiceGroup as ServiceGroupId)
      : null;
  const subtypeOptions = activeGroup ? getSubtypesForGroup(activeGroup.id) : [];
  const listingSummary = destinationFilter
    ? `Showing destination-linked listings for ${destinationFilter.replace(/-/g, " ")}.`
    : "Shop trusted stays, experiences, services, and travel essentials.";

  return (
    <div className="theme-page min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <div className="apple-surface rounded-[2rem] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <Link
              href="/"
              className="apple-action-secondary h-10 w-10 p-0"
              title="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#86868b] dark:text-white/42">
                Traveler marketplace
              </p>
              <h1 className="mt-1 text-3xl font-bold theme-heading">Marketplace</h1>
              <p className="mt-1 text-sm text-[#6e6e73] dark:text-white/60">
                {listingSummary}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#86868b] dark:text-white/35" />
              <input
                type="text"
                placeholder="Search listings, locations, or experiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="theme-input h-12 w-full rounded-full pl-12 pr-4 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="apple-action-secondary h-12 px-4"
                title="Show category filters"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <div className="flex rounded-full border border-black/[0.08] bg-white/70 p-1 backdrop-blur-xl dark:border-white/[0.09] dark:bg-white/[0.06]">
                <button
                  onClick={() => setViewMode("grid")}
                    className={`rounded-full p-2 transition ${
                    viewMode === "grid"
                      ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]"
                      : "text-[#86868b] hover:bg-black/[0.05] dark:text-white/55 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                    className={`rounded-full p-2 transition ${
                    viewMode === "list"
                      ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]"
                      : "text-[#86868b] hover:bg-black/[0.05] dark:text-white/55 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <FilterChips
              options={[
                { id: "all", label: "All services" },
                ...serviceGroups.map((group) => ({ id: group.id, label: group.label })),
              ]}
              selected={selectedServiceGroup}
              onSelect={(groupId) => {
                setSelectedServiceGroup(groupId);
                setSelectedSubtype("all");
                setSelectedCategory("all");
              }}
            />
            {activeGroup ? (
              <ServiceSubtypeChips
                subtypes={subtypeOptions}
                activeSubtype={selectedSubtype}
                onSelect={setSelectedSubtype}
                allLabel={`All ${activeGroup.label.toLowerCase()}`}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row">
          {showFilters && (
            <aside className="lg:w-72 space-y-4">
              <div className="theme-panel-strong rounded-xl p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
                <h3 className="mb-3 text-sm font-semibold theme-heading">Categories</h3>
                <div className="space-y-1.5">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm ${
                        selectedCategory === category.id
                          ? "bg-[#ff5630]/10 text-[#ff5630] dark:bg-[#ff5630]/16"
                          : "text-slate-700 hover:bg-black/[0.045] dark:text-white/78 dark:hover:bg-white/7"
                      }`}
                    >
                      <span>{category.label}</span>
                      <span className="text-sm opacity-70">{category.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <main className="flex-1">
            {/* Mobile category chips (visible when sidebar hidden) */}
            {!showFilters && (
              <FilterChips
                options={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                className="mb-6"
              />
            )}

            {error ? (
              <div className="mb-6 rounded-2xl bg-[#2d1714] px-4 py-3 text-sm text-[#ff8a78]">
                {error}
              </div>
            ) : null}

            {loading ? (
              <SkeletonGrid count={6} />
            ) : listings.length === 0 ? (
              <div className="theme-panel rounded-[28px] p-10 text-center space-y-3">
                <p className="theme-heading font-semibold">No listings match your search</p>
                <p className="theme-muted text-sm max-w-xs mx-auto leading-6">
                  Try adjusting the filters, clearing the search, or browsing a different category.
                </p>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
                    : "space-y-3"
                }
              >
                {listings.map((listing) => (
                  <article
                    key={listing.id}
                    className={`group theme-card overflow-hidden rounded-[1.5rem] ${
                      viewMode === "list" ? "flex flex-col md:flex-row" : "flex flex-col"
                    }`}
                  >
                    {/* Clickable image + content area → detail page */}
                    <Link
                      href={`/marketplace/${listing.slug}`}
                      className={`block ${viewMode === "list" ? "md:w-60 md:shrink-0" : ""}`}
                    >
                      <div
                        className={`relative bg-[linear-gradient(180deg,#f5f5f7,#e8e8ed)] dark:bg-[linear-gradient(180deg,#1d1d1f,#0b0b0d)] ${
                          viewMode === "list" ? "h-full min-h-[118px]" : "h-32"
                        } overflow-hidden`}
                      >
                        {listing.images?.[0] ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full items-end p-4">
                            <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-xl">
                              {inferServiceGroup(listing).label}
                            </span>
                          </div>
                        )}
                        {listing.provider.hasVerifiedBadge ? (
                          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#8dc9ff]" />
                          </div>
                        ) : null}
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col p-4">
                      {/* Linked title + description */}
                      <Link href={`/marketplace/${listing.slug}`} className="block flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="theme-heading line-clamp-2 font-semibold leading-snug">
                            {listing.title}
                          </h2>
                          <span className="theme-heading shrink-0 text-base font-semibold">
                            {listing.basePrice ? `$${listing.basePrice}` : "Quote"}
                          </span>
                        </div>

                        <p
                          className="theme-muted mt-1.5 line-clamp-1 text-xs leading-5"
                          title={listing.shortDescription || listing.description}
                        >
                          {listing.shortDescription || listing.description}
                        </p>

                        <div className="theme-muted mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#0071e3]" />
                            {listing.location}
                          </span>
                          {listing.bookingMode === "instant" ? (
                            <span className="inline-flex items-center gap-1 text-[#fbbf24]">
                              <Zap className="h-3.5 w-3.5" />
                              Instant
                            </span>
                          ) : null}
                          <span className="ml-auto text-[#86868b] dark:text-white/35">
                            {inferServiceSubtype(listing)?.label || listing.provider.companyName}
                          </span>
                        </div>
                      </Link>

                      {/* CTA row */}
                      <div className="mt-3 flex items-center gap-2 border-t border-black/[0.08] pt-3 dark:border-white/[0.08]">
                        <Link
                          href={`/marketplace/${listing.slug}`}
                          className="apple-action-secondary flex-1 px-4 py-2.5 text-center text-xs"
                        >
                          See details
                        </Link>
                        <Link
                          href={`/marketplace/${listing.slug}#booking`}
                          className="apple-action flex-1 px-4 py-2.5 text-center text-xs"
                        >
                          Book now
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="theme-page min-h-screen px-8 py-16">
          <SkeletonGrid count={6} />
        </div>
      }
    >
      <MarketplacePageContent />
    </Suspense>
  );
}
