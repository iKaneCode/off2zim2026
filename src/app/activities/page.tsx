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
import { getSubtypesForGroup, inferServiceSubtype } from "@/lib/taxonomy";
import type { PublicListingRecord } from "@/types/platform";
import { Search } from "lucide-react";

interface DestinationContextResponse {
  destination: ExplorerDestinationSummary;
  scoped: {
    activities: PublicListingRecord[];
  };
}

export default function ActivitiesPage() {
  const searchParams = useSearchParams();
  const destinationId = searchParams?.get("destination");
  const [destinations, setDestinations] = useState<ExplorerDestinationSummary[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<ExplorerDestinationSummary | null>(null);
  const [results, setResults] = useState<PublicListingRecord[]>([]);
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
      setResults([]);
      return;
    }

    setLoading(true);
    apiFetch<DestinationContextResponse>(`/api/destinations/${destinationId}/context`)
      .then((payload) => {
        setSelectedDestination(payload.destination);
        setResults(payload.scoped.activities);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load experiences."))
      .finally(() => setLoading(false));
  }, [destinationId]);

  const filteredActivities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return results.filter((activity) =>
      (activeSubtype === "all" || inferServiceSubtype(activity)?.id === activeSubtype) &&
      (!query ||
        [activity.title, activity.description, activity.shortDescription, activity.location, activity.category]
          .join(" ")
          .toLowerCase()
          .includes(query))
    );
  }, [activeSubtype, results, searchTerm]);

  return (
    <div className="theme-page pb-20">
      <CompactPageHero
        eyebrow="Things to do"
        title="Find things to do after you choose your destination"
        description="Activities are tied to the place you plan to visit. Choose a destination first, then compare the tours, experiences, and local options available there."
        imageUrl="/images/rafting.jpg"
      />

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <AppServiceStrip
          activeLabel="Things To Do"
          destinationId={selectedDestination?.id ?? destinationId}
          destinationName={selectedDestination?.name}
        />
      </section>

      {!destinationId ? (
        <DestinationChooser
          destinations={destinations}
          title="Choose a destination to view its activities"
          description="Things to do are organized by destination so you can see the right experiences in the right place."
        />
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
                    placeholder={`Search experiences in ${selectedDestination?.name || "this destination"}`}
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
                subtypes={getSubtypesForGroup("activities")}
                activeSubtype={activeSubtype}
                onSelect={setActiveSubtype}
                allLabel="All activities"
                className="mt-4"
              />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {error ? (
              <ErrorState message={error} />
            ) : loading ? (
              <LoadingGrid />
            ) : filteredActivities.length === 0 ? (
              <EmptyState
                title={`No experiences linked to ${selectedDestination?.name || "this destination"} yet`}
                body="Activities for this destination will appear here automatically as more providers add them."
              />
            ) : (
              <>
                <CompactSectionHeader
                  eyebrow={selectedDestination?.name || "Destination-selected"}
                  title={`Things to do in ${selectedDestination?.name || "this destination"}`}
                  count={filteredActivities.length}
                />
                <HorizontalRail itemClassName="w-[78vw] max-w-[300px] sm:w-[280px]">
                  {filteredActivities.map((activity) => (
                    <CompactRailCard
                      key={activity.id}
                      title={activity.title}
                      href={`/marketplace/${activity.slug}`}
                      imageUrl={activity.images[0] || "/images/background.png"}
                      meta={inferServiceSubtype(activity)?.label || activity.category}
                      detail={activity.location}
                      badge={activity.basePrice ? `$${activity.basePrice}` : "Quote"}
                      description={activity.shortDescription || activity.description}
                    >
                      <div className="flex gap-1 overflow-hidden text-[10px] text-white/82">
                        {typeof activity.metadata.duration === "string" ? (
                          <span className="truncate rounded-full bg-black/35 px-2 py-1">
                            {activity.metadata.duration}
                          </span>
                        ) : null}
                        {activity.capacity ? (
                          <span className="truncate rounded-full bg-black/35 px-2 py-1">
                            Up to {activity.capacity}
                          </span>
                        ) : null}
                      </div>
                    </CompactRailCard>
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

function DestinationChooser({
  destinations,
  title,
  description,
}: {
  destinations: ExplorerDestinationSummary[];
  title: string;
  description: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="theme-panel rounded-2xl p-4 md:p-5">
        <h2 className="theme-heading text-xl font-semibold">{title}</h2>
        <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">{description}</p>
        <HorizontalRail className="mt-4" itemClassName="w-[72vw] max-w-[240px] sm:w-[220px]">
          {destinations.map((destination) => (
            <CompactRailCard
              key={destination.id}
              href={`/activities?destination=${encodeURIComponent(destination.id)}`}
              title={destination.name}
              imageUrl={destination.image_url}
              meta="Destination"
              badge={destination.activities_count || 0}
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
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="theme-panel rounded-[28px] overflow-hidden animate-pulse">
          <div className="h-56 bg-white/[0.06]" />
          <div className="p-6 space-y-3">
            <div className="h-3 w-24 rounded-full bg-white/[0.08]" />
            <div className="h-5 w-3/4 rounded-full bg-white/[0.08]" />
            <div className="h-3 w-1/2 rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="theme-panel rounded-[36px] p-12 text-center space-y-4">
      <p className="theme-heading text-lg font-semibold">Could not load experiences</p>
      <p className="theme-muted text-sm max-w-sm mx-auto">{message}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="theme-panel rounded-[36px] p-12 text-center space-y-4">
      <p className="theme-heading text-lg font-semibold">{title}</p>
      <p className="theme-muted text-sm max-w-sm mx-auto">{body}</p>
    </div>
  );
}
