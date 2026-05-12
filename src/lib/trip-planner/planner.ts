import { PlannerItemType, TripPlannerItem, TripPlannerMeta } from "@/types/trip-planner";

export type PlannerSectionId = "overview" | "board";
export type DaySegment = "morning" | "afternoon" | "evening";

// ─── Logistics gap detection ──────────────────────────────────────────────────

export type GapSeverity = "warning" | "info";

export interface LogisticsGap {
  /** ISO date of the day where the gap originates */
  date: string;
  /** Human-readable label for the day */
  dayLabel: string;
  severity: GapSeverity;
  message: string;
}

function timeToMinutes(time?: string) {
  if (!time) return null;
  const [hour, minute] = time.split(":").map((value) => Number(value));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function getTimedRange(item: TripPlannerItem, dayKey: string) {
  const start = item.date === dayKey ? timeToMinutes(item.startTime) : 0;
  const end = (item.endDate || item.date) === dayKey ? timeToMinutes(item.endTime) : 24 * 60;

  if (start === null || end === null) return null;

  return {
    start,
    end: end <= start && !item.endDate ? end + 24 * 60 : end,
  };
}

function getPrimaryLocation(items: TripPlannerItem[]) {
  return items.find((item) => item.type !== "transport")?.location || items[0]?.location || "";
}

function normaliseLocation(location: string) {
  return location.trim().toLowerCase();
}

function hasTransport(items: TripPlannerItem[]) {
  return items.some((item) => item.type === "transport");
}

function locationWords(location: string) {
  return normaliseLocation(location)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !["from", "into", "with", "park"].includes(word));
}

function textMentionsLocation(text: string, location: string) {
  const words = locationWords(location);
  if (!words.length) return false;
  const normalizedText = normaliseLocation(text);
  return words.some((word) => normalizedText.includes(word));
}

function transportConnectsLocations(
  item: TripPlannerItem,
  fromLocation: string,
  toLocation: string
) {
  if (item.type !== "transport") return false;
  const text = `${item.title} ${item.category} ${item.location} ${item.description}`;
  return textMentionsLocation(text, fromLocation) && textMentionsLocation(text, toLocation);
}

function isDepartureTransport(item: TripPlannerItem) {
  const text = `${item.title} ${item.category} ${item.description}`.toLowerCase();
  return (
    item.type === "transport" &&
    ["flight", "airport", "bus", "coach", "shuttle", "taxi", "transfer"].some((token) =>
      text.includes(token)
    )
  );
}

function isOutdoorOrWeatherSensitive(item: TripPlannerItem) {
  const text = `${item.title} ${item.category} ${item.description}`.toLowerCase();
  return [
    "safari",
    "game drive",
    "rafting",
    "hike",
    "hiking",
    "walking",
    "canoe",
    "canoeing",
    "outdoor",
    "falls",
    "wildlife",
    "camp",
    "national park",
  ].some((token) => text.includes(token));
}

function needsPermitOrParkFee(item: TripPlannerItem) {
  const text = `${item.title} ${item.category} ${item.location} ${item.description}`.toLowerCase();
  return [
    "national park",
    "mana pools",
    "hwange",
    "matobo",
    "gonarezhou",
    "victoria falls",
    "zambezi",
    "safari",
    "game drive",
  ].some((token) => text.includes(token));
}

function isRainySeason(dateKey: string) {
  const month = Number(dateKey.slice(5, 7));
  return month >= 11 || month <= 3;
}

function isFullDayOrLongItem(item: TripPlannerItem, dayKey: string) {
  const range = getTimedRange(item, dayKey);
  const durationText = item.duration.toLowerCase();
  return (
    durationText.includes("full day") ||
    durationText.includes("8 hours") ||
    durationText.includes("full-day") ||
    (range ? range.end - range.start >= 5 * 60 : false)
  );
}

function addGap(
  gaps: LogisticsGap[],
  seen: Set<string>,
  gap: LogisticsGap
) {
  const key = `${gap.date}|${gap.severity}|${gap.message}`;
  if (seen.has(key)) return;
  seen.add(key);
  gaps.push(gap);
}

