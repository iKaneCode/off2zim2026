"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AdjustmentsHorizontalIcon,
  Bars3Icon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon, StarIcon } from "@heroicons/react/24/solid";
import { useTripPlanner } from "@/contexts/TripPlannerContext";
import type { PlannerCatalogItem } from "@/types/trip-planner";
import type { PublicListingRecord } from "@/types/platform";
import { publicListingToPlannerCatalogItem } from "@/lib/public-listing-adapter";
import { apiFetch } from "@/lib/client-api";

function TripPlannerSearchPageContent() {
  const searchParams = useSearchParams();
  const { addCatalogItem, items } = useTripPlanner();
  const [activeTab, setActiveTab] = useState<
    "all" | "accommodation" | "activity" | "transport"
  >(
    searchParams?.get("listingType") === "transport"
      ? "transport"
      : "all"
  );
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState(searchParams?.get("search") || "");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [results, setResults] = useState<PlannerCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      try {
        const payload = await apiFetch<{ listings: PublicListingRecord[] }>(
          `/api/listings?search=${encodeURIComponent(searchTerm)}`
        );
        setResults(payload.listings.map(publicListingToPlannerCatalogItem));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load planner results.");
      } finally {
        setLoading(false);
      }
    };

    const timeout = window.setTimeout(loadResults, 200);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const locations = useMemo(
    () => ["all", ...Array.from(new Set(results.map((item) => item.location)))],
    [results]
  );

  const filteredResults = useMemo(() => {
    let filtered = results.filter((result) => {
      const matchesTab = activeTab === "all" || result.type === activeTab;
      const matchesLocation =
        selectedLocation === "all" || result.location === selectedLocation;
      return matchesTab && matchesLocation;
    });

    switch (sortBy) {
      case "price-low":
        filtered = filtered.sort(
          (a, b) =>
            Number(a.price.replace(/[^0-9.]/g, "")) -
            Number(b.price.replace(/[^0-9.]/g, ""))
        );
        break;
      case "price-high":
        filtered = filtered.sort(
          (a, b) =>
            Number(b.price.replace(/[^0-9.]/g, "")) -
            Number(a.price.replace(/[^0-9.]/g, ""))
        );
        break;
      case "rating":
        filtered = filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        filtered = filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    return filtered;
  }, [activeTab, results, selectedLocation, sortBy]);

  const plannerHref = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `/trip-planner?${query}` : "/trip-planner";
  }, [searchParams]);

  const resultCounts = useMemo(
    () => ({
      all: results.length,
      accommodation: results.filter((item) => item.type === "accommodation").length,
      activity: results.filter((item) => item.type === "activity").length,
      transport: results.filter((item) => item.type === "transport").length,
    }),
    [results]
  );

  return (
    <div className="theme-page pb-20">
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8">
        <div className="theme-panel rounded-[36px] p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="theme-label text-sm uppercase tracking-[0.28em]">
                Trip search
              </p>
              <h1 className="theme-heading mt-2 text-4xl font-semibold">
                Build your itinerary from live provider listings
              </h1>
              <p className="theme-muted mt-3 max-w-2xl text-sm leading-7">
                The planner now pulls from the same provider-managed catalog used by the
                marketplace, so itinerary building and booking discovery stay aligned.
              </p>
            </div>

            <div className="theme-card-soft rounded-[24px] px-5 py-4 text-sm">
              {items.length} itinerary item{items.length !== 1 ? "s" : ""} saved
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.7fr_auto]">
            <div className="relative">
              <MagnifyingGlassIcon className="theme-subtle absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                type="text"
                placeholder="Search stays, activities, transport, or providers..."
                className="theme-input w-full rounded-2xl py-3 pl-12 pr-4 text-sm"
              />
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="theme-input rounded-2xl px-4 py-3 text-sm"
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location === "all" ? "All locations" : location}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="theme-input rounded-2xl px-4 py-3 text-sm"
            >
              <option value="featured">Featured first</option>
              <option value="price-low">Price low to high</option>
              <option value="price-high">Price high to low</option>
              <option value="rating">Top rated</option>
            </select>
            <Link
              href={plannerHref}
              className="inline-flex items-center justify-center rounded-2xl bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white"
            >
              Open planner
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              ["all", "All results"],
              ["accommodation", "Stays"],
              ["activity", "Activities"],
              ["transport", "Transport"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === key
                    ? "bg-white text-black dark:bg-white dark:text-black"
                    : "theme-chip"
                }`}
              >
                {label} ({resultCounts[key as keyof typeof resultCounts]})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="theme-card-soft flex rounded-full p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-full p-2 ${viewMode === "grid" ? "bg-white text-black dark:bg-white dark:text-black" : "theme-subtle"}`}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-full p-2 ${viewMode === "list" ? "bg-white text-black dark:bg-white dark:text-black" : "theme-subtle"}`}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            </div>
            <button className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              Filters
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="theme-panel rounded-[36px] p-12 text-center">
            <h2 className="theme-heading text-2xl font-semibold">Planner search unavailable</h2>
            <p className="theme-muted mt-3 text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="theme-panel rounded-[36px] p-12 text-center">
            <p className="theme-muted text-sm">Loading live planner results...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="theme-panel rounded-[36px] p-12 text-center">
            <h2 className="theme-heading text-2xl font-semibold">No planner results found</h2>
            <p className="theme-muted mt-3 text-sm">
              Try a broader destination, different category, or fewer filters.
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                : "space-y-5"
            }
          >
            {filteredResults.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                viewMode={viewMode}
                onAddToTrip={() => addCatalogItem(result)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function TripPlannerSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="theme-page p-8">
          <div className="theme-panel rounded-[32px] p-8 text-center">
            <p className="theme-muted text-sm">Loading planner search...</p>
          </div>
        </div>
      }
    >
      <TripPlannerSearchPageContent />
    </Suspense>
  );
}

function SearchResultCard({
  result,
  viewMode,
  onAddToTrip,
}: {
  result: PlannerCatalogItem;
  viewMode: "grid" | "list";
  onAddToTrip: () => void;
}) {
  const featureList = result.amenities || result.highlights || [];

  const statusClass =
    result.availability === "Limited"
      ? "bg-[#332513] text-[#ffca74]"
      : result.availability === "Verified"
        ? "bg-[#193321] text-[#8cf0a1]"
        : "bg-[#13283a] text-[#8dc9ff]";

  if (viewMode === "list") {
    return (
      <article className="theme-card overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr]">
          <div
            className="relative min-h-[240px] bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.42)), url('${result.image}')`,
            }}
          >
            <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
              {result.availability}
            </div>
            <button className="absolute right-4 top-4 rounded-full bg-black/45 p-3 text-white backdrop-blur">
              <HeartIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="theme-label text-xs uppercase tracking-[0.24em]">{result.category}</p>
                <h3 className="theme-heading mt-2 text-2xl font-semibold">{result.name}</h3>
              </div>
              <div className="theme-chip inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm">
                <StarIcon className="h-4 w-4 text-[#ffc247]" />
                {result.rating} ({result.reviews})
              </div>
            </div>

            <div className="theme-muted mt-4 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-[#ff7352]" />
                {result.location}
              </span>
              {result.duration && (
                <span className="inline-flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-[#5aa7ff]" />
                  {result.duration}
                </span>
              )}
              {result.maxGuests && (
                <span className="inline-flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-[#7ddf8c]" />
                  Up to {result.maxGuests} guests
                </span>
              )}
            </div>

            <p className="theme-muted mt-4 text-sm leading-6">{result.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {featureList.slice(0, 4).map((feature) => (
                <span key={feature} className="theme-chip rounded-full px-3 py-2 text-xs">
                  {feature}
                </span>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <span className="theme-heading text-3xl font-bold">{result.price}</span>
                <span className="theme-subtle ml-1 text-sm">{result.priceUnit}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onAddToTrip}
                  className="theme-button-secondary rounded-full px-4 py-3 text-sm font-semibold"
                >
                  Add to trip
                </button>
                <Link
                  href={`/trip-planner/listing/${result.id}`}
                  className="rounded-full bg-[#ff5630] px-4 py-3 text-sm font-semibold text-white"
                >
                  View details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="theme-card overflow-hidden">
      <div
        className="relative h-56 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.42)), url('${result.image}')`,
        }}
      >
        <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
          {result.availability}
        </div>
        <div className="absolute right-4 top-4 flex gap-2">
          <span className="rounded-full bg-black/45 px-3 py-2 text-xs font-medium text-white backdrop-blur">
            {result.type}
          </span>
          <button className="rounded-full bg-black/45 p-3 text-white backdrop-blur">
            <HeartIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="theme-label text-sm">{result.category}</p>
          <div className="inline-flex items-center gap-1 text-sm text-[#ffc247]">
            <StarIcon className="h-4 w-4" />
            <span className="theme-heading">{result.rating}</span>
          </div>
        </div>

        <h3 className="theme-heading mt-2 text-2xl font-semibold">{result.name}</h3>
        <div className="theme-muted mt-3 flex items-center gap-2 text-sm">
          <MapPinIcon className="h-4 w-4 text-[#ff7352]" />
          {result.location}
        </div>

        <p className="theme-muted mt-4 text-sm leading-6">{result.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {featureList.slice(0, 3).map((feature) => (
            <span key={feature} className="theme-chip rounded-full px-3 py-2 text-xs">
              {feature}
            </span>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <span className="theme-heading text-2xl font-bold">{result.price}</span>
            <span className="theme-subtle ml-1 text-sm">{result.priceUnit}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onAddToTrip}
              className="theme-button-secondary rounded-full px-4 py-3 text-sm font-semibold"
            >
              Add
            </button>
            <Link
              href={`/trip-planner/listing/${result.id}`}
              className="rounded-full bg-[#ff5630] px-4 py-3 text-sm font-semibold text-white"
            >
              Open
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
