"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  Clock3,
  MapPin,
  MoonStar,
  Search,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { addDays } from "@/lib/trip-planner/planner";
import { tripPlannerCatalog } from "@/lib/trip-planner/catalog";
import {
  PlannerCatalogItem,
  PlannerItemType,
  PlannerScheduleDefaults,
  TripPlannerItem,
} from "@/types/trip-planner";

interface PlannerAddDrawerProps {
  isOpen: boolean;
  defaults?: PlannerScheduleDefaults;
  minDate?: string;
  maxDate?: string;
  onClose: () => void;
  onAddItem: (
    item: PlannerCatalogItem,
    overrides?: Partial<TripPlannerItem>
  ) => TripPlannerItem;
}

const typeFilters: Array<{
  key: PlannerItemType | "all";
  label: string;
  icon: typeof Sparkles;
}> = [
  { key: "all", label: "All", icon: Sparkles },
  { key: "accommodation", label: "Stays", icon: BedDouble },
  { key: "activity", label: "Experiences", icon: Sparkles },
  { key: "transport", label: "Transport", icon: Ticket },
  { key: "dining", label: "Dining", icon: UtensilsCrossed },
];

function getDefaultSchedule(defaults?: PlannerScheduleDefaults) {
  return {
    date: defaults?.date || new Date().toISOString().slice(0, 10),
    startTime: defaults?.startTime || "09:00",
    endTime: defaults?.endTime || "12:00",
    quantity: 1,
  };
}

function clampDate(value: string, minDate?: string, maxDate?: string) {
  if (minDate && value < minDate) return minDate;
  if (maxDate && value > maxDate) return maxDate;
  return value;
}

