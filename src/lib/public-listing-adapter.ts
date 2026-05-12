import type { PublicListingRecord } from "@/types/platform";
import type { PlannerCatalogItem, PlannerItemType, TripPlannerItem } from "@/types/trip-planner";

function inferPlannerType(listing: PublicListingRecord): PlannerItemType {
  const listingType = listing.listingType.toLowerCase();
  const category = listing.category.toLowerCase();

  if (listingType.includes("transport") || category.includes("transport")) {
    return "transport";
  }
  if (
    listingType.includes("accommodation") ||
    listingType.includes("stay") ||
    category.includes("accommodation") ||
    category.includes("hotel") ||
    category.includes("lodge")
  ) {
    return "accommodation";
  }
  if (listingType.includes("dining") || category.includes("dining")) {
    return "dining";
  }
  return "activity";
}

function inferPriceUnit(type: PlannerItemType, listing: PublicListingRecord) {
  if (type === "accommodation") return "/night";
  if (listing.pricingModel === "per_person") return "per person";
  if (listing.pricingModel === "per_vehicle") return "per vehicle";
  return "per service";
}

function inferDuration(listing: PublicListingRecord) {
  const metadata = listing.metadata as Record<string, unknown>;
  const duration = metadata.duration;
  return typeof duration === "string" ? duration : undefined;
}

function inferHighlights(listing: PublicListingRecord) {
  if (listing.amenities.length > 0) {
    return listing.amenities;
  }

  const metadata = listing.metadata as Record<string, unknown>;
  const highlights = metadata.highlights;
  return Array.isArray(highlights)
    ? highlights.filter((value): value is string => typeof value === "string")
    : [];
}

export function publicListingToPlannerCatalogItem(
  listing: PublicListingRecord
): PlannerCatalogItem {
  const type = inferPlannerType(listing);
  const highlights = inferHighlights(listing);
  const image = listing.images[0] || "/images/background.png";

  return {
    id: listing.slug,
    name: listing.title,
    type,
    category: listing.category,
    location: listing.location,
    price: listing.basePrice ? `$${listing.basePrice}` : "Quote",
    priceUnit: inferPriceUnit(type, listing),
    rating: listing.provider.hasVerifiedBadge ? 4.8 : 4.5,
    reviews: listing.bookingsCount || 0,
    image,
    description: listing.shortDescription || listing.description,
    duration: inferDuration(listing),
    amenities: listing.amenities,
    highlights,
    difficulty:
      typeof listing.metadata.difficulty === "string"
        ? (listing.metadata.difficulty as string)
        : undefined,
    groupSize:
      typeof listing.metadata.groupSize === "string"
        ? (listing.metadata.groupSize as string)
        : undefined,
    maxGuests: listing.capacity || undefined,
    availability: listing.status === "active" ? "Available" : "Verified",
    featured: listing.provider.hasVerifiedBadge || listing.bookingMode === "instant",
  };
}

function getDefaultEndTime(startTime: string, type: PlannerItemType) {
  const [hourString] = startTime.split(":");
  const hour = Number(hourString);
  const durationHours =
    type === "accommodation" ? 18 : type === "transport" ? 2 : 3;
  const endHour = Math.min(hour + durationHours, 23);
  return `${String(endHour).padStart(2, "0")}:00`;
}

export function plannerCatalogToTripPlannerItem(
  item: PlannerCatalogItem,
  overrides: Partial<TripPlannerItem> = {}
): TripPlannerItem {
  const startTime = overrides.startTime ?? "09:00";
  const quantity = overrides.quantity ?? 1;
  const unitCost =
    overrides.unitCost ??
    (item.price === "Quote" ? 0 : Number(item.price.replace(/[^0-9.]/g, "")));
  const pricingUnit =
    overrides.pricingUnit ?? (item.priceUnit.replace(/^\//, "") || "item");

  return {
    id: overrides.id ?? `${item.type}-${item.id}-${Date.now()}`,
    sourceId: item.id,
    title: item.name,
    type: item.type,
    location: item.location,
    date: overrides.date ?? new Date().toISOString().slice(0, 10),
    endDate: overrides.endDate,
    startTime,
    endTime: overrides.endTime ?? getDefaultEndTime(startTime, item.type),
    duration:
      overrides.duration ??
      item.duration ??
      (item.type === "accommodation" ? "1 night" : "Flexible"),
    cost: overrides.cost ?? unitCost * quantity,
    unitCost,
    quantity,
    pricingUnit,
    maxGuests: overrides.maxGuests ?? item.maxGuests,
    description: overrides.description ?? item.description,
    rating: overrides.rating ?? item.rating,
    image: overrides.image ?? item.image,
    category: overrides.category ?? item.category,
  };
}