/**
 * Analyse a list of planner items and return any logistics gaps the traveller
 * should be aware of before confirming their itinerary.
 *
 * Current rules:
 * 1. Location jump without transport — consecutive days where the accommodation
 *    or activity location changes but no transport item bridges the gap.
 * 2. No accommodation on a night — a day has activities/dining but no
 *    accommodation and isn't the last day of the trip.
 * 3. Long travel day — a transport item exists but no other activities, leaving
 *    the day otherwise empty.
 */
export function detectLogisticsGaps(
  items: TripPlannerItem[],
  meta: TripPlannerMeta
): LogisticsGap[] {
  const days = getPlannerDays(items, meta);
  const gaps: LogisticsGap[] = [];
  const seen = new Set<string>();
  const travelers = Math.max(meta.travelers || 1, 1);

  if (!days.length) return gaps;

  days.forEach((day, dayIndex) => {
    const timedItems = day.items
      .filter((item) => item.type !== "accommodation")
      .map((item) => ({ item, range: getTimedRange(item, day.key) }))
      .filter((entry): entry is { item: TripPlannerItem; range: { start: number; end: number } } =>
        Boolean(entry.range)
      )
      .sort((a, b) => a.range.start - b.range.start);

    timedItems.forEach((entry, index) => {
      const { item, range } = entry;

      if (item.maxGuests && travelers > item.maxGuests * Math.max(item.quantity || 1, 1)) {
        addGap(gaps, seen, {
          date: day.key,
          dayLabel: day.shortLabel,
          severity: "warning",
          message: `${item.title} appears to allow up to ${item.maxGuests} guest${item.maxGuests === 1 ? "" : "s"} per booking. Your group has ${travelers}; add capacity, another room, or a second booking.`,
        });
      }

      if (isRainySeason(day.key) && isOutdoorOrWeatherSensitive(item)) {
        addGap(gaps, seen, {
          date: day.key,
          dayLabel: day.shortLabel,
          severity: "info",
          message: `${item.title} may be weather-sensitive during Zimbabwe's rainy season. Confirm conditions, gear, and cancellation rules before travel.`,
        });
      }

      if (needsPermitOrParkFee(item)) {
        addGap(gaps, seen, {
          date: day.key,
          dayLabel: day.shortLabel,
          severity: "info",
          message: `${item.title} may require park fees, permits, or conservation access rules. Confirm what is included before booking.`,
        });
      }

      const next = timedItems[index + 1];
      if (!next) return;

      const gapMinutes = next.range.start - range.end;
      const differentLocation =
        normaliseLocation(item.location) !== normaliseLocation(next.item.location);
      const includesTransport = item.type === "transport" || next.item.type === "transport";

      if (range.end > next.range.start) {
        addGap(gaps, seen, {
          date: day.key,
          dayLabel: day.shortLabel,
          severity: "warning",
          message: `${item.title} overlaps with ${next.item.title}. Adjust the times so the bookings do not clash.`,
        });
      } else if (gapMinutes < (differentLocation || includesTransport ? 60 : 30)) {
        addGap(gaps, seen, {
          date: day.key,
          dayLabel: day.shortLabel,
          severity: "warning",
          message: `Only ${Math.max(gapMinutes, 0)} minutes between ${item.title} and ${next.item.title}. Add transfer time or move one item later.`,
        });
      }
    });

    const nonTransportLocations = Array.from(
      new Set(
        day.items
          .filter((item) => item.type !== "transport")
          .map((item) => item.location.trim())
          .filter(Boolean)
      )
    );

    if (nonTransportLocations.length > 1 && !hasTransport(day.items)) {
      addGap(gaps, seen, {
        date: day.key,
        dayLabel: day.shortLabel,
        severity: "warning",
        message: `Plans span ${nonTransportLocations.slice(0, 2).join(" and ")} on the same day, but no transport is scheduled between them.`,
      });
    }

    const hasDining = day.items.some((item) => item.type === "dining");
    const hasLongPlan = day.items.some((item) =>
      (item.type === "activity" || item.type === "transport") && isFullDayOrLongItem(item, day.key)
    );
    if (hasLongPlan && !hasDining) {
      addGap(gaps, seen, {
        date: day.key,
        dayLabel: day.shortLabel,
        severity: "info",
        message: `This looks like a long travel or activity day with no dining plan. Add a meal stop or confirm meals are included.`,
      });
    }

    const lateItemAwayFromStay = day.items.find((item) => {
      const range = getTimedRange(item, day.key);
      if (!range || range.end < 21 * 60 || item.type === "accommodation") return false;
      const stay = day.items.find((candidate) => candidate.type === "accommodation");
      return stay && normaliseLocation(stay.location) !== normaliseLocation(item.location);
    });
    if (lateItemAwayFromStay && !hasTransport(day.items)) {
      addGap(gaps, seen, {
        date: day.key,
        dayLabel: day.shortLabel,
        severity: "warning",
        message: `${lateItemAwayFromStay.title} ends late away from your stay. Add a taxi or private transfer for the return.`,
      });
    }

    const endingStay = day.items.find(
      (item) => item.type === "accommodation" && item.endDate === day.key
    );
    const startingStay = day.items.find(
      (item) => item.type === "accommodation" && item.date === day.key && item.id !== endingStay?.id
    );
    if (endingStay && startingStay) {
      addGap(gaps, seen, {
        date: day.key,
        dayLabel: day.shortLabel,
        severity: "info",
        message: `You check out of ${endingStay.title} and into ${startingStay.title} on the same day. Confirm luggage storage or add a daytime activity between stays.`,
      });
    }

    const hasStay = day.items.some((item) => item.type === "accommodation");
    const hasActivities = day.items.some(
      (item) => item.type === "activity" || item.type === "dining"
    );

    if (dayIndex === 0 && day.items.some((item) => item.type === "transport") && !hasStay) {
      addGap(gaps, seen, {
        date: day.key,
        dayLabel: day.shortLabel,
        severity: "warning",
        message: `Your arrival day has transport but no first-night stay. Add accommodation so the trip has a clear landing point.`,
      });
    }

    if (!hasStay && hasActivities && dayIndex < days.length - 1) {
      addGap(gaps, seen, {
        date: day.key,
        dayLabel: day.shortLabel,
        severity: "info",
        message: `No accommodation booked for the night of ${day.shortLabel}.`,
      });
    }

    if (
      dayIndex === days.length - 1 &&
      day.items.length > 0 &&
      !day.items.some(isDepartureTransport)
    ) {
      addGap(gaps, seen, {
        date: day.key,
        dayLabel: day.shortLabel,
        severity: "info",
        message: `No departure transport is planned for the final day. Add an airport transfer, bus, taxi, or flight if needed.`,
      });
    }
  });

  for (let i = 0; i < days.length - 1; i++) {
    const today = days[i];
    const tomorrow = days[i + 1];

    const todayLocations = new Set(
      today.items
        .filter((it) => it.type !== "transport")
        .map((it) => it.location.trim().toLowerCase())
    );
    const tomorrowLocations = new Set(
      tomorrow.items
        .filter((it) => it.type !== "transport")
        .map((it) => it.location.trim().toLowerCase())
    );

    // Check for location change
    const locationsOverlap = [...todayLocations].some((loc) => tomorrowLocations.has(loc));
    const hasLocationChange =
      todayLocations.size > 0 &&
      tomorrowLocations.size > 0 &&
      !locationsOverlap;

    if (hasLocationChange) {
      // Check whether any transport item on today or tomorrow bridges the gap
      const fromLoc = getPrimaryLocation(today.items) || [...todayLocations][0];
      const toLoc = getPrimaryLocation(tomorrow.items) || [...tomorrowLocations][0];
      const bridgeTransport = [...today.items, ...tomorrow.items].some((item) =>
        transportConnectsLocations(item, fromLoc, toLoc)
      );

      if (!bridgeTransport) {
        addGap(gaps, seen, {
          date: tomorrow.key,
          dayLabel: tomorrow.shortLabel,
          severity: "warning",
          message: `No transport from ${capitalise(fromLoc)} to ${capitalise(toLoc)}. Add a bus, taxi, or flight to bridge this gap.`,
        });
      }
    }
  }

  return gaps;
}

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export interface PlannerDay {
  key: string;
  label: string;
  shortLabel: string;
  items: TripPlannerItem[];
}

