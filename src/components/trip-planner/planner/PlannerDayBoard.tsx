"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  GripVertical,
  MapPin,
  Plus,
  ShoppingCart,
  Trash2,
  UtensilsCrossed,
  Users,
  Zap,
} from "lucide-react";
import {
  DaySegment,
  getBudgetBreakdown,
  getItemDateLabel,
  getItemPricingLabel,
  getItemTimeLabel,
  getPricedItemCost,
  getItemRangeLabel,
  getPlannerDays,
  getSectionCounts,
  getSegmentForTime,
  getStatusTone,
  getTripTotals,
  itemScalesWithTravelers,
} from "@/lib/trip-planner/planner";
import {
  PlannerScheduleDefaults,
  TripPlannerItem,
  TripPlannerMeta,
} from "@/types/trip-planner";

/* ── types ─────────────────────────────────────────────────────────────────── */

const segments: Array<{ key: DaySegment; label: string; range: string; color: string }> = [
  { key: "morning",   label: "Morning",   range: "06:00 – 11:59", color: "#fbbf24" },
  { key: "afternoon", label: "Afternoon", range: "12:00 – 16:59", color: "#60a5fa" },
  { key: "evening",   label: "Evening",   range: "17:00 onwards", color: "#c084fc" },
];

const segmentDefaults: Record<DaySegment, Required<Pick<PlannerScheduleDefaults, "startTime" | "endTime">>> = {
  morning:   { startTime: "09:00", endTime: "11:00" },
  afternoon: { startTime: "13:00", endTime: "16:00" },
  evening:   { startTime: "18:00", endTime: "20:00" },
};

/* ── budget colour map ──────────────────────────────────────────────────────── */

const BUDGET_COLORS = {
  accommodation: { bg: "bg-[#60a5fa]", hex: "#60a5fa", label: "Stays"       },
  activity:      { bg: "bg-[#fb923c]", hex: "#fb923c", label: "Experiences" },
  transport:     { bg: "bg-[#4ade80]", hex: "#4ade80", label: "Transport"   },
  dining:        { bg: "bg-[#e879f9]", hex: "#e879f9", label: "Dining"      },
} as const;

/* ── type-icon helper ───────────────────────────────────────────────────────── */

function ItemTypeIcon({ type }: { type: TripPlannerItem["type"] }) {
  if (type === "accommodation") return <BedDouble      className="h-3.5 w-3.5" />;
  if (type === "dining")        return <UtensilsCrossed className="h-3.5 w-3.5" />;
  if (type === "transport")     return <Zap            className="h-3.5 w-3.5" />;
  return <CheckCircle2 className="h-3.5 w-3.5" />;
}

/* ── sortable item wrapper ──────────────────────────────────────────────────── */