function getInclusiveDateSpan(start: string, end?: string) {
  if (!end || end < start) return undefined;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function getTypeDefaults(type: PlannerItemType) {
  switch (type) {
    case "accommodation":
      return { startTime: "14:00", endTime: "10:00" };
    case "transport":
      return { startTime: "08:00", endTime: "12:00" };
    case "dining":
      return { startTime: "19:00", endTime: "21:00" };
    default:
      return { startTime: "09:00", endTime: "12:00" };
  }
}

export default function PlannerAddDrawer({
  isOpen,
  defaults,
  minDate,
  maxDate,
  onClose,
  onAddItem,
}: PlannerAddDrawerProps) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<PlannerItemType | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(getDefaultSchedule(defaults));

  useEffect(() => {
    if (!isOpen) return;
    const nextSchedule = getDefaultSchedule(defaults);
    const nextDate = clampDate(nextSchedule.date, minDate, maxDate);
    const maxQuantity = getInclusiveDateSpan(nextDate, maxDate);
    setSchedule({
      ...nextSchedule,
      date: nextDate,
      quantity: maxQuantity
        ? Math.min(nextSchedule.quantity, maxQuantity)
        : nextSchedule.quantity,
    });
  }, [defaults, isOpen, maxDate, minDate]);

  const filteredItems = useMemo(() => {
    return tripPlannerCatalog.filter((item) => {
      const matchesType = selectedType === "all" || item.type === selectedType;
      const search = query.trim().toLowerCase();
      const matchesQuery =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.location.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search);

      return matchesType && matchesQuery;
    });
  }, [query, selectedType]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ||
    tripPlannerCatalog.find((item) => item.id === selectedId) ||
    null;

  useEffect(() => {
    if (!selectedItem) return;
    const typeDefaults = getTypeDefaults(selectedItem.type);
    const hasTimeBlockDefault = Boolean(defaults?.startTime || defaults?.endTime);
    setSchedule((current) => ({
      ...current,
      startTime:
        selectedItem.type === "accommodation" || !hasTimeBlockDefault
          ? typeDefaults.startTime
          : current.startTime,
      endTime:
        selectedItem.type === "accommodation" || !hasTimeBlockDefault
          ? typeDefaults.endTime
          : current.endTime,
      quantity: selectedItem.type === "accommodation" ? Math.max(1, current.quantity) : 1,
    }));
  }, [defaults?.endTime, defaults?.startTime, selectedItem]);

  const quantityLabel =
    selectedItem?.type === "accommodation" ? "Nights" : "Quantity";
  const computedEndDate =
    selectedItem?.type === "accommodation"
      ? clampDate(addDays(schedule.date, Math.max(schedule.quantity - 1, 0)), minDate, maxDate)
      : schedule.date;
  const unitCost = selectedItem
    ? Number(selectedItem.price.replace(/[^0-9.]/g, ""))
    : 0;
  const computedCost =
    selectedItem?.type === "accommodation"
      ? unitCost * Math.max(schedule.quantity, 1)
      : unitCost;

  const handleAdd = () => {
    if (!selectedItem) return;

    onAddItem(selectedItem, {
      date: schedule.date,
      endDate: selectedItem.type === "accommodation" ? computedEndDate : schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      quantity: selectedItem.type === "accommodation" ? Math.max(schedule.quantity, 1) : 1,
      unitCost,
      cost: computedCost,
      pricingUnit:
        selectedItem.type === "accommodation"
          ? "night"
          : selectedItem.priceUnit.replace(/^\//, "") || "item",
      duration:
        selectedItem.type === "accommodation"
          ? `${Math.max(schedule.quantity, 1)} night${schedule.quantity === 1 ? "" : "s"}`
          : selectedItem.duration || selectedItem.priceUnit,
    });
    onClose();
    setSelectedId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[#f7f2ee] shadow-2xl dark:bg-[#090909] lg:inset-y-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[min(980px,92vw)] lg:rounded-none lg:rounded-l-[32px]">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10 md:px-6">
          <div>
            <p className="theme-label text-xs uppercase tracking-[0.24em]">
              Add to itinerary
            </p>
            <h3 className="theme-heading mt-1 text-xl font-semibold">
              Choose the next moment in the journey
            </h3>
          </div>
          <button
            onClick={onClose}
            className="theme-button-secondary rounded-full p-2"
            aria-label="Close add drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-black/10 px-5 py-3 dark:border-white/10 md:px-6 lg:hidden">
          <div className="theme-card-soft rounded-[20px] px-4 py-3">
            <div className="theme-label text-[11px] uppercase tracking-[0.22em]">
              Mobile planner
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="theme-heading truncate text-sm font-semibold">
                  {selectedItem ? selectedItem.name : "Select an item to continue"}
                </div>
                <div className="theme-muted mt-1 text-xs">
                  {selectedItem
                    ? `${schedule.date}${selectedItem.type === "accommodation" ? ` to ${computedEndDate}` : ` at ${schedule.startTime}`}`
                    : "Choose a stay, experience, transfer, or dining moment."}
                </div>
              </div>
              <div className="theme-heading shrink-0 text-sm font-semibold">
                {selectedItem ? `$${computedCost}` : "--"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="order-1 flex min-h-0 flex-1 flex-col border-b border-black/10 dark:border-white/10 lg:order-1 lg:border-b-0 lg:border-r">
            <div className="border-b border-black/10 px-5 py-4 dark:border-white/10 md:px-6">
              <div className="theme-input flex h-12 items-center gap-3 rounded-[18px] px-4">
                <Search className="theme-subtle h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search stays, experiences, transport, or dining"
                  className="h-full w-full bg-transparent text-sm outline-none"
                />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {typeFilters.map((filter) => {
                  const Icon = filter.icon;
                  const active = selectedType === filter.key;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedType(filter.key)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "border-[#ff5630] bg-[#ff5630] text-white"
                          : "theme-chip"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-visible px-5 py-5 pb-28 md:px-6 lg:overflow-y-auto lg:pb-5">
              <div className="grid gap-3 md:grid-cols-2">
                {filteredItems.map((item) => {
                  const active = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                      }}
                      className={`overflow-hidden rounded-[24px] border text-left transition ${
                        active
                          ? "border-[#ff5630] bg-[#fff1eb] dark:border-[#ff7352] dark:bg-[#21120f]"
                          : "theme-card-soft"
                      }`}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-40 w-full object-cover"
                      />
                      <div className="p-4">
                        <div className="theme-label text-xs uppercase tracking-[0.22em]">
                          {item.category}
                        </div>
                        <h4 className="theme-heading mt-2 text-lg font-semibold">
                          {item.name}
                        </h4>
                        <div className="theme-muted mt-2 flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          {item.location}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="theme-muted">
                            {item.duration || item.priceUnit}
                          </span>
                          <span className="theme-heading font-semibold">
                            {item.price}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredItems.length === 0 ? (
                <div className="theme-card-soft mt-3 rounded-[24px] p-6 text-center">
                  <h4 className="theme-heading text-lg font-semibold">
                    Nothing matched that search
                  </h4>
                  <p className="theme-muted mt-2 text-sm">
                    Try a different destination, category, or simpler keyword.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="order-2 flex w-full flex-col border-b border-black/10 dark:border-white/10 lg:order-2 lg:w-[360px] lg:overflow-hidden lg:border-b-0">
            <div className="flex-1 overflow-y-visible px-5 py-5 md:px-6 lg:overflow-y-auto">
              <div className="theme-card rounded-[28px] p-5">
                <p className="theme-label text-xs uppercase tracking-[0.24em]">
                  Schedule
                </p>
                <h4 className="theme-heading mt-2 text-lg font-semibold">
                  Place it in the trip
                </h4>

                <div className="mt-5 space-y-4">
                  <label className="block space-y-2">
                    <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
                      <CalendarDays className="h-4 w-4" />
                      Start date
                    </span>
                    <input
                      type="date"
                      min={minDate}
                      max={maxDate}
                      value={schedule.date}
                      onChange={(event) =>
                        setSchedule((current) => ({
                          ...current,
                          date: clampDate(event.target.value, minDate, maxDate),
                        }))
                      }
                      className="theme-input h-12 w-full rounded-[18px] px-4"
                    />
                  </label>

                  {selectedItem?.type === "accommodation" ? (
                    <label className="block space-y-2">
                      <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
                        <MoonStar className="h-4 w-4" />
                        {quantityLabel}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={getInclusiveDateSpan(schedule.date, maxDate)}
                        value={schedule.quantity}
                        onChange={(event) =>
                          setSchedule((current) => ({
                            ...current,
                            quantity: Math.min(
                              getInclusiveDateSpan(current.date, maxDate) ?? Number.MAX_SAFE_INTEGER,
                              Math.max(1, Number(event.target.value) || 1)
                            ),
                          }))
                        }
                        className="theme-input h-12 w-full rounded-[18px] px-4"
                      />
                    </label>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <label className="block space-y-2">
                      <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
                        <Clock3 className="h-4 w-4" />
                        {selectedItem?.type === "accommodation" ? "Check-in time" : "Start time"}
                      </span>
                      <input
                        type="time"
                        value={schedule.startTime}
                        onChange={(event) =>
                          setSchedule((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        className="theme-input h-12 w-full rounded-[18px] px-4"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
                        <Clock3 className="h-4 w-4" />
                        {selectedItem?.type === "accommodation" ? "Check-out time" : "End time"}
                      </span>
                      <input
                        type="time"
                        value={schedule.endTime}
                        onChange={(event) =>
                          setSchedule((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        className="theme-input h-12 w-full rounded-[18px] px-4"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="theme-card-soft mt-4 hidden rounded-[28px] p-5 lg:block">
                <p className="theme-label text-xs uppercase tracking-[0.24em]">
                  Summary
                </p>
                {selectedItem ? (
                  <>
                    <h4 className="theme-heading mt-2 text-lg font-semibold">
                      {selectedItem.name}
                    </h4>
                    <p className="theme-muted mt-2 text-sm leading-6">
                      {selectedItem.description}
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="theme-muted flex items-center justify-between gap-3">
                        <span>Location</span>
                        <span className="theme-heading">{selectedItem.location}</span>
                      </div>
                      <div className="theme-muted flex items-center justify-between gap-3">
                        <span>Category</span>
                        <span className="theme-heading">{selectedItem.category}</span>
                      </div>
                      <div className="theme-muted flex items-center justify-between gap-3">
                        <span>Range</span>
                        <span className="theme-heading">
                          {schedule.date}
                          {selectedItem.type === "accommodation"
                            ? ` to ${computedEndDate}`
                            : ""}
                        </span>
                      </div>
                      <div className="theme-muted flex items-center justify-between gap-3">
                        <span>Cost</span>
                        <span className="theme-heading">${computedCost}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="theme-muted mt-3 text-sm leading-6">
                    Select a card to preview the details and place it on the
                    itinerary.
                  </div>
                )}
              </div>
            </div>

            <div
              id="planner-mobile-footer"
              className="border-t border-black/10 bg-[#f7f2ee]/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#090909]/95 md:px-6"
            >
              <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
                <div className="min-w-0">
                  <div className="theme-heading truncate text-sm font-semibold">
                    {selectedItem ? selectedItem.name : "No item selected"}
                  </div>
                  <div className="theme-muted mt-1 text-xs">
                    {selectedItem
                      ? `${schedule.date}${selectedItem.type === "accommodation" ? ` to ${computedEndDate}` : ` at ${schedule.startTime}`}`
                      : "Select a card above to enable the add action."}
                  </div>
                </div>
                <div className="theme-heading shrink-0 text-sm font-semibold">
                  {selectedItem ? `$${computedCost}` : "--"}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  className="theme-button-secondary flex-1 rounded-full px-5 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseUp={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAdd();
                  }}
                  disabled={!selectedItem}
                  className="flex-1 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add to itinerary
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
