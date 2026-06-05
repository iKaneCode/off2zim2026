"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import CompactRailCard from "@/components/ui/CompactRailCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import FavoriteButton from "@/components/ui/FavoriteButton";
import HorizontalRail from "@/components/ui/HorizontalRail";
import WeatherBadge from "@/components/ui/WeatherBadge";
import { apiFetch } from "@/lib/client-api";
import {
  type ExplorerDestinationSummary,
  enrichDestination,
} from "@/lib/destination-explorer";
import { serviceGroups } from "@/lib/taxonomy";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CloudRain,
  FileText,
  Globe2,
  Info,
  Languages,
  MapPin,
  Search,
  SunMedium,
  Users,
} from "lucide-react";

const travelTips = [
  {
    category: "Currency & Money",
    icon: Banknote,
    tips: [
      "US Dollar is widely accepted and still the easiest currency for travelers.",
      "Carry smaller notes for tips, transfers, and quick local purchases.",
      "Cards work at many larger hotels and restaurants, but not everywhere.",
    ],
  },
  {
    category: "Language & Communication",
    icon: Languages,
    tips: [
      "English is widely used, especially in tourism-facing businesses.",
      "Shona and Ndebele add warmth and local connection when you know a few phrases.",
      "Urban coverage is good, but signal can dip in remote safari and mountain regions.",
    ],
  },
  {
    category: "Health & Safety",
    icon: Info,
    tips: [
      "Malaria precautions matter in some regions, especially near lower-lying safari zones.",
      "Filtered or bottled water is the safer default.",
      "Medical and evacuation cover is worth having for higher-adventure itineraries.",
    ],
  },
  {
    category: "Documentation",
    icon: FileText,
    tips: [
      "A passport with at least 6 months validity is the safest baseline.",
      "Visa requirements vary by nationality, so check before departure.",
      "Driving visitors often need an international permit for smoother rental handoff.",
    ],
  },
];

const seasons = [
  {
    name: "Dry Season",
    months: "May - October",
    description: "Cooler, clearer, and strongest for wildlife visibility and long road days.",
    temperature: "15-25°C",
    icon: SunMedium,
    accent: "bg-[#fef3c7] text-[#b45309] dark:bg-[#332913] dark:text-[#ffd17b]",
  },
  {
    name: "Wet Season",
    months: "November - April",
    description: "Greener, moodier, and dramatic with storms, lush landscapes, and fuller waterfalls.",
    temperature: "20-30°C",
    icon: CloudRain,
    accent: "bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#13283a] dark:text-[#8dc9ff]",
  },
];

const facts = [
  ["Capital", "Harare"],
  ["Population", "~15 million"],
  ["Time Zone", "CAT (UTC+2)"],
  ["Electricity", "220V, Type G"],
  ["Currency", "USD, ZWL"],
  ["Driving", "Left side"],
  ["Internet Code", ".zw"],
  ["Calling Code", "+263"],
];

type GuideDestinationCard = ExplorerDestinationSummary & {
  meta: string;
  heroImage: string;
};

function toGuideDestination(destination: ExplorerDestinationSummary): GuideDestinationCard {
  const enriched = enrichDestination(destination);

  return {
    ...enriched,
    meta: enriched.category || "Destination guide",
    heroImage: enriched.image_url || enriched.images?.[0] || "/images/victoria-falls.jpg",
  };
}