function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: string, count: number) {
  const date = parseDateInput(value);
  date.setUTCDate(date.getUTCDate() + count);
  return formatDateKey(date);
}

export function enumerateDates(start: string, end: string) {
  const dates: string[] = [];
  const cursor = parseDateInput(start);
  const finalDate = parseDateInput(end);

  while (cursor <= finalDate) {
    dates.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function getSegmentForTime(time: string): DaySegment {
  const hour = Number(time.split(":")[0] || 0);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function getItemRange(item: TripPlannerItem) {
  return {
    start: item.date,
    end: item.endDate || item.date,
  };
}

export function itemTouchesDate(item: TripPlannerItem, dateKey: string) {
  const range = getItemRange(item);
  return dateKey >= range.start && dateKey <= range.end;
}

export function itemTouchesTripWindow(
  item: TripPlannerItem,
  meta: TripPlannerMeta
) {
  const range = getItemRange(item);

  if (meta.startDate && range.end < meta.startDate) return false;
  if (meta.endDate && range.start > meta.endDate) return false;

  return true;
}

export function getItemsInTripWindow(
  items: TripPlannerItem[],
  meta: TripPlannerMeta
) {
  if (!meta.startDate && !meta.endDate) return items;
  return items.filter((item) => itemTouchesTripWindow(item, meta));
}

export function getPlannerDays(
  items: TripPlannerItem[],
  meta: TripPlannerMeta
): PlannerDay[] {
  const grouped = new Map<string, TripPlannerItem[]>();

  items
    .slice()
    .sort((a, b) => {
      const startCompare = a.date.localeCompare(b.date);
      if (startCompare !== 0) return startCompare;
      return a.startTime.localeCompare(b.startTime);
    })
    .forEach((item) => {
      const range = getItemRange(item);
      enumerateDates(range.start, range.end).forEach((dateKey) => {
        const current = grouped.get(dateKey) || [];
        current.push(item);
        grouped.set(dateKey, current);
      });
    });

  const firstGroupedDay = grouped.keys().next().value;
  const lastGroupedDay = Array.from(grouped.keys()).at(-1);
  const start = meta.startDate || firstGroupedDay;
  const end = meta.endDate || lastGroupedDay;

  if (!start || !end) return [];

  const days: PlannerDay[] = [];
  const excludedDates = new Set(meta.excludedDates || []);
  const cursor = parseDateInput(start);
  const endDate = parseDateInput(end);

  while (cursor <= endDate) {
    const key = formatDateKey(cursor);
    if (!excludedDates.has(key)) {
      days.push({
        key,
        label: cursor.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        shortLabel: cursor.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        items: (grouped.get(key) || []).slice().sort((a, b) => {
          if (a.type === "accommodation" && b.type !== "accommodation") return -1;
          if (a.type !== "accommodation" && b.type === "accommodation") return 1;
          return a.startTime.localeCompare(b.startTime);
        }),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export function getExpandedTripMeta(
  meta: TripPlannerMeta,
  item: TripPlannerItem
): Partial<TripPlannerMeta> {
  const nextStart =
    !meta.startDate || item.date < meta.startDate ? item.date : meta.startDate;
  const itemEnd = item.endDate || item.date;
  const nextEnd =
    !meta.endDate || itemEnd > meta.endDate ? itemEnd : meta.endDate;

  return {
    startDate: nextStart,
    endDate: nextEnd,
    excludedDates: (meta.excludedDates || []).filter((date) => date !== item.date),
  };
}

export function itemScalesWithTravelers(item: TripPlannerItem) {
  const pricingUnit = (item.pricingUnit || "").toLowerCase();

  if (item.type === "activity" || item.type === "dining") return true;
  if (item.type !== "transport") return false;

  return ["person", "ticket", "passenger", "seat"].some((token) =>
    pricingUnit.includes(token)
  );
}

export function getItemUnitCost(item: TripPlannerItem) {
  return item.unitCost ?? item.cost / Math.max(item.quantity ?? 1, 1);
}

export function getPricedItemCost(item: TripPlannerItem, travelers = 1) {
  if (!itemScalesWithTravelers(item)) return item.cost;
  return getItemUnitCost(item) * Math.max(travelers, 1);
}

export function getItemPricingLabel(item: TripPlannerItem, travelers = 1) {
  if (!itemScalesWithTravelers(item)) {
    return item.type === "accommodation"
      ? "Fixed stay cost"
      : "Fixed item cost";
  }

  const unitCost = getItemUnitCost(item);
  const travelerCount = Math.max(travelers, 1);
  return `${travelerCount} traveler${travelerCount === 1 ? "" : "s"} x $${unitCost}`;
}

export function getTripTotals(
  items: TripPlannerItem[],
  totalBudget: number,
  travelers = 1
) {
  const totalCost = items.reduce(
    (sum, item) => sum + getPricedItemCost(item, travelers),
    0
  );
  const remainingBudget = totalBudget - totalCost;
  const destinations = new Set(items.map((item) => item.location)).size;
  const categories = new Set(items.map((item) => item.type)).size;

  return {
    totalCost,
    remainingBudget,
    destinations,
    categories,
    budgetPercentage: totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0,
  };
}

export function getStatusTone(type: PlannerItemType) {
  switch (type) {
    case "accommodation":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";
    case "activity":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200";
    case "transport":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "dining":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    default:
      return "border-black/10 bg-black/[0.04] text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/70";
  }
}

export function getSectionCounts(items: TripPlannerItem[]) {
  return {
    stays: items.filter((item) => item.type === "accommodation").length,
    activities: items.filter((item) => item.type === "activity").length,
    transport: items.filter((item) => item.type === "transport").length,
    dining: items.filter((item) => item.type === "dining").length,
  };
}

export function getBudgetBreakdown(items: TripPlannerItem[], travelers = 1) {
  return items.reduce(
    (accumulator, item) => {
      accumulator[item.type] += getPricedItemCost(item, travelers);
      return accumulator;
    },
    {
      accommodation: 0,
      activity: 0,
      transport: 0,
      dining: 0,
    }
  );
}

export function getItemDateLabel(item: TripPlannerItem) {
  if (!item.endDate || item.endDate === item.date) {
    return item.date;
  }

  return `${item.date} to ${item.endDate}`;
}

export function getItemProgressLabel(item: TripPlannerItem, dayKey?: string) {
  if (!item.endDate || item.endDate === item.date) {
    return null;
  }

  const span = enumerateDates(item.date, item.endDate);
  const totalDays = span.length;

  if (!dayKey) {
    return `Day 1 of ${totalDays}`;
  }

  const dayIndex = span.indexOf(dayKey);
  if (dayIndex === -1) {
    return `Day 1 of ${totalDays}`;
  }

  return `Day ${dayIndex + 1} of ${totalDays}`;
}

export function getItemRangeLabel(item: TripPlannerItem, dayKey?: string) {
  const progressLabel = getItemProgressLabel(item, dayKey);
  if (progressLabel) {
    return progressLabel;
  }

  return item.duration;
}

export function getItemTimeLabel(item: TripPlannerItem, dayKey?: string) {
  const progressLabel = getItemProgressLabel(item, dayKey);

  if (!progressLabel) {
    if (item.type === "accommodation") {
      return `${item.startTime} check-in`;
    }
    return `${item.startTime} - ${item.endTime}`;
  }

  if (!item.endDate || !dayKey) {
    return `${item.startTime} check-in`;
  }

  if (dayKey === item.date) {
    return `${item.startTime} check-in`;
  }

  if (dayKey === item.endDate) {
    return `${item.endTime} check-out`;
  }

  return "Continuing stay";
}
