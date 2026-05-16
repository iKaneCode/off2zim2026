"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import {
  FeaturedSection,
  type FeaturedEntryData,
  type FeaturedPathway,
} from "@/components/featured/FeaturedCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";

interface FeaturedResponse {
  featured: Record<FeaturedPathway, FeaturedEntryData[]>;
  total: number;
}

export default function FeaturedPage() {
  const [data, setData] = useState<FeaturedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<FeaturedResponse>("/api/featured")
      .then((d) => setData(d))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load featured listings.")
      )
      .finally(() => setLoading(false));
  }, []);

  const hasContent =
    data &&
    (data.featured.sponsored.length > 0 ||
      data.featured.top_rated.length > 0 ||
      data.featured.editors_choice.length > 0);

  return (
    <div className="theme-page">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
          <CompactSectionHeader
            eyebrow="Editorially curated"
            title="Featured across Zimbabwe"
          />
          <p className="theme-muted mt-2 max-w-xl text-sm leading-6">
            Editors picks, top-rated providers, and standout experiences from across Zimbabwe, refreshed every week.
          </p>
        </div>

        {error && (
          <div className="mb-8 rounded-[20px] border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-sm text-[#ff5630]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 w-32 animate-pulse rounded-full bg-white/8" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div
                      key={j}
                      className="animate-pulse rounded-[24px] bg-white/[0.04]"
                      style={{ aspectRatio: "4/5" }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !hasContent ? (
          <div className="rounded-xl border border-white/10 bg-[#111111] p-8 text-center space-y-4">
            <Sparkles className="mx-auto h-10 w-10 text-white/15" />
            <p className="font-semibold text-white/50">No featured listings yet</p>
            <p className="text-sm text-white/30 max-w-xs mx-auto">
              This collection is updated every week. Browse the full catalog in the meantime.
            </p>
            <a
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Browse all listings
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Editor's Choice first — most editorial weight */}
            <FeaturedSection
              pathway="editors_choice"
              entries={data.featured.editors_choice}
            />
            {/* Top Rated */}
            <FeaturedSection
              pathway="top_rated"
              entries={data.featured.top_rated}
            />
            {/* Sponsored last */}
            <FeaturedSection
              pathway="sponsored"
              entries={data.featured.sponsored}
            />
          </div>
        )}
      </div>
    </div>
  );
}