function SortableItem({
  item,
  dayKey,
  travelers,
  onRemove,
}: {
  item: TripPlannerItem;
  dayKey: string;
  travelers: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const scalesWithTravelers = itemScalesWithTravelers(item);
  const pricedCost = getPricedItemCost(item, travelers);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-[20px] border border-black/10 bg-white/80 dark:border-white/10 dark:bg-[#141414]"
    >
      <div className="flex gap-3 p-4">
        {/* drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 shrink-0 cursor-grab touch-none text-white/20 hover:text-white/50 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* image */}
        <img
          src={item.image}
          alt={item.title}
          className="h-16 w-16 shrink-0 rounded-[14px] object-cover"
        />

        {/* content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusTone(item.type)}`}
              >
                <ItemTypeIcon type={item.type} />
                {item.category}
              </span>
              {scalesWithTravelers ? (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-[#ff5630]/30 bg-[#ff5630]/10 px-2 py-0.5 text-xs font-semibold text-[#ff8a78]">
                  <Users className="h-3 w-3" />
                  Per traveler
                </span>
              ) : null}
              <h5 className="theme-heading mt-1.5 text-sm font-semibold leading-snug">
                {item.title}
              </h5>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="shrink-0 rounded-full p-1.5 text-white/25 transition hover:bg-[#2a0f0a] hover:text-[#ff8a78]"
              aria-label={`Remove ${item.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="theme-muted mt-2 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {getItemTimeLabel(item, dayKey)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#ff7352]" />
              {item.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {getItemDateLabel(item)}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="theme-muted text-xs">
              {getItemRangeLabel(item, dayKey)} · {getItemPricingLabel(item, travelers)}
            </span>
            <span className="theme-heading text-sm font-semibold">
              ${pricedCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── props ─────────────────────────────────────────────────────────────────── */

interface PlannerDayBoardProps {
  items: TripPlannerItem[];
  meta: TripPlannerMeta;
  totalBudget: number;
  activeDay: string | null;
  preferredDay?: string | null;
  onActiveDayChange: (dayKey: string) => void;
  onOpenAddDrawer: (date?: string, defaults?: PlannerScheduleDefaults) => void;
  onAddDay: () => void;
  onRemoveItem: (itemId: string) => void;
  onReorderItems: (items: TripPlannerItem[]) => void;
  onDeleteDay: (dayKey: string) => void;
  onShare: () => void;
  onExport: () => void;
  onReset: () => void;
  onBookItinerary: () => void;
}

/* ── main component ─────────────────────────────────────────────────────────── */

export default function PlannerDayBoard({
  items,
  meta,
  totalBudget,
  activeDay,
  preferredDay,
  onActiveDayChange,
  onOpenAddDrawer,
  onAddDay,
  onRemoveItem,
  onReorderItems,
  onDeleteDay,
  onShare,
  onExport,
  onReset,
  onBookItinerary,
}: PlannerDayBoardProps) {
  const days = getPlannerDays(items, meta);
  const preferredSafeDay =
    preferredDay && days.some((d) => d.key === preferredDay) ? preferredDay : null;
  const safeDayKey =
    preferredSafeDay ||
    (activeDay && days.some((d) => d.key === activeDay) ? activeDay : (days[0]?.key ?? null));
  const selectedDay = days.find((d) => d.key === safeDayKey) ?? null;
  const travelerCount = Math.max(meta.travelers ?? 1, 1);
  const totals = useMemo(
    () => getTripTotals(items, totalBudget, travelerCount),
    [items, totalBudget, travelerCount]
  );
  const counts = useMemo(() => getSectionCounts(items), [items]);
  const budgetBreakdown = useMemo(
    () => getBudgetBreakdown(items, travelerCount),
    [items, travelerCount]
  );
  const overBudget = totals.remainingBudget < 0;

  /* dnd sensors */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const dayItems = selectedDay?.items ?? [];
    const oldIdx = dayItems.findIndex((it) => it.id === active.id);
    const newIdx = dayItems.findIndex((it) => it.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(dayItems, oldIdx, newIdx);
    const otherItems = items.filter((it) => !dayItems.some((di) => di.id === it.id));
    onReorderItems([...otherItems, ...reordered]);
  };

  const openSegmentDrawer = (date: string, segment: DaySegment) =>
    onOpenAddDrawer(date, { date, ...segmentDefaults[segment] });

  const budgetTotal = Object.values(budgetBreakdown).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">

      {/* ── Horizontal day timeline ── */}
      {days.length > 0 && (
        <div className="theme-panel rounded-[28px] p-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {days.map((day, index) => {
              const isActive = safeDayKey === day.key;
              const hasItems = day.items.length > 0;
              return (
                <button
                  key={day.key}
                  onClick={() => onActiveDayChange(day.key)}
                  className={`flex shrink-0 flex-col items-center gap-1.5 rounded-[18px] border px-4 py-3 text-center transition min-w-[80px] ${
                    isActive
                      ? "border-[#ff5630] bg-[#ff5630]/10 text-[#ff7352]"
                      : "border-white/[0.07] bg-white/[0.02] theme-muted hover:border-white/[0.15] hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-60">
                    Day {index + 1}
                  </span>
                  <span className="text-sm font-semibold">{day.shortLabel.split(",")[0]}</span>
                  <span className="text-[10px] opacity-60">{day.shortLabel.split(",").slice(1).join(",").trim()}</span>
                  {/* item count dot */}
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    hasItems
                      ? isActive ? "bg-[#ff5630] text-white" : "bg-white/[0.1] theme-heading"
                      : "bg-white/[0.04] opacity-40"
                  }`}>
                    {day.items.length}
                  </span>
                </button>
              );
            })}
            <button
              onClick={onAddDay}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-[18px] border border-dashed border-white/[0.12] px-4 py-3 text-center min-w-[80px] theme-muted hover:border-[#ff5630] hover:text-[#ff5630] transition"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">Add day</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main 2-column grid ── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_320px]">

        {/* ── Left: day content ── */}
        <div className="theme-panel rounded-[30px] p-4 shadow-xl md:p-6">
          {selectedDay ? (
            <>
              <div className="flex flex-col gap-3 border-b border-black/10 pb-5 dark:border-white/10 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="theme-label text-xs uppercase tracking-[0.24em]">Organize</p>
                  <h3 className="theme-heading mt-2 text-2xl font-semibold">{selectedDay.label}</h3>
                  <p className="theme-muted mt-1 text-sm">
                    Drag items to reorder within a time block. Use + to add more.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpenAddDrawer(selectedDay.key)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add to day
                  </button>
                  <button
                    onClick={() => onDeleteDay(selectedDay.key)}
                    className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear day
                  </button>
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="mt-5 space-y-4">
                  {segments.map((segment) => {
                    const segmentItems = selectedDay.items.filter(
                      (it) => getSegmentForTime(it.startTime) === segment.key
                    );

                    return (
                      <div
                        key={segment.key}
                        className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: segment.color }}
                            />
                            <div>
                              <h4 className="theme-heading text-sm font-semibold">{segment.label}</h4>
                              <p className="theme-muted text-xs">{segment.range}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => openSegmentDrawer(selectedDay.key, segment.key)}
                            className="theme-button-secondary rounded-full p-1.5"
                            aria-label={`Add to ${segment.label}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {segmentItems.length === 0 ? (
                          <button
                            onClick={() => openSegmentDrawer(selectedDay.key, segment.key)}
                            className="mt-3 flex w-full items-center justify-between rounded-[18px] border border-dashed border-white/[0.1] bg-white/[0.015] px-4 py-4 text-left text-sm transition hover:border-[#ff5630]/40 hover:text-[#ff7352]"
                          >
                            <span className="theme-muted text-xs">Nothing planned here — tap to add</span>
                            <Plus className="h-3.5 w-3.5 text-white/25" />
                          </button>
                        ) : (
                          <SortableContext items={segmentItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="mt-3 space-y-2">
                              {segmentItems.map((item) => (
                                <SortableItem
                                  key={item.id}
                                  item={item}
                                  dayKey={selectedDay.key}
                                  travelers={travelerCount}
                                  onRemove={onRemoveItem}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DndContext>
            </>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ff5630]/10">
                <CalendarDays className="h-10 w-10 text-[#ff5630]" />
              </div>
              <h3 className="theme-heading mt-6 text-xl font-semibold">Board is empty</h3>
              <p className="theme-muted mx-auto mt-3 max-w-sm text-sm leading-6">
                Set start and end dates in the overview, then add your first item to generate the daily board.
              </p>
            </div>
          )}
        </div>

        {/* ── Right: route summary ── */}
        <aside className="space-y-4">

          {/* budget chart */}
          <div className="theme-panel rounded-[28px] p-5 shadow-xl">
            <p className="theme-label text-xs uppercase tracking-[0.24em]">Budget</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <h3 className="theme-heading text-xl font-semibold">
                ${totals.totalCost.toLocaleString()}
                <span className="theme-subtle ml-1 text-sm font-normal">spent</span>
              </h3>
              <span className={`text-sm font-semibold ${overBudget ? "text-[#ff8a78]" : "text-[#4ade80]"}`}>
                {overBudget ? "-" : "+"}${Math.abs(totals.remainingBudget).toLocaleString()} {overBudget ? "over" : "left"}
              </span>
            </div>

            {/* master progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full transition-all ${overBudget ? "bg-[#ff5630]" : "bg-[#4ade80]"}`}
                style={{ width: `${Math.min(totals.budgetPercentage, 100)}%` }}
              />
            </div>
            <p className="theme-muted mt-1 text-xs">
              {Math.round(totals.budgetPercentage)}% of ${totalBudget.toLocaleString()} budget
            </p>

            {/* stacked breakdown bar */}
            {budgetTotal > 0 && (
              <div className="mt-4">
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  {(["accommodation", "activity", "transport", "dining"] as const).map((cat) => {
                    const pct = (budgetBreakdown[cat] / budgetTotal) * 100;
                    if (pct < 1) return null;
                    return (
                      <div
                        key={cat}
                        className={BUDGET_COLORS[cat].bg}
                        style={{ width: `${pct}%` }}
                        title={`${BUDGET_COLORS[cat].label}: $${budgetBreakdown[cat]}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {(["accommodation", "activity", "transport", "dining"] as const).map((cat) => (
                    <div key={cat} className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 theme-muted">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BUDGET_COLORS[cat].hex }} />
                        {BUDGET_COLORS[cat].label}
                      </span>
                      <span className="theme-heading font-medium">
                        ${budgetBreakdown[cat].toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* route stats */}
          <div className="theme-panel rounded-[28px] p-5 shadow-xl">
            <p className="theme-label text-xs uppercase tracking-[0.24em]">Route pulse</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { label: "Days",        value: days.length              },
                { label: "Destinations", value: totals.destinations     },
                { label: "Stays",        value: counts.stays            },
                { label: "Experiences",  value: counts.activities       },
                { label: "Transfers",    value: counts.transport        },
                { label: "Dining",       value: counts.dining           },
              ].map(({ label, value }) => (
                <div key={label} className="theme-card-soft rounded-[18px] p-3 text-center">
                  <div className="theme-heading text-xl font-bold">{value}</div>
                  <div className="theme-muted mt-0.5 text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Book itinerary CTA */}
          {items.length > 0 && (
            <div className="theme-panel rounded-[28px] p-5 shadow-xl border border-[#ff5630]/20">
              <p className="theme-label text-xs uppercase tracking-[0.24em]">Ready to book?</p>
              <h3 className="theme-heading mt-2 text-lg font-semibold">Take this itinerary to checkout</h3>
              <p className="theme-muted mt-2 text-xs leading-5">
                All {items.length} planned item{items.length !== 1 ? "s" : ""} will be added to your cart so you can review and confirm them together.
              </p>
              <button
                onClick={onBookItinerary}
                className="mt-4 w-full rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Book this itinerary
              </button>
            </div>
          )}

          {/* action buttons */}
          <div className="theme-panel rounded-[28px] p-5 shadow-xl space-y-2.5">
            <p className="theme-label text-xs uppercase tracking-[0.24em] mb-3">Actions</p>
            <button
              onClick={onShare}
              className="theme-button-secondary flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              <Copy className="h-4 w-4" />
              Share itinerary
            </button>
            <button
              onClick={onExport}
              className="theme-button-secondary flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              onClick={onReset}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white/40 hover:bg-white/[0.04] transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear planner
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}
