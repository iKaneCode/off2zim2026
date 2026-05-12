"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import CompactRailCard from "@/components/ui/CompactRailCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";
import { apiFetch } from "@/lib/client-api";
import {
  type ExplorerDestinationSummary,
  withDestinationContext,
} from "@/lib/destination-explorer";
import type { PublicListingRecord } from "@/types/platform";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Bus,
  CalendarDays,
  MessageCircle,
  MapPin,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

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
      location?: string | null;
      destinations?: { name?: string | null } | null;
    }>;
    activities: PublicListingRecord[];
    transport: PublicListingRecord[];
    diningListings: PublicListingRecord[];
    events: PublicListingRecord[];
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
    guides: Array<{
      id: string;
      name: string;
      bio: string;
      rating: number;
      reviewCount: number;
      avatarUrl?: string | null;
      specialties: string[];
      languages: string[];
    }>;
    forumQuestions: Array<{
      id: string;
      title: string;
      body: string;
      answerCount: number;
      isPinned: boolean;
      author: { name: string; isGuide: boolean };
    }>;
  };
  counts: {
    stays: number;
    activities: number;
    transport: number;
    diningListings: number;
    events: number;
    restaurants: number;
    guides: number;
    questions: number;
  };
}

const serviceCards = [
  {
    label: "Stays",
    key: "stays",
    href: "/accommodation",
    icon: BedDouble,
    description: "Browse hotels, lodges, camps, and other stays available in this destination.",
  },
  {
    label: "Things To Do",
    key: "activities",
    href: "/activities",
    icon: Sparkles,
    description: "See activities, tours, and experiences available in this destination.",
  },
  {
    label: "Transport",
    key: "transport",
    href: "/transport",
    icon: Bus,
    description: "See taxis, shuttles, game drives, boat cruises, and route support linked to this destination.",
  },
  {
    label: "Restaurants",
    key: "restaurants",
    href: "/restaurants",
    icon: UtensilsCrossed,
    description: "Find restaurants and dining options once this destination is on your plan.",
  },
  {
    label: "Events",
    key: "events",
    href: "/events",
    icon: CalendarDays,
    description: "Browse concerts, festivals, Boma nights, and local happenings connected to this destination.",
  },
  {
    label: "Ask a Local",
    key: "guides",
    href: "/ask-a-local",
    icon: MessageCircle,
    description: "Ask local guides and browse destination-specific questions and answers.",
  },
] as const;