export default function TravelGuidePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [destinations, setDestinations] = useState<GuideDestinationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ destinations: ExplorerDestinationSummary[] }>("/api/destinations")
      .then((payload) => {
        setDestinations(payload.destinations.map(toGuideDestination));
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load destinations.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredDestinations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return destinations;
    }

    return destinations.filter((destination) =>
      [
        destination.name,
        destination.description,
        destination.region,
        destination.explorerFocus,
        destination.bestTime,
        destination.meta,
        destination.location,
        ...(destination.highlights || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [destinations, searchTerm]);

  const featuredCount = destinations.filter((destination) => destination.featured).length;
  const browseFacets = useMemo(() => {
    const regions = Array.from(
      new Set(destinations.map((destination) => destination.region).filter(Boolean))
    ).slice(0, 6);
    const provinces = Array.from(
      new Set(destinations.map((destination) => destination.location).filter(Boolean))
    ).slice(0, 6);
    const activities = Array.from(
      new Set(destinations.flatMap((destination) => destination.highlights || []))
    ).slice(0, 8);

    return { regions, provinces, activities };
  }, [destinations]);

  return (
    <div className="theme-page pb-20">
      <section className="mx-auto max-w-7xl px-4 pb-4 pt-5 sm:px-6 lg:px-8">
        <div className="apple-scale-in relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-cover bg-center shadow-[0_32px_100px_-74px_rgba(0,0,0,0.55)] dark:border-white/[0.1]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.42), rgba(0,0,0,0.72)), url('/images/victoria-falls.jpg')",
          }}
        />
        <div className="relative flex min-h-[330px] flex-col justify-end p-4 text-white sm:p-6 lg:p-8">
          <p className="inline-flex w-fit rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/78 backdrop-blur-xl">
            Zimbabwe destination guide
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.02] md:text-6xl">
            Explore Zimbabwe
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/76 md:text-base">
            Pick a destination, then compare the stays, activities, dining, transport, events, and local help available there.
          </p>
        </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="apple-surface rounded-[1.75rem] p-3">
          <div className="grid gap-2 lg:grid-cols-[1.25fr_0.78fr_auto]">
            <label className="flex min-h-12 items-center gap-3 rounded-full border border-black/[0.08] bg-white/88 px-4 backdrop-blur-xl dark:border-white/[0.09] dark:bg-white/[0.07]">
              <Search className="h-5 w-5 shrink-0 text-[#0071e3]" />
              <span className="sr-only">Search destinations</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Where in Zimbabwe are you going?"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#1d1d1f] outline-none placeholder:text-[#86868b] dark:text-white dark:placeholder:text-white/45"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <MetricPill icon={MapPin} label="Destinations" value={destinations.length || "—"} />
              <MetricPill
                icon={Globe2}
                label="Regions"
                value={destinations.filter((item) => item.region).length || "—"}
              />
              <MetricPill icon={Users} label="Featured" value={featuredCount || "—"} />
            </div>
            <Link
              href="#destinations"
              className="apple-action min-h-12 px-5"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {seasons.map((season) => {
              const Icon = season.icon;

              return (
                <button
                  key={season.name}
                  type="button"
                  onClick={() => setSearchTerm(season.months)}
                  title={season.description}
                  className="flex min-w-[190px] items-center gap-3 rounded-full border border-black/[0.08] bg-white/58 px-3 py-2 text-left backdrop-blur transition hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${season.accent}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="theme-heading block truncate text-sm font-semibold">{season.name}</span>
                    <span className="theme-muted block truncate text-xs">
                      {season.months} · {season.temperature}
                    </span>
                  </span>
                </button>
              );
            })}
            {facts.slice(0, 6).map(([label, value]) => (
              <button
                key={label}
                type="button"
                title={`${label}: ${value}`}
                className="flex min-w-[150px] items-center gap-3 rounded-full border border-black/[0.08] bg-white/58 px-3 py-2 text-left backdrop-blur transition hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-[#0071e3]" />
                <span className="min-w-0">
                  <span className="theme-subtle block truncate text-[10px] uppercase tracking-[0.16em]">{label}</span>
                  <span className="theme-heading block truncate text-sm font-semibold">{value}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {serviceGroups.map((group) => (
              <Link
                key={group.id}
                href={group.globalBrowse ? getServiceHref(group.id) : "#destinations"}
                onClick={() => {
                  if (!group.globalBrowse) setSearchTerm(group.label);
                }}
                title={group.description}
                className="theme-chip inline-flex shrink-0 items-center rounded-full px-3 py-2 text-xs font-semibold"
              >
                {group.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <AppServiceStrip activeLabel="Destinations" />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 lg:grid-cols-3">
          <FacetGroup label="Regions" values={browseFacets.regions} onChoose={setSearchTerm} />
          <FacetGroup label="Provinces and cities" values={browseFacets.provinces} onChoose={setSearchTerm} />
          <FacetGroup label="Activities and highlights" values={browseFacets.activities} onChoose={setSearchTerm} />
        </div>
      </section>

      <section id="destinations" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <CompactSectionHeader
          eyebrow="Choose the place"
          title="Explore Zimbabwe"
          count={filteredDestinations.length}
        />

        {error ? (
          <div className="theme-panel rounded-[32px] p-8 text-center">
            <p className="theme-heading text-lg font-semibold">Could not load destinations</p>
            <p className="theme-muted mt-2 text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="theme-card overflow-hidden animate-pulse">
                <div className="h-56 bg-white/[0.06]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-28 rounded-full bg-white/[0.08]" />
                  <div className="h-5 w-3/4 rounded-full bg-white/[0.08]" />
                  <div className="h-3 w-full rounded-full bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDestinations.length === 0 ? (
          <div className="theme-panel rounded-[32px] p-8 text-center">
            <p className="theme-heading text-lg font-semibold">No destinations matched your search</p>
            <p className="theme-muted mt-2 text-sm">
              Try a destination name, region, season, or travel style.
            </p>
          </div>
        ) : (
          <HorizontalRail itemClassName="w-[78vw] max-w-[300px] sm:w-[280px]">
            {filteredDestinations.map((destination) => (
              <div key={destination.id} className="relative">
                <CompactRailCard
                  title={destination.name}
                  href={`/travel-guide/${destination.id}`}
                  imageUrl={destination.heroImage}
                  meta={destination.meta}
                  detail={destination.region || destination.location || "Zimbabwe"}
                  badge={destination.bestTime || "Year-round"}
                  description={
                    destination.description || "Open this destination to explore what makes it worth visiting."
                  }
                  actionLabel="View destination"
                >
                  <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-black/35 p-2 text-center text-white backdrop-blur">
                    <DestinationCount label="Stays" value={destination.stays_count} />
                    <DestinationCount label="Things" value={destination.activities_count} />
                    <DestinationCount
                      label="More"
                      value={
                        (destination.transport_count || 0) +
                        (destination.dining_count || 0) +
                        (destination.events_count || 0)
                      }
                    />
                  </div>
                </CompactRailCard>
                <div className="absolute right-3 top-3">
                  <FavoriteButton
                    itemId={destination.name}
                    itemType="destination"
                    className="rounded-full bg-black/45 p-2 text-white backdrop-blur"
                    iconClassName="h-4 w-4"
                  />
                </div>
                <div className="absolute left-3 bottom-3">
                  <WeatherBadge location={destination.name} compact />
                </div>
              </div>
            ))}
          </HorizontalRail>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <CompactSectionHeader
          eyebrow="Travel essentials"
          title="Before you go"
        />
        <HorizontalRail itemClassName="w-[72vw] max-w-[240px] sm:w-[220px]">
          {travelTips.map((tip) => {
            const Icon = tip.icon;

            return (
              <CompactRailCard
                key={tip.category}
                title={tip.category}
                icon={Icon}
                meta="Guide"
                description={tip.tips.join(" ")}
              />
            );
          })}
        </HorizontalRail>
      </section>
    </div>
  );
}

function DestinationCount({
  label,
  value,
}: {
  label: string;
  value?: number;
}) {
  return (
    <div>
      <div className="text-base font-semibold">{value || 0}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{label}</div>
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      <Icon className="h-4 w-4 shrink-0 text-[#ff5630]" />
      <span className="min-w-0">
        <span className="theme-heading block text-sm font-semibold">{value}</span>
        <span className="theme-subtle block truncate text-[10px] uppercase tracking-[0.16em]">
          {label}
        </span>
      </span>
    </div>
  );
}

function getServiceHref(groupId: string) {
  if (groupId === "stays") return "/accommodation";
  if (groupId === "dining") return "/restaurants";
  return `/${groupId}`;
}

function FacetGroup({
  label,
  values,
  onChoose,
}: {
  label: string;
  values: Array<string | null | undefined>;
  onChoose: (value: string) => void;
}) {
  const cleanValues = values.filter(Boolean) as string[];

  if (cleanValues.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-xl border border-black/10 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="theme-subtle text-xs uppercase tracking-[0.22em]">{label}</p>
      <div className="mt-2 flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cleanValues.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChoose(value)}
            title={`Filter destinations by ${value}`}
            className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs theme-muted transition hover:border-[#ff5630] hover:text-[#ff5630] dark:border-white/10"
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
