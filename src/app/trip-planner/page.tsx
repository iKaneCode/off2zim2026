import React from "react";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import CompactPageHero from "@/components/ui/CompactPageHero";
import TripPlannerBuilder from "../../components/trip-planner/TripPlannerBuilder";
import type { TripPlannerRouteSelections } from "@/components/trip-planner/TripPlannerBuilder";

export const metadata = {
  title: "Planner Studio - Off2Zim | Build Your Zimbabwe Itinerary",
  description:
    "Use the Off2Zim planner to build, organize, and export a Zimbabwe itinerary in one place.",
};

type TripPlannerSearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(
  searchParams: TripPlannerSearchParams | undefined,
  key: string
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function getRouteSelections(
  searchParams: TripPlannerSearchParams | undefined
): TripPlannerRouteSelections {
  const startDate =
    getSearchParam(searchParams, "startDate") ||
    getSearchParam(searchParams, "departDate") ||
    getSearchParam(searchParams, "pickupDate") ||
    getSearchParam(searchParams, "checkIn") ||
    undefined;
  const endDate =
    getSearchParam(searchParams, "endDate") ||
    getSearchParam(searchParams, "returnDate") ||
    getSearchParam(searchParams, "dropoffDate") ||
    getSearchParam(searchParams, "checkOut") ||
    undefined;
  const travelersValue =
    getSearchParam(searchParams, "travelers") ||
    getSearchParam(searchParams, "passengers") ||
    getSearchParam(searchParams, "guests");
  const budgetValue =
    getSearchParam(searchParams, "budget") ||
    getSearchParam(searchParams, "totalBudget");
  const titleValue = getSearchParam(searchParams, "title");
  const searchValue =
    getSearchParam(searchParams, "search") ||
    getSearchParam(searchParams, "destination");
  const travelers = travelersValue ? Number(travelersValue) : undefined;
  const totalBudget = budgetValue ? Number(budgetValue) : undefined;

  return {
    isShared: Boolean(getSearchParam(searchParams, "shared")),
    meta: {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(travelers && travelers > 0 ? { travelers } : {}),
      ...(titleValue?.trim()
        ? { title: titleValue.trim() }
        : searchValue?.trim()
          ? { title: `${searchValue.trim()} itinerary` }
          : {}),
    },
    totalBudget:
      totalBudget !== undefined && Number.isFinite(totalBudget) && totalBudget >= 0
        ? totalBudget
        : undefined,
  };
}

export default function TripPlannerPage({
  searchParams,
}: {
  searchParams?: TripPlannerSearchParams;
}) {
  const routeSelections = getRouteSelections(searchParams);

  return (
    <div className="theme-page">
      <CompactPageHero
        eyebrow="Trip planner"
        title="Build your Zimbabwe itinerary, day by day"
        description="Add stays, activities, transport, and dining into one timeline. Reorder your plans, track your budget, book in one checkout, or export a PDF to share."
        imageUrl="/images/hwange-bush-camp-548548-original.jpg"
      >
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <PlannerFact title="All in one" detail="Stays, activities and transport" />
          <PlannerFact title="Live budget" detail="Track spend as you plan" />
          <PlannerFact title="One checkout" detail="Book the whole itinerary" />
        </div>
      </CompactPageHero>

      <section className="mx-auto max-w-7xl px-4 pb-2 pt-0 sm:px-6 lg:px-8">
        <AppServiceStrip activeLabel="Trip Planner" />
      </section>
      <TripPlannerBuilder routeSelections={routeSelections} />
    </div>
  );
}

function PlannerFact({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-w-[170px] rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white backdrop-blur">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-0.5 truncate text-xs text-white/64">{detail}</div>
    </div>
  );
}
