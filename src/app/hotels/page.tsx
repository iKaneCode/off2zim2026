"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import type { PublicListingRecord } from "@/types/platform";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactRailCard from "@/components/ui/CompactRailCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";

export default function HotelsPage() {
  const [listings, setListings] = useState<PublicListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadListings = async () => {
      try {
        const payload = await apiFetch<{ listings: PublicListingRecord[] }>(
          "/api/listings?category=Accommodation"
        );
        setListings(payload.listings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load accommodation listings.");
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, []);

  return (
    <div className="theme-page pb-20">
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/accommodation"
          className="theme-muted inline-flex items-center gap-2 text-sm transition hover:text-slate-950 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to accommodation
        </Link>

        <CompactPageHero
          eyebrow="Hotels"
          title="Stays that give the route a reliable base"
          description="Compare trusted accommodation options and move into booking or planning without a visual reset."
          imageUrl="/images/palm-river-hotel-604329-original.jpg"
          className="mt-4 px-0 pb-0 pt-0"
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {error ? (
          <div className="theme-panel rounded-[28px] p-6 text-sm text-rose-500">{error}</div>
        ) : loading ? (
          <div className="theme-panel rounded-[28px] p-8 text-center">
            <p className="theme-muted text-sm">Loading accommodation listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="theme-panel rounded-[28px] p-8 text-center">
            <p className="theme-muted text-sm">No hotel listings are published yet.</p>
          </div>
        ) : (
          <>
            <CompactSectionHeader title="Available hotel stays" count={listings.length} />
            <HorizontalRail itemClassName="w-[78vw] max-w-[300px] sm:w-[280px]">
            {listings.map((listing) => (
              <CompactRailCard
                key={listing.id}
                href={`/marketplace/${listing.slug}`}
                title={listing.title}
                imageUrl={listing.images[0] || "/images/palm-river-hotel-604329-original.jpg"}
                meta={listing.category}
                detail={listing.location}
                badge={listing.basePrice ? `$${listing.basePrice}` : "Quote"}
                description={listing.shortDescription || listing.description}
                actionLabel="View hotel"
              >
                <div className="flex items-center gap-2 text-[10px] text-white/80">
                  {listing.provider.hasVerifiedBadge ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1">
                      <ShieldCheck className="h-3 w-3 text-[#8cf0a1]" />
                      Verified
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1">
                    <Sparkles className="h-3 w-3 text-[#ffca74]" />
                    Stay
                  </span>
                  </div>
              </CompactRailCard>
            ))}
            </HorizontalRail>
          </>
        )}
      </section>
    </div>
  );
}
