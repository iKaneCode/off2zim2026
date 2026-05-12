"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, LayoutGrid, PanelRightOpen, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTripPlanner } from "@/contexts/TripPlannerContext";
import { usePayment } from "@/contexts/PaymentContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSurfaceHref } from "@/lib/app-surface";
import {
  addDays,
  getBudgetBreakdown,
  detectLogisticsGaps,
  getExpandedTripMeta,
  getItemDateLabel,
  getItemPricingLabel,
  getItemRangeLabel,
  getItemsInTripWindow,
  getItemUnitCost,
  getPricedItemCost,
  itemTouchesDate,
  itemScalesWithTravelers,
  getPlannerDays,
  getTripTotals,
  PlannerSectionId,
} from "@/lib/trip-planner/planner";
import PlannerAddDrawer from "./planner/PlannerAddDrawer";
import PlannerDayBoard from "./planner/PlannerDayBoard";
import PlannerOverviewSection from "./planner/PlannerOverviewSection";
import LogisticsWarning from "./LogisticsWarning";
import { PlannerScheduleDefaults, TripPlannerMeta } from "@/types/trip-planner";

interface NoticeState {
  tone: "success" | "error";
  message: string;
}

const PENDING_ITINERARY_BOOKING_KEY = "off2zim_pending_itinerary_booking";

export interface TripPlannerRouteSelections {
  isShared?: boolean;
  meta?: Partial<TripPlannerMeta>;
  totalBudget?: number;
}

interface TripPlannerBuilderProps {
  routeSelections?: TripPlannerRouteSelections;
}