export default function DestinationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [context, setContext] = useState<DestinationContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<DestinationContextResponse>(`/api/destinations/${slug}/context`)
      .then((payload) => {
        setContext(payload);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load destination.");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="theme-page min-h-screen px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-[360px] animate-pulse rounded-[36px] bg-white/[0.06]" />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="h-72 animate-pulse rounded-[28px] bg-white/[0.06]" />
            <div className="h-72 animate-pulse rounded-[28px] bg-white/[0.06]" />
          </div>
        </div>
      </div>
    );
  }

  if (!context || error) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center px-4">
        <div className="theme-panel rounded-[32px] p-10 text-center max-w-md">
          <h1 className="theme-heading text-2xl font-semibold">Destination not found</h1>
          <p className="theme-muted mt-2 text-sm">
            {error || "This destination page doesn't exist yet."}
          </p>
          <Link
            href="/travel-guide"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to destinations
          </Link>
        </div>
      </div>
    );
  }

  const { destination, scoped, counts } = context;
  const heroImage =
    destination.image_url || destination.images?.[0] || "/images/victoria-falls.jpg";

  return (
    <div className="theme-page min-h-screen pb-20">
      <div
        className="relative min-h-[380px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.74)), url('${heroImage}')`,
        }}
      >
        <div className="mx-auto flex min-h-[380px] max-w-7xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/travel-guide"
              className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/55 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All destinations
            </Link>
            <div className="rounded-full bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 backdrop-blur">
              Destination hub
            </div>
          </div>

          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5630]/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
              <MapPin className="h-3.5 w-3.5" />
              {destination.location || "Zimbabwe"}
            </div>
            <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">{destination.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 md:text-base">
              {destination.description ||
                "Choose this destination to see the stays, activities, restaurants, and local insight connected to it."}
            </p>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <StatCard label="Stays" value={counts.stays} />
              <StatCard label="Things to do" value={counts.activities} />
              <StatCard label="Transport" value={counts.transport} />
              <StatCard label="Dining and events" value={counts.restaurants + counts.diningListings + counts.events} />
              <StatCard label="Local guidance" value={counts.guides + counts.questions} />
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <AppServiceStrip
          activeLabel="Destinations"
          destinationId={destination.id}
          destinationName={destination.name}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="theme-label text-[10px] uppercase tracking-[0.22em]">Selected destination</p>
            <h2 className="theme-heading mt-1 truncate text-base font-semibold">
              Services are filtered to {destination.name}
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/events"
              title="Browse events across Zimbabwe"
              className="theme-button-secondary inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
            >
              All events
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/transport"
              title="Browse transport options across Zimbabwe"
              className="theme-button-secondary inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
            >
              Transport
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/transport/flights"
              title="Browse flights separately from destination-specific services"
              className="theme-button-secondary inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
            >
              Flights
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <CompactSectionHeader eyebrow="Destination services" title="Explore this stop" />
        <HorizontalRail itemClassName="w-[62vw] max-w-[210px] sm:w-[210px]">
          {serviceCards.map((service) => {
            const Icon = service.icon;
            const count =
              service.key === "restaurants"
                ? counts.restaurants + counts.diningListings
                : counts[service.key];

            return (
              <CompactRailCard
                key={service.label}
                href={withDestinationContext(service.href, destination.id)}
                icon={Icon}
                meta="Service"
                badge={count}
                title={service.label}
                description={service.description}
                actionLabel={`Open ${service.label}`}
              />
            );
          })}
        </HorizontalRail>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <CompactSectionHeader
            title="Featured stays"
            count={scoped.stays.length}
            actionHref={withDestinationContext("/accommodation", destination.id)}
          />
          {scoped.stays.length > 0 ? (
            <HorizontalRail>
              {scoped.stays.slice(0, 3).map((stay) => (
                <CompactRailCard
                  key={stay.id}
                  title={stay.name}
                  imageUrl={stay.image_url || destination.image_url}
                  meta="Stay"
                  detail={stay.location || stay.destinations?.name || destination.name}
                  badge={stay.rating ? stay.rating.toFixed(1) : null}
                  description={stay.description}
                />
              ))}
            </HorizontalRail>
          ) : (
            <EmptyScopedState label="stays" destinationName={destination.name} />
          )}
        </div>

        <div>
          <CompactSectionHeader
            title="Transport here"
            count={scoped.transport.length}
            actionHref={withDestinationContext("/transport", destination.id)}
          />
          {scoped.transport.length > 0 ? (
            <HorizontalRail>
              {scoped.transport.slice(0, 3).map((transport) => (
                <ListingPreview key={transport.id} listing={transport} />
              ))}
            </HorizontalRail>
          ) : (
            <EmptyScopedState label="transport options" destinationName={destination.name} />
          )}
        </div>

        <div>
          <CompactSectionHeader
            title="Dining"
            count={scoped.restaurants.length + scoped.diningListings.length}
            actionHref={withDestinationContext("/restaurants", destination.id)}
          />
          {scoped.restaurants.length > 0 || scoped.diningListings.length > 0 ? (
            <HorizontalRail>
              {scoped.restaurants.slice(0, 2).map((restaurant) => (
                <CompactRailCard
                  key={restaurant.id}
                  title={restaurant.name}
                  imageUrl={restaurant.images[0] || destination.image_url}
                  meta={restaurant.cuisine}
                  detail={restaurant.location}
                  badge={restaurant.rating ? restaurant.rating.toFixed(1) : restaurant.priceRange}
                  description={restaurant.description}
                />
              ))}
              {scoped.diningListings.slice(0, Math.max(0, 3 - scoped.restaurants.length)).map((dining) => (
                <ListingPreview key={dining.id} listing={dining} />
              ))}
            </HorizontalRail>
          ) : (
            <EmptyScopedState label="dining options" destinationName={destination.name} />
          )}
        </div>

        <div>
          <CompactSectionHeader
            title="Events"
            count={scoped.events.length}
            actionHref={withDestinationContext("/events", destination.id)}
          />
          {scoped.events.length > 0 ? (
            <HorizontalRail>
              {scoped.events.slice(0, 3).map((event) => (
                <ListingPreview key={event.id} listing={event} />
              ))}
            </HorizontalRail>
          ) : (
            <EmptyScopedState label="events" destinationName={destination.name} />
          )}
        </div>

        <div>
          <CompactSectionHeader
            title="Things to do"
            count={scoped.activities.length}
            actionHref={withDestinationContext("/activities", destination.id)}
          />
          {scoped.activities.length > 0 ? (
            <HorizontalRail>
              {scoped.activities.slice(0, 3).map((activity) => (
                <ListingPreview key={activity.id} listing={activity} />
              ))}
            </HorizontalRail>
          ) : (
            <EmptyScopedState label="activities" destinationName={destination.name} />
          )}
        </div>

        <div>
          <CompactSectionHeader
            title="Ask a Local"
            count={scoped.guides.length + scoped.forumQuestions.length}
            actionHref={withDestinationContext("/ask-a-local", destination.id)}
            actionLabel="Open forum"
          />
          {scoped.guides.length > 0 || scoped.forumQuestions.length > 0 ? (
            <HorizontalRail>
              {scoped.forumQuestions.slice(0, 2).map((question) => (
                <CompactRailCard
                  key={question.id}
                  title={question.title}
                  icon={MessageCircle}
                  meta="Question"
                  badge={`${question.answerCount} answers`}
                  description={question.body}
                />
              ))}
              {scoped.guides.slice(0, 1).map((guide) => (
                <CompactRailCard
                  key={guide.id}
                  title={guide.name}
                  icon={MessageCircle}
                  meta="Guide"
                  badge={guide.rating.toFixed(1)}
                  description={guide.bio}
                />
              ))}
            </HorizontalRail>
          ) : (
            <EmptyScopedState label="local guidance" destinationName={destination.name} />
          )}
        </div>
      </section>
    </div>
  );
}

function ListingPreview({ listing }: { listing: PublicListingRecord }) {
  return (
    <CompactRailCard
      title={listing.title}
      href={`/marketplace/${listing.slug}`}
      imageUrl={listing.images[0]}
      meta={listing.category}
      detail={listing.location}
      badge={listing.basePrice ? `$${listing.basePrice}` : "Quote"}
      description={listing.shortDescription || listing.description}
    />
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[136px] rounded-xl border border-white/10 bg-black/32 px-3 py-2.5 text-white backdrop-blur">
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-0.5 truncate text-xs text-white/72">{label}</div>
    </div>
  );
}

function EmptyScopedState({
  label,
  destinationName,
}: {
  label: string;
  destinationName: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 p-4 text-sm theme-muted dark:border-white/12">
      No {label} are linked to {destinationName} yet.
    </div>
  );
}
