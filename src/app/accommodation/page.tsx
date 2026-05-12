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
import { BedDouble, Search } from "lucide-react";

interface DestinationContextResponse {
  destination: ExplorerDestinationSummary;
  scoped: {
    stays: Array<{
      id: string;
      name: string;
      description?: string | null;
      image_url?: string | null;
      rating?: number | null;
      price?: number | null;
      full_location?: string | null;
      location?: string | null;
      amenities?: string[];
    }>;
  };
}

export default function AccommodationPage() {
  const searchParams = useSearchParams();
  const destinationId = searchParams?.get("destination");
  const [destinations, setDestinations] = useState<ExplorerDestinationSummary[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<ExplorerDestinationSummary | null>(null);
  const [stays, setStays] = useState<DestinationContextResponse["scoped"]["stays"]>([]);
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
      setStays([]);
      return;
    }

    setLoading(true);
    apiFetch<DestinationContextResponse>(`/api/destinations/${destinationId}/context`)
      .then((payload) => {
        setSelectedDestination(payload.destination);
        setStays(payload.scoped.stays);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load stays."))
      .finally(() => setLoading(false));
  }, [destinationId]);

  const filteredStays = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return stays.filter((stay) =>
      (activeSubtype === "all" ||
        [stay.name, stay.description, stay.location, stay.full_location, ...(stay.amenities || [])]
          .map((value) => normalizeTaxonomyValue(value))
          .some((value) => value.includes(activeSubtype))) &&
      (!query ||
        [stay.name, stay.description, stay.location, stay.full_location, ...(stay.amenities || [])]
          .join(" ")
          .toLowerCase()
          .includes(query))
    );
  }, [activeSubtype, searchTerm, stays]);

  return (
    <div className="theme-page pb-20">
      <CompactPageHero
        eyebrow="Stays"
        title="Find stays inside the destination you choose"
        description="Choose where you want to go first, then browse the lodges, camps, hotels, and other stays available there."
        imageUrl="/images/palm-river-hotel-604329-original.jpg"
      />

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <AppServiceStrip
          activeLabel="Stays"
          destinationId={selectedDestination?.id ?? destinationId}
          destinationName={selectedDestination?.name}
        />
      </section>

      {!destinationId ? (
        <DestinationChooser
          destinations={destinations}
          title="Choose a destination to view its stays"
          description="Accommodation is organized by destination so you can browse stays in the place you plan to visit."
          hrefBase="/accommodation"
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
                    placeholder={`Search stays in ${selectedDestination?.name || "this destination"}`}
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
                subtypes={getSubtypesForGroup("stays")}
                activeSubtype={activeSubtype}
                onSelect={setActiveSubtype}
                allLabel="All stays"
                className="mt-4"
              />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {error ? (
              <PanelState title="Could not load stays" body={error} />
            ) : loading ? (
              <LoadingGrid />
            ) : filteredStays.length === 0 ? (
              <PanelState
                title={`No stays linked to ${selectedDestination?.name || "this destination"} yet`}
                body="Stays for this destination will appear here automatically as more listings are added."
              />
            ) : (
              <>
                <CompactSectionHeader
                  eyebrow={selectedDestination?.name || "Destination-selected"}
                  title={`Stays in ${selectedDestination?.name || "this destination"}`}
                  count={filteredStays.length}
                />
                <HorizontalRail itemClassName="w-[76vw] max-w-[280px] sm:w-[260px]">
                  {filteredStays.map((stay) => (
                    <CompactRailCard
                      key={stay.id}
                      title={stay.name}
                      imageUrl={stay.image_url || "/images/background.png"}
                      meta="Stay"
                      detail={stay.full_location || stay.location || selectedDestination?.name}
                      badge={stay.rating || null}
                      description={stay.description}
                    >
                      {stay.amenities?.length ? (
                        <div className="flex gap-1 overflow-hidden text-[10px] text-white/80">
                          {stay.amenities.slice(0, 2).map((amenity) => (
                            <span key={amenity} className="truncate rounded-full bg-black/35 px-2 py-1">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
  hrefBase,
}: {
  destinations: ExplorerDestinationSummary[];
  title: string;
  description: string;
  hrefBase: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="theme-panel rounded-2xl p-4 md:p-5">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.08]">
          <BedDouble className="h-5 w-5 text-[#ff5630]" />
        </div>
        <h2 className="theme-heading mt-3 text-xl font-semibold">{title}</h2>
        <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">{description}</p>
        <HorizontalRail className="mt-4" itemClassName="w-[72vw] max-w-[240px] sm:w-[220px]">
          {destinations.map((destination) => (
            <CompactRailCard
              key={destination.id}
              href={`${hrefBase}?destination=${encodeURIComponent(destination.id)}`}
              title={destination.name}
              imageUrl={destination.image_url}
              meta="Destination"
              badge={destination.stays_count || 0}
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
            <div className="h-4 w-2/3 rounded-full bg-white/[0.08]" />
            <div className="h-3 w-full rounded-full bg-white/[0.06]" />
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