export default function TripPlannerBuilder({
  routeSelections,
}: TripPlannerBuilderProps) {
  const router = useRouter();
  const { addToBooking, currentBooking, removeFromBooking } = usePayment();
  const { user, isLoading: authLoading } = useAuth();
  const {
    items,
    meta,
    totalBudget,
    isHydrated,
    removeItem,
    clearItems,
    reorderItems,
    setTotalBudget,
    addCatalogItem,
    updateMeta,
    loadSharedPlan,
  } = useTripPlanner();
  const [activeSection, setActiveSection] = useState<PlannerSectionId>("overview");
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [forcedActiveDay, setForcedActiveDay] = useState<string | null>(null);
  const [allowEmptyActiveDay, setAllowEmptyActiveDay] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDefaults, setDrawerDefaults] = useState<PlannerScheduleDefaults>({
    date: routeSelections?.meta?.startDate || meta.startDate,
  });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [hasAppliedRouteSelections, setHasAppliedRouteSelections] = useState(false);
  const [hasEditedTripBrief, setHasEditedTripBrief] = useState(false);
  const [draftMeta, setDraftMeta] = useState<TripPlannerMeta>({
    ...meta,
    ...routeSelections?.meta,
  });
  const [draftTotalBudget, setDraftTotalBudget] = useState(
    routeSelections?.totalBudget ?? totalBudget
  );
  const exportRef = useRef<HTMLDivElement | null>(null);
  const pendingActiveDayRef = useRef<string | null>(null);
  const suppressDayClicksUntilRef = useRef(0);
  const routeSelectionKey = useMemo(
    () =>
      JSON.stringify({
        isShared: Boolean(routeSelections?.isShared),
        meta: routeSelections?.meta || {},
        totalBudget: routeSelections?.totalBudget ?? null,
      }),
    [routeSelections?.isShared, routeSelections?.meta, routeSelections?.totalBudget]
  );
  const previousRouteSelectionKeyRef = useRef(routeSelectionKey);

  const plannerMeta = draftMeta;
  const plannerTotalBudget = draftTotalBudget;

  const tripWindowItems = useMemo(
    () => getItemsInTripWindow(items, plannerMeta),
    [items, plannerMeta]
  );
  const travelerCount = Math.max(plannerMeta.travelers ?? 1, 1);
  const days = useMemo(
    () => getPlannerDays(tripWindowItems, plannerMeta),
    [plannerMeta, tripWindowItems]
  );
  const totals = useMemo(
    () => getTripTotals(tripWindowItems, plannerTotalBudget, travelerCount),
    [plannerTotalBudget, travelerCount, tripWindowItems]
  );
  const budgetBreakdown = useMemo(
    () => getBudgetBreakdown(tripWindowItems, travelerCount),
    [travelerCount, tripWindowItems]
  );
  const logisticsGaps = useMemo(
    () => detectLogisticsGaps(tripWindowItems, plannerMeta),
    [plannerMeta, tripWindowItems]
  );
  const activeDayRecord = activeDay
    ? days.find((day) => day.key === activeDay)
    : null;
  const firstPopulatedDay = days.find((day) => day.items.length > 0);
  const boardActiveDay =
    forcedActiveDay ||
    (!allowEmptyActiveDay &&
    activeDay &&
    activeDayRecord &&
    activeDayRecord.items.length === 0 &&
    firstPopulatedDay
      ? firstPopulatedDay.key
      : activeDay);
  const preferredBoardDay =
    forcedActiveDay || null;

  const normalizeTripWindow = (
    current: TripPlannerMeta,
    updates: Partial<TripPlannerMeta>
  ): TripPlannerMeta => {
    const nextMeta = {
      ...current,
      ...updates,
      ...(updates.travelers !== undefined
        ? { travelers: Math.max(1, updates.travelers) }
        : {}),
    };

    if (
      updates.startDate &&
      nextMeta.endDate &&
      updates.startDate > nextMeta.endDate
    ) {
      nextMeta.endDate = updates.startDate;
    }

    if (
      updates.endDate &&
      nextMeta.startDate &&
      updates.endDate < nextMeta.startDate
    ) {
      nextMeta.startDate = updates.endDate;
    }

    return nextMeta;
  };

  useEffect(() => {
    if (!days.length) {
      setActiveDay(null);
      return;
    }

    if (
      pendingActiveDayRef.current &&
      days.some((day) => day.key === pendingActiveDayRef.current)
    ) {
      setActiveDay(pendingActiveDayRef.current);
      pendingActiveDayRef.current = null;
      return;
    }

    if (!activeDay || !days.some((day) => day.key === activeDay)) {
      setActiveDay(days[0].key);
    }
  }, [activeDay, days]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (previousRouteSelectionKeyRef.current === routeSelectionKey) return;

    previousRouteSelectionKeyRef.current = routeSelectionKey;
    setHasAppliedRouteSelections(false);
    setHasEditedTripBrief(false);
    setDraftMeta({
      ...meta,
      ...(!routeSelections?.isShared ? routeSelections?.meta : {}),
    });
    setDraftTotalBudget(
      !routeSelections?.isShared && routeSelections?.totalBudget !== undefined
        ? routeSelections.totalBudget
        : totalBudget
    );
  }, [
    meta,
    routeSelectionKey,
    routeSelections?.isShared,
    routeSelections?.meta,
    routeSelections?.totalBudget,
    totalBudget,
  ]);

  useEffect(() => {
    if (!isHydrated || hasEditedTripBrief) return;

    setDraftMeta({
      ...meta,
      ...(!routeSelections?.isShared ? routeSelections?.meta : {}),
    });
    setDraftTotalBudget(
      !routeSelections?.isShared && routeSelections?.totalBudget !== undefined
        ? routeSelections.totalBudget
        : totalBudget
    );
  }, [
    hasEditedTripBrief,
    isHydrated,
    meta,
    routeSelections?.isShared,
    routeSelections?.meta,
    routeSelections?.totalBudget,
    totalBudget,
  ]);

  useEffect(() => {
    if (!isHydrated || hasAppliedRouteSelections) return;

    if (routeSelections?.isShared) {
      setHasAppliedRouteSelections(true);
      return;
    }

    const metaUpdates: Partial<TripPlannerMeta> = routeSelections?.meta || {};

    if (Object.keys(metaUpdates).length > 0) {
      updateMeta(metaUpdates);
    }

    if (routeSelections?.totalBudget !== undefined) {
      setTotalBudget(routeSelections.totalBudget);
    }

    setHasAppliedRouteSelections(true);
  }, [hasAppliedRouteSelections, isHydrated, routeSelections, setTotalBudget, updateMeta]);

  useEffect(() => {
    if (!isHydrated) return;

    const sharedData = new URLSearchParams(window.location.search).get("shared");
    if (!sharedData) return;

    try {
      const parsed = JSON.parse(atob(sharedData));
      loadSharedPlan({
        items: Array.isArray(parsed.items) ? parsed.items : [],
        totalBudget:
          typeof parsed.totalBudget === "number" ? parsed.totalBudget : 2000,
        meta:
          parsed.meta && typeof parsed.meta === "object"
            ? parsed.meta
            : {
                title: "Shared Zimbabwe Journey",
                travelers: 2,
              },
      });
      setNotice({
        tone: "success",
        message: "Shared itinerary loaded into your planner.",
      });
    } catch {
      setNotice({
        tone: "error",
        message: "That shared itinerary link could not be loaded.",
      });
    }
  }, [isHydrated, loadSharedPlan]);

  const openAddDrawer = (
    date?: string,
    scheduleDefaults?: PlannerScheduleDefaults
  ) => {
    setDrawerDefaults({
      ...scheduleDefaults,
      date: scheduleDefaults?.date || date || activeDay || plannerMeta.startDate,
    });
    setIsDrawerOpen(true);
  };

  const handleExport = async () => {
    if (!exportRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#f6efe8",
        useCORS: true,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let heightLeft = imageHeight;
      let position = margin;

      const imageData = canvas.toDataURL("image/png");
      pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight + margin;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save("off2zim-itinerary.pdf");
      setNotice({
        tone: "success",
        message: "Branded itinerary PDF exported.",
      });
    } catch {
      setNotice({
        tone: "error",
        message: "The PDF export could not be generated right now.",
      });
    }
  };

  const handleShare = async () => {
    const payload = btoa(
      JSON.stringify({
        items: tripWindowItems,
        totalBudget: plannerTotalBudget,
        meta: plannerMeta,
      })
    );
    const url = `${window.location.origin}/trip-planner?shared=${payload}`;
    const canUseNativeShare = typeof navigator.share === "function";

    try {
      if (canUseNativeShare) {
        await navigator.share({
          title: plannerMeta.title || "Off2Zim itinerary",
          text: "Explore my Off2Zim itinerary.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }

      setNotice({
        tone: "success",
        message: canUseNativeShare
          ? "Itinerary share sheet opened."
          : "Share link copied to clipboard.",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setNotice({
        tone: "error",
        message: "Sharing did not complete. Please try again.",
      });
    }
  };

  const handleReset = () => {
    clearItems();
    setNotice({
      tone: "success",
      message: "Planner cleared. Your trip details were kept so you can start again quickly.",
    });
  };

  const handleDeleteDay = (dayKey: string) => {
    const remainingItems = items.filter((item) => !itemTouchesDate(item, dayKey));
    reorderItems(remainingItems);
    setForcedActiveDay(dayKey);
    setActiveDay(dayKey);
    setNotice({
      tone: "success",
      message: "Planned items were cleared from that day.",
    });
  };

  const handleReorderTripWindowItems = (nextTripWindowItems: typeof tripWindowItems) => {
    const visibleIds = new Set(tripWindowItems.map((item) => item.id));
    const itemsOutsideWindow = items.filter((item) => !visibleIds.has(item.id));
    reorderItems([...itemsOutsideWindow, ...nextTripWindowItems]);
  };

  const handleDraftMetaChange = (updates: Partial<TripPlannerMeta>) => {
    const nextMeta = normalizeTripWindow(draftMeta, updates);

    setHasEditedTripBrief(true);
    setDraftMeta(nextMeta);
    updateMeta(nextMeta);
  };

  const handleDraftBudgetChange = (value: number) => {
    const nextBudget = Number.isFinite(value) ? Math.max(0, value) : 0;
    setHasEditedTripBrief(true);
    setDraftTotalBudget(nextBudget);
    setTotalBudget(nextBudget);
  };

  const handleContinueToBoard = () => {
    const nextMeta = normalizeTripWindow(draftMeta, {});
    setDraftMeta(nextMeta);
    updateMeta(nextMeta);
    setTotalBudget(draftTotalBudget);
    setHasAppliedRouteSelections(true);
    setForcedActiveDay(nextMeta.startDate || null);
    setAllowEmptyActiveDay(true);
    if (nextMeta.startDate) {
      setActiveDay(nextMeta.startDate);
    }
    setActiveSection("board");
  };

  const handleAddBoardDay = () => {
    const currentLastDay = plannerMeta.endDate || days.at(-1)?.key || plannerMeta.startDate;
    if (!currentLastDay) {
      setNotice({
        tone: "error",
        message: "Choose a start date first, then add more days to the board.",
      });
      setActiveSection("overview");
      return;
    }

    const nextDay = addDays(currentLastDay, 1);
    const nextMeta = normalizeTripWindow(plannerMeta, {
      startDate: plannerMeta.startDate || currentLastDay,
      endDate: nextDay,
      excludedDates: (plannerMeta.excludedDates || []).filter((date) => date !== nextDay),
    });

    setHasEditedTripBrief(true);
    setDraftMeta(nextMeta);
    updateMeta(nextMeta);
    setForcedActiveDay(nextDay);
    setAllowEmptyActiveDay(true);
    setActiveDay(nextDay);
    setNotice({
      tone: "success",
      message: "Another day was added to your itinerary window.",
    });
  };

  const queueItineraryForCheckout = useCallback(() => {
    if (!tripWindowItems.length) return false;

    // Remove any previously queued planner items to prevent duplicates on
    // repeat clicks (e.g. user goes back from checkout and clicks again).
    (currentBooking ?? [])
      .filter((b) => b.metadata?.source === "trip-planner")
      .forEach((b) => removeFromBooking(b.id));

    tripWindowItems.forEach((item) => {
      const isAccommodation = item.type === "accommodation";
      const scalesWithTravelers = itemScalesWithTravelers(item);
      const unitCost = getItemUnitCost(item);
      const effectiveCost = getPricedItemCost(item, travelerCount);
      const bookingQuantity = scalesWithTravelers ? travelerCount : 1;
      const bookingPrice = isAccommodation
        ? unitCost
        : effectiveCost / bookingQuantity;
      // "dining" is a valid PlannerItemType but not a valid BookingItem type —
      // map it to "activity" so the type constraint is satisfied at runtime.
      const bookingType =
        item.type === "dining" ? "activity" :
        item.type as "accommodation" | "activity" | "transport";

      addToBooking({
        // Deterministic ID per planner item so the dedup check in PaymentContext
        // correctly matches on a second call instead of silently appending.
        id: `planner_${item.id}`,
        type: bookingType,
        name: item.title,
        description: item.location ?? item.category,
        price: bookingPrice,
        currency: "USD",
        quantity: bookingQuantity,
        ...(isAccommodation && item.date
          ? { checkIn: item.date, checkOut: addDays(item.date, Math.max(item.quantity ?? 1, 1)) }
          : {}),
        // Preserve the original category (e.g. "dining") in the optional
        // category field even though type is mapped to "activity".
        category: item.category as string,
        metadata: {
          location: item.location,
          source: "trip-planner",
          planTitle: plannerMeta.title || "Off2Zim Itinerary",
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          image: item.image,
          pricingModel: scalesWithTravelers ? "per_traveler" : "fixed",
          pricingLabel: getItemPricingLabel(item, travelerCount),
          plannerLineTotal: effectiveCost,
          travelers: travelerCount,
        },
      });
    });

    return true;
  }, [
    addToBooking,
    currentBooking,
    plannerMeta.title,
    removeFromBooking,
    travelerCount,
    tripWindowItems,
  ]);

  const handleBookItinerary = () => {
    if (!tripWindowItems.length) return;

    if (authLoading) {
      setNotice({
        tone: "error",
        message: "Checking your sign-in status. Please try again in a moment.",
      });
      return;
    }

    if (!user) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PENDING_ITINERARY_BOOKING_KEY, "1");
      }
      setNotice({
        tone: "success",
        message: "Sign in or create an account to keep this booking in your history.",
      });
      router.push(
        `${getSurfaceHref("explorer", "/login")}?redirect=${encodeURIComponent("/trip-planner")}`
      );
      return;
    }

    queueItineraryForCheckout();
    router.push("/checkout");
  };

  useEffect(() => {
    if (!isHydrated || authLoading || !user || !tripWindowItems.length) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(PENDING_ITINERARY_BOOKING_KEY) !== "1") return;

    sessionStorage.removeItem(PENDING_ITINERARY_BOOKING_KEY);
    if (queueItineraryForCheckout()) {
      router.push("/checkout");
    }
  }, [authLoading, isHydrated, queueItineraryForCheckout, router, tripWindowItems.length, user]);

  return (
    <section
      id="planner-explore"
      tabIndex={-1}
      className="section-sm scroll-mt-24 pt-6 focus:outline-none md:pt-8"
      aria-label="Itinerary builder explore section"
    >
      <div className="container">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="theme-label text-xs uppercase tracking-[0.26em]">
              Planner studio
            </p>
            <h2 className="theme-heading mt-2 text-3xl font-semibold md:text-4xl">
              Itinerary builder
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSection("overview")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                activeSection === "overview"
                  ? "bg-slate-950 text-white dark:bg-white dark:text-black"
                  : "theme-button-secondary"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveSection("board")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                activeSection === "board"
                  ? "bg-slate-950 text-white dark:bg-white dark:text-black"
                  : "theme-button-secondary"
              }`}
            >
              <PanelRightOpen className="h-4 w-4" />
              Day board
            </button>
            <button
              onClick={() => openAddDrawer()}
              className="inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5630]/20 transition hover:bg-[#e44c28]"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </div>
        </div>

        {notice ? (
          <div
            className={`mb-5 flex items-center gap-3 rounded-[24px] border px-4 py-3 text-sm ${
              notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {notice.message}
          </div>
        ) : null}

        {/* Logistics warnings — shown on the board view where gaps are most actionable */}
        {activeSection === "board" && logisticsGaps.length > 0 && (
          <div className="mb-4">
            <LogisticsWarning gaps={logisticsGaps} />
          </div>
        )}

        <div className="space-y-5 md:space-y-6">
          {activeSection === "overview" ? (
            <PlannerOverviewSection
              meta={plannerMeta}
              totalBudget={plannerTotalBudget}
              onMetaChange={handleDraftMetaChange}
              onBudgetChange={handleDraftBudgetChange}
              onContinueToBoard={handleContinueToBoard}
              onOpenAddDrawer={openAddDrawer}
            />
          ) : (
            <PlannerDayBoard
              items={tripWindowItems}
              meta={plannerMeta}
              totalBudget={plannerTotalBudget}
              activeDay={boardActiveDay}
              preferredDay={preferredBoardDay}
              onActiveDayChange={(dayKey) => {
                if (Date.now() < suppressDayClicksUntilRef.current) return;
                setForcedActiveDay(null);
                setAllowEmptyActiveDay(true);
                setActiveDay(dayKey);
              }}
              onOpenAddDrawer={openAddDrawer}
              onAddDay={handleAddBoardDay}
              onRemoveItem={removeItem}
              onReorderItems={handleReorderTripWindowItems}
              onDeleteDay={handleDeleteDay}
              onShare={handleShare}
              onExport={handleExport}
              onReset={handleReset}
              onBookItinerary={handleBookItinerary}
            />
          )}
        </div>

        <PlannerAddDrawer
          isOpen={isDrawerOpen}
          defaults={drawerDefaults}
          minDate={plannerMeta.startDate}
          maxDate={plannerMeta.endDate}
          onClose={() => setIsDrawerOpen(false)}
          onAddItem={(item, overrides) => {
            const added = addCatalogItem(item, overrides);
            const targetDay = overrides?.date || added.date;
            if (!plannerMeta.startDate || !plannerMeta.endDate) {
              updateMeta(getExpandedTripMeta(plannerMeta, added));
            }
            pendingActiveDayRef.current = targetDay;
            suppressDayClicksUntilRef.current = Date.now() + 800;
            setForcedActiveDay(targetDay);
            setAllowEmptyActiveDay(false);
            setActiveSection("board");
            setActiveDay(targetDay);
            window.setTimeout(() => {
              pendingActiveDayRef.current = targetDay;
              setForcedActiveDay(targetDay);
              setAllowEmptyActiveDay(false);
              setActiveDay(targetDay);
            }, 150);
            setNotice({
              tone: "success",
              message: `${added.title} was added to the itinerary.`,
            });
            return added;
          }}
        />

        <div className="pointer-events-none fixed left-[-9999px] top-0 opacity-0">
          <div
            ref={exportRef}
            className="w-[900px] bg-[#f6efe8] px-10 py-10 text-slate-950"
          >
            <div className="rounded-[32px] bg-gradient-to-br from-[#0f0f0f] via-[#181818] to-[#26140f] px-8 py-8 text-white">
              <div className="flex items-start justify-between gap-6">
                <div className="max-w-[420px]">
                  <img
                    src="/logos/logo-darkmode.png"
                    alt="Off2Zim"
                    className="h-20 w-auto object-contain"
                  />
                  <p className="mt-6 text-xs uppercase tracking-[0.32em] text-white/65">
                    Explore | Experience | Enjoy
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold leading-tight">
                    {plannerMeta.title || "Off2Zim Itinerary"}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    A branded trip summary with your route, daily plan, and
                    budget overview for smoother travel coordination.
                  </p>
                </div>

                <div className="grid min-w-[250px] gap-3">
                  <div className="rounded-[24px] bg-white/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/55">
                      Travel window
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {plannerMeta.startDate || "TBD"} to {plannerMeta.endDate || "TBD"}
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-white/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/55">
                      Travelers
                    </div>
                    <div className="mt-2 text-lg font-semibold">{plannerMeta.travelers}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 grid-cols-4">
              <div className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Budget
                </div>
                <div className="mt-2 text-3xl font-semibold">${plannerTotalBudget}</div>
              </div>
              <div className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Planned spend
                </div>
                <div className="mt-2 text-3xl font-semibold">${totals.totalCost}</div>
              </div>
              <div className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Remaining
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {totals.remainingBudget < 0 ? "-" : ""}${Math.abs(totals.remainingBudget)}
                </div>
              </div>
              <div className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Destinations
                </div>
                <div className="mt-2 text-3xl font-semibold">{totals.destinations}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] bg-white px-6 py-6 shadow-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Day-by-day itinerary
                </div>
                <div className="mt-4 space-y-4">
                  {days.map((day, index) => (
                    <section key={day.key} className="rounded-[24px] bg-[#f7f2ee] p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Day {index + 1}
                          </div>
                          <div className="mt-1 text-xl font-semibold">{day.label}</div>
                        </div>
                        <div className="text-sm text-slate-500">
                          {day.items.length} item{day.items.length === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {day.items.length ? (
                          day.items.map((item) => (
                            <div
                              key={`${day.key}-${item.id}`}
                              className="rounded-[20px] bg-white px-4 py-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    {item.category}
                                  </div>
                                  <div className="mt-1 text-lg font-semibold">
                                    {item.title}
                                  </div>
                                </div>
                                <div className="text-right text-sm font-semibold">
                                  ${getPricedItemCost(item, travelerCount).toLocaleString()}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-600">
                                <div>{item.location}</div>
                                <div>{getItemDateLabel(item)}</div>
                                <div>
                                  {item.type === "accommodation"
                                    ? getItemRangeLabel(item, day.key)
                                    : `${item.startTime} - ${item.endTime}`}
                                </div>
                              </div>
                              <div className="mt-2 text-xs font-semibold text-slate-500">
                                {getItemPricingLabel(item, travelerCount)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[20px] bg-white px-4 py-4 text-sm text-slate-500">
                            No items for this day.
                          </div>
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] bg-white px-6 py-6 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Budget breakdown
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Stays</span>
                      <span className="font-semibold">${budgetBreakdown.accommodation.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Experiences</span>
                      <span className="font-semibold">${budgetBreakdown.activity.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Transport</span>
                      <span className="font-semibold">${budgetBreakdown.transport.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Dining</span>
                      <span className="font-semibold">${budgetBreakdown.dining.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#f2ded6]">
                    <div
                      className="h-full rounded-full bg-[#ff5630]"
                      style={{ width: `${Math.min(totals.budgetPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {Math.round(totals.budgetPercentage)}% of the budget is currently allocated.
                  </div>
                </div>

                <div className="rounded-[28px] bg-white px-6 py-6 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Planner notes
                  </div>
                  <div className="mt-3 text-sm leading-7 text-slate-700">
                    {plannerMeta.notes || "No notes added."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
