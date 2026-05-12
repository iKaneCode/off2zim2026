"use client";

import React, { useState } from "react";
import { Star, TrendingUp, Users, Award, Calendar } from "lucide-react";
import StarRating from "./StarRating";
import ReviewCard from "./ReviewCard";

interface RatingSummaryProps {
  overallRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
  criteriaRatings?: { [key: string]: number };
  recentReviews: React.ComponentProps<typeof ReviewCard>["review"][];
  showWriteReview?: boolean;
  onWriteReview?: () => void;
}

const CRITERIA_LABELS: Record<string, string> = {
  quality:        "Service Quality",
  communication:  "Communication",
  value:          "Value for Money",
  professionalism:"Professionalism",
  knowledge:      "Local Knowledge",
  helpfulness:    "Helpfulness",
  responsiveness: "Responsiveness",
  respect:        "Respectfulness",
  reliability:    "Reliability",
};

const FILTER_OPTIONS = [
  { value: "all",      label: "All Reviews" },
  { value: "5",        label: "5 Stars" },
  { value: "4",        label: "4 Stars" },
  { value: "3",        label: "3 Stars" },
  { value: "2",        label: "2 Stars" },
  { value: "1",        label: "1 Star" },
  { value: "verified", label: "Verified Only" },
];

const SORT_OPTIONS = [
  { value: "recent",  label: "Most Recent" },
  { value: "oldest",  label: "Oldest First" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest",  label: "Lowest Rated" },
  { value: "helpful", label: "Most Helpful" },
];

export const RatingSummary: React.FC<RatingSummaryProps> = ({
  overallRating,
  totalReviews,
  ratingDistribution,
  criteriaRatings = {},
  recentReviews,
  showWriteReview = true,
  onWriteReview,
}) => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const getPercentage = (count: number) =>
    totalReviews > 0 ? (count / totalReviews) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="theme-panel rounded-[28px] p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall score */}
          <div className="flex flex-col items-center lg:items-start gap-3">
            <div className="flex items-end gap-3">
              <span className="theme-heading text-5xl font-bold leading-none">
                {overallRating.toFixed(1)}
              </span>
              <div className="pb-1">
                <StarRating rating={overallRating} readonly showText={false} size="lg" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 theme-muted text-sm">
                <Users className="h-4 w-4" />
                {totalReviews.toLocaleString()} reviews
              </span>
              <span className="flex items-center gap-1 text-sm text-[#4ade80]">
                <TrendingUp className="h-4 w-4" />
                Trending up
              </span>
            </div>
          </div>

          {/* Distribution bars */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const pct   = getPercentage(count);
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-14 shrink-0">
                    <span className="theme-subtle text-sm">{star}</span>
                    <Star className="h-3 w-3 fill-white/20 text-white/20" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#fbbf24] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="theme-subtle text-xs w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>

          {/* CTA + trust */}
          <div className="flex flex-col items-center lg:items-end justify-between gap-4">
            {showWriteReview && onWriteReview && (
              <button
                onClick={onWriteReview}
                className="w-full lg:w-auto rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
              >
                Write a Review
              </button>
            )}
            <div className="flex items-center gap-1.5 theme-subtle text-sm">
              <Award className="h-4 w-4 text-[#fbbf24]" />
              Verified Reviews
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown */}
      {Object.keys(criteriaRatings).length > 0 && (
        <div className="theme-panel rounded-[28px] p-6">
          <h3 className="theme-heading font-semibold mb-4">Rating Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {Object.entries(criteriaRatings).map(([key, rating]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-[14px] bg-white/[0.04] border border-white/[0.07] px-4 py-3"
              >
                <span className="theme-muted text-sm">
                  {CRITERIA_LABELS[key] ?? key}
                </span>
                <div className="flex items-center gap-2">
                  <StarRating rating={rating} readonly showText={false} size="sm" />
                  <span className="theme-heading text-sm font-semibold w-8 text-right">
                    {rating.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Sort */}
      <div className="theme-panel rounded-[24px] px-5 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="theme-input rounded-[12px] px-3 py-2 text-sm"
            >
              {FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/30" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="theme-input rounded-[12px] px-3 py-2 text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="theme-subtle text-sm">
            Showing {recentReviews.length} of {totalReviews} reviews
          </span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {recentReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onHelpful={(id) => console.log("Helpful:", id)}
            onReport={(id)  => console.log("Report:", id)}
          />
        ))}
      </div>

      {/* Load More */}
      {recentReviews.length < totalReviews && (
        <div className="text-center">
          <button className="rounded-full border border-white/10 px-6 py-3 text-sm theme-muted hover:bg-white/[0.05] transition-colors">
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
};

export default RatingSummary;
