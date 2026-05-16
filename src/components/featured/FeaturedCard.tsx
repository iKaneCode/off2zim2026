"use client";

import Link from "next/link";
import { BadgeCheck, Star, Award, Sparkles } from "lucide-react";
import HorizontalRail from "@/components/ui/HorizontalRail";

export type FeaturedPathway = "sponsored" | "top_rated" | "editors_choice";

export interface FeaturedListing {
  id: string;
  title: string;
  slug: string;
  category: string;
  listingType: string;
  shortDescription?: string | null;
  location: string;
  basePrice?: number | null;
  currency: string;
  images?: string | null;
  company: {
    id: string;
    companyName: string;
    isVerified: boolean;
  };
}

export interface FeaturedEntryData {
  id: string;
  pathway: FeaturedPathway;
  sortOrder: number;
  startDate: string;
  endDate: string;
  listing: FeaturedListing;
}

const PATHWAY_CONFIG: Record<
  FeaturedPathway,
  { label: string; color: string; icon: typeof Star }
> = {
  sponsored: {
    label: "Sponsored",
    color: "bg-[#1a2035] text-[#8dc9ff] ring-1 ring-[#8dc9ff]/20",
    icon: Sparkles,
  },
  top_rated: {
    label: "Top Rated",
    color: "bg-[#1a2e1a] text-[#4ade80] ring-1 ring-[#4ade80]/20",
    icon: Star,
  },
  editors_choice: {
    label: "Editor's Choice",
    color: "bg-[#2d1f0a] text-[#fbbf24] ring-1 ring-[#fbbf24]/20",
    icon: Award,
  },
};

function PathwayBadge({ pathway }: { pathway: FeaturedPathway }) {
  const { label, color, icon: Icon } = PATHWAY_CONFIG[pathway];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function getFirstImage(images: string | null | undefined): string | null {
  if (!images) return null;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed[0] as string) : null;
  } catch {
    return null;
  }
}

export function FeaturedCard({ entry }: { entry: FeaturedEntryData }) {
  const { listing, pathway } = entry;
  const imageUrl = getFirstImage(listing.images);

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block overflow-hidden rounded-xl border border-white/10 bg-[#111111] transition hover:border-white/20 hover:shadow-lg hover:shadow-black/30"
    >
      {/* Image */}
      <div className="relative h-32 w-full overflow-hidden bg-white/[0.04]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">🏞️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Pathway badge — absolute over image */}
        <div className="absolute left-3 top-3">
          <PathwayBadge pathway={pathway} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-white group-hover:text-white/90">
            {listing.title}
          </h3>
          {listing.basePrice != null && (
            <p className="shrink-0 text-sm font-bold text-white">
              {listing.currency} {listing.basePrice.toFixed(0)}
            </p>
          )}
        </div>

        <p className="mt-1 text-xs text-white/40">{listing.location}</p>

        {listing.shortDescription && (
          <p className="mt-2 line-clamp-2 text-xs text-white/50">
            {listing.shortDescription}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-white/35">{listing.company.companyName}</span>
          {listing.company.isVerified && (
            <BadgeCheck className="h-3.5 w-3.5 text-[#8dc9ff]" />
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Section wrapper used by public featured page ─────────────────────────────

export function FeaturedSection({
  pathway,
  entries,
}: {
  pathway: FeaturedPathway;
  entries: FeaturedEntryData[];
}) {
  if (entries.length === 0) return null;
  const { label, icon: Icon } = PATHWAY_CONFIG[pathway];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-white/50" />
        <h2 className="text-lg font-semibold text-white">{label}</h2>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/40">
          {entries.length}
        </span>
      </div>
      <HorizontalRail itemClassName="w-[76vw] max-w-[280px] sm:w-[260px]">
        {entries.map((entry) => (
          <FeaturedCard key={entry.id} entry={entry} />
        ))}
      </HorizontalRail>
    </section>
  );
}
