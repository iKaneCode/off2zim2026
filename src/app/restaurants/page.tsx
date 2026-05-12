"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactRailCard from "@/components/ui/CompactRailCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";
import ServiceSubtypeChips from "@/components/ui/ServiceSubtypeChips";
import { apiFetch } from "@/lib/client-api";
import {
  getDestinationById,
  type ExplorerDestinationSummary,
} from "@/lib/destination-explorer";
import { getSubtypesForGroup, normalizeTaxonomyValue } from "@/lib/taxonomy";
import { Search, UtensilsCrossed } from "lucide-react";

interface DestinationContextResponse {
  destination: ExplorerDestinationSummary;
  scoped: {
    restaurants: Array<{
      id: string;
      name: string;
      description?: string | null;
      cuisine: string;
      location: string;
      priceRange: string;
      rating?: number | null;
      images: string[];
    }>;
  };
}

export default function RestaurantsPage() {
  const searchParams = useSearchParams();
  const destinationId = searchParams?.get("destination");
  const [destinations, setDestinations] = useState<ExplorerDestinationSummary[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<ExplorerDestinationSummary | null>(null);
  const [restaurants, setRestaurants] = useState<DestinationContextResponse["scoped"]["restaurants"]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubtype, setActiveSubtype] = useState(searchParams?.get("subtype") || "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ destinations: ExplorerDestinationSummary[] }>("/api/destinations")
      .then((payload) => {
        setDestinations(payload.destinations);
        setSelectedDestination(getDestinationById(payload.destinations, destinationId));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load destinations."));
  }, [destinationId]);

  useEffect(() => {
    if (!destinationId) {
      setLoading(false);
      setRestaurants([]);
      return;
    }

    setLoading(true);
    apiFetch<DestinationContextResponse>(`/api/destinations/${destinationId}/context`)
      .then((payload) => {
        setSelectedDestination(payload.destination);
        setRestaurants(payload.scoped.restaurants);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load restaurants."))
      .finally(() => setLoading(false));
  }, [destinationId]);

  const filteredRestaurants = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return restaurants.filter((restaurant) =>
      (activeSubtype === "all" ||
        [restaurant.name, restaurant.description, restaurant.cuisine, restaurant.location, restaurant.priceRange]
          .map((value) => normalizeTaxonomyValue(value))
          .some((value) => value.includes(activeSubtype))) &&
      (!query ||
        [restaurant.name, restaurant.description, restaurant.cuisine, restaurant.location, restaurant.priceRange]
          .join(" ")
          .toLowerCase()
          .includes(query))
    );
  }, [activeSubtype, restaurants, searchTerm]);

  return (
    <div className="theme-page pb-20">
      <CompactPageHero
        eyebrow="Dining"
        title="Find restaurants inside the destination you chose"
        description="Choose your destination first, then browse the restaurants and dining options that fit that stop on your trip."
        imageUrl="/images/victoria-falls.jpg"
      />

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <AppServiceStrip
          activeLabel="Restaurants"
          destinationId={selectedDestination?.id ?? destinationId}
          destinationName={selectedDestination?.name}
        />
      </section>

      {!destinationId ? (
        <DestinationChooser destinations={destinations} />
      ) : (
        <>
          <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="theme-panel rounded-[32px] p-4 md:p-5">
              <div className="grid gap-3 lg:grid-cols-[1.2fr_auto]">
                <div className="relative">
                  <Search className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={`Search dining in ${selectedDestination?.name || "this destination"}`}
                    className="theme-input w-full rounded-2xl py-3 pl-11 pr-4 text-sm"
                  />
                </div>
                <Link
                  href={`/travel-guide/${selectedDestination?.id || destinationId}`}
                  className="theme-button-secondary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm"
                >
                  Back to destination hub
                </Link>
              </div>
              <ServiceSubtypeChips
                subtypes={getSubtypesForGroup("dining")}
                activeSubtype={activeSubtype}
                onSelect={setActiveSubtype}
                allLabel="All dining"
                className="mt-4"
              />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            {error ? (
              <PanelState title="Could not load restaurants" body={error} />
            ) : loading ? (
              <LoadingGrid />
            ) : filteredRestaurants.length === 0 ? (
              <PanelState
                title={`No restaurants linked to ${selectedDestination?.name || "this destination"} yet`}
                body="Destination-linked dining will appear here as new restaurants are added."
              />
            ) : (
              <>
                <CompactSectionHeader
                  eyebrow={selectedDestination?.name || "Destination-selected"}
                  title={`Dining in ${selectedDestination?.name || "this destination"}`}
                  count={filteredRestaurants.length}
                />
                <HorizontalRail itemClassName="w-[76vw] max-w-[280px] sm:w-[260px]">
                  {filteredRestaurants.map((restaurant) => (
                    <CompactRailCard
                      key={restaurant.id}
                      title={restaurant.name}
                      imageUrl={restaurant.images[0] || "/images/background.png"}
                      meta={restaurant.cuisine}
                      detail={restaurant.location}
                      badge={restaurant.rating || restaurant.priceRange}
                      description={restaurant.description}
                    />
                  ))}
                </HorizontalRail>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function DestinationChooser({ destinations }: { destinations: ExplorerDestinationSummary[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="theme-panel rounded-2xl p-4 md:p-5">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.08]">
          <UtensilsCrossed className="h-5 w-5 text-[#ff5630]" />
        </div>
        <h2 className="theme-heading mt-3 text-xl font-semibold">Choose a destination to view its restaurants</h2>
        <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">
          Dining is organized by destination so you can see the restaurants that match the place you plan to visit.
        </p>
        <HorizontalRail className="mt-4" itemClassName="w-[72vw] max-w-[240px] sm:w-[220px]">
          {destinations.map((destination) => (
            <CompactRailCard
              key={destination.id}
              href={`/restaurants?destination=${encodeURIComponent(destination.id)}`}
              title={destination.name}
              imageUrl={destination.image_url}
              meta="Dining"
              badge={destination.dining_count || 0}
              description={destination.description}
            />
          ))}
        </HorizontalRail>
      </div>
    </section>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="theme-panel rounded-[28px] overflow-hidden animate-pulse">
          <div className="h-56 bg-white/[0.06]" />
          <div className="p-6 space-y-3">
            <div className="h-4 w-1/2 rounded-full bg-white/[0.08]" />
            <div className="h-5 w-3/4 rounded-full bg-white/[0.08]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelState({ title, body }: { title: string; body: string }) {
  return (
    <div className="theme-panel rounded-[36px] p-12 text-center space-y-4">
      <p className="theme-heading text-lg font-semibold">{title}</p>
      <p className="theme-muted text-sm max-w-sm mx-auto">{body}</p>
    </div>
  );
}
