"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Trash2,
  Search,
  Star,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import type { ProviderListingRecord } from "@/types/platform";
import ListingImageManager from "@/components/uploads/ListingImageManager";
import {
  listingRequiresDestination,
} from "@/lib/listing-destination-rules";
import type { ExplorerDestinationSummary } from "@/lib/destination-explorer";
import { inferServiceGroup, serviceGroups } from "@/lib/taxonomy";

const initialForm = {
  title: "",
  category: "Experience",
  listingType: "game-drive",
  description: "",
  shortDescription: "",
  location: "",
  pricingModel: "per_service",
  basePrice: "",
  currency: "USD",
  bookingMode: "request",
  visibility: "private" as "private" | "public",
  status: "draft" as ProviderListingRecord["status"],
  destinationId: "",
  capacity: "",
};

// ── ListingCard ───────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: ProviderListingRecord;
  onToggleVisibility: (listing: ProviderListingRecord) => Promise<void>;
  onToggleStatus: (listing: ProviderListingRecord) => Promise<void>;
  onSaveAvailability: (
    listing: ProviderListingRecord,
    availability: ProviderListingRecord["availability"],
    capacity?: number | null
  ) => Promise<void>;
  onImagesUpdated: (images: string[]) => void;
}

function ListingCard({
  listing,
  onToggleVisibility,
  onToggleStatus,
  onSaveAvailability,
  onImagesUpdated,
}: ListingCardProps) {
  const [showPhotos, setShowPhotos] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState(
    listing.capacity ? String(listing.capacity) : ""
  );
  const [availabilityDraft, setAvailabilityDraft] = useState(
    listing.availability.map((slot) => ({
      ...slot,
      startDate: toDateTimeLocal(slot.startDate),
      endDate: toDateTimeLocal(slot.endDate),
    }))
  );

  const availableSlots = listing.availability.filter(
    (slot) => slot.status === "available"
  ).length;
  const listingGroup = inferServiceGroup(listing);
  const serviceSubtype =
    typeof listing.metadata.serviceSubtype === "string"
      ? listing.metadata.serviceSubtype
      : listing.listingType;

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      await onSaveAvailability(
        listing,
        availabilityDraft.map((slot) => ({
          ...slot,
          unitsAvailable:
            slot.unitsAvailable === null || slot.unitsAvailable === undefined
              ? null
              : Number(slot.unitsAvailable),
        })),
        capacityDraft ? Number(capacityDraft) : null
      );
      setShowAvailability(false);
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <article className="theme-panel rounded-[32px] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="theme-heading text-2xl font-semibold">{listing.title}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                listing.status === "active"
                  ? "bg-[#153220] text-[#8cf0a1]"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {listing.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="theme-muted mt-3 flex flex-wrap gap-3 text-sm">
            <span>{listingGroup.label}</span>
            <span>{String(serviceSubtype).replace(/-/g, " ")}</span>
            {listing.requiresDestination ? (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  listing.hasDestinationAssignment
                    ? "bg-[#153220] text-[#8cf0a1]"
                    : "bg-[#2d1714] text-[#ffb09c]"
                }`}
              >
                {listing.destinationName || "Destination needed"}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#ff7352]" />
              {listing.location}
            </span>
            <span className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 fill-[#ffc247] text-[#ffc247]" />
              {listing.bookingMode === "instant" ? "Instant booking" : "Booking request"}
            </span>
            <span>{listing.bookingsCount || 0} bookings</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <div className="theme-heading text-2xl font-semibold">
              {listing.basePrice ? `$${listing.basePrice}` : "Quote"}
            </div>
            <div className="theme-subtle text-sm">{listing.visibility}</div>
          </div>
          <button
            onClick={() => onToggleVisibility(listing)}
            className="theme-button-secondary rounded-full p-3"
            title={listing.visibility === "public" ? "Make private" : "Make public"}
          >
            {listing.visibility === "public" ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => onToggleStatus(listing)}
            className="theme-button-secondary rounded-full px-4 py-3 text-sm font-medium"
          >
            {listing.status === "active" ? "Pause" : "Publish"}
          </button>
          <button
            onClick={() => setShowPhotos((v) => !v)}
            className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium"
          >
            <Camera className="h-4 w-4" />
            Photos
            {showPhotos ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setShowAvailability((value) => !value)}
            className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Availability
            {showAvailability ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="theme-card-soft rounded-[24px] p-4 text-sm">
          {listing.shortDescription || "Add a concise storefront summary for this listing."}
        </div>
        <div className="theme-card-soft rounded-[24px] p-4 text-sm">
          {listing.visibility === "public"
            ? "Publicly discoverable on the marketplace."
            : "Private until the provider chooses to publish it."}
        </div>
        <div className="theme-card-soft rounded-[24px] p-4 text-sm">
          {availableSlots > 0
            ? `${availableSlots} available slot${availableSlots === 1 ? "" : "s"} configured.`
            : "Add availability before relying on instant booking."}
        </div>
      </div>

      {showAvailability ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="theme-heading text-lg font-semibold">Availability and capacity</h4>
              <p className="theme-muted mt-1 text-sm">
                Add the dates or time windows travelers can request or book.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setAvailabilityDraft((current) => [
                  ...current,
                  {
                    id: `new-${Date.now()}`,
                    startDate: "",
                    endDate: "",
                    unitsAvailable: listing.capacity ?? null,
                    status: "available",
                    notes: "",
                  },
                ])
              }
              className="theme-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add slot
            </button>
          </div>

          <label className="mt-4 block">
            <span className="theme-label mb-1.5 block text-xs uppercase tracking-[0.18em]">
              Default capacity
            </span>
            <input
              type="number"
              min={0}
              value={capacityDraft}
              onChange={(event) => setCapacityDraft(event.target.value)}
              className="theme-input w-full rounded-2xl px-4 py-3 text-sm md:max-w-xs"
              placeholder="Total seats, rooms, or units"
            />
          </label>

          <div className="mt-4 grid gap-3">
            {availabilityDraft.map((slot, index) => (
              <div
                key={slot.id || index}
                className="grid gap-3 rounded-2xl border border-white/10 bg-black/[0.03] p-4 dark:bg-black/20 lg:grid-cols-[1fr_1fr_140px_150px_auto]"
              >
                <input
                  type="datetime-local"
                  value={slot.startDate}
                  onChange={(event) =>
                    setAvailabilityDraft((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, startDate: event.target.value }
                          : item
                      )
                    )
                  }
                  className="theme-input rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="datetime-local"
                  value={slot.endDate}
                  onChange={(event) =>
                    setAvailabilityDraft((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, endDate: event.target.value }
                          : item
                      )
                    )
                  }
                  className="theme-input rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={slot.unitsAvailable ?? ""}
                  onChange={(event) =>
                    setAvailabilityDraft((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              unitsAvailable: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }
                          : item
                      )
                    )
                  }
                  className="theme-input rounded-xl px-3 py-2 text-sm"
                  placeholder="Units"
                />
                <select
                  value={slot.status}
                  onChange={(event) =>
                    setAvailabilityDraft((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, status: event.target.value } : item
                      )
                    )
                  }
                  className="theme-input rounded-xl px-3 py-2 text-sm"
                >
                  <option value="available">Available</option>
                  <option value="blocked">Blocked</option>
                  <option value="sold_out">Sold out</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setAvailabilityDraft((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  className="theme-button-secondary rounded-xl p-2"
                  title="Remove slot"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={savingAvailability}
              onClick={handleSaveAvailability}
              className="rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAvailability ? "Saving..." : "Save availability"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAvailabilityDraft(
                  listing.availability.map((slot) => ({
                    ...slot,
                    startDate: toDateTimeLocal(slot.startDate),
                    endDate: toDateTimeLocal(slot.endDate),
                  }))
                );
                setCapacityDraft(listing.capacity ? String(listing.capacity) : "");
                setShowAvailability(false);
              }}
              className="theme-button-secondary rounded-full px-5 py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showPhotos && (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <ListingImageManager
            listingId={listing.id}
            images={listing.images ?? []}
            onSaved={onImagesUpdated}
          />
        </div>
      )}
    </article>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

// ── ListingManagement ─────────────────────────────────────────────────────────

export default function ListingManagement() {
  const [listings, setListings] = useState<ProviderListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [destinations, setDestinations] = useState<ExplorerDestinationSummary[]>([]);

  const loadListings = async () => {
    try {
      const payload = await apiFetch<{ listings: ProviderListingRecord[] }>(
        "/api/provider/listings"
      );
      setListings(payload.listings);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    apiFetch<{ destinations: ExplorerDestinationSummary[] }>("/api/destinations")
      .then((payload) => setDestinations(payload.destinations))
      .catch(() => setDestinations([]));
  }, []);

  const filteredListings = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    return listings.filter((listing) =>
      [listing.title, listing.category, listing.location]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [listings, query]);

  const handleCreateListing = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const selectedDestination = destinations.find(
      (destination) => destination.id === form.destinationId
    );
    const requiresDestination = listingRequiresDestination(form.category);
    const serviceGroup = inferServiceGroup({
      category: form.category,
      listingType: form.listingType,
    });

    if (requiresDestination && !selectedDestination) {
      setError("Choose the destination this listing belongs to.");
      setSaving(false);
      return;
    }

    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        "/api/provider/listings",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            location: selectedDestination?.name || form.location,
            basePrice: form.basePrice ? Number(form.basePrice) : null,
            capacity: form.capacity ? Number(form.capacity) : null,
            instantBooking: form.bookingMode === "instant",
            amenities: [],
            tags: [],
            policies: {},
            metadata: selectedDestination
              ? {
                  destinationId: selectedDestination.id,
                  destinationName: selectedDestination.name,
                  destinationLocation: selectedDestination.location,
                  serviceGroup: serviceGroup.id,
                  serviceSubtype: form.listingType,
                }
              : {
                  serviceGroup: serviceGroup.id,
                  serviceSubtype: form.listingType,
                },
            availability: [],
          }),
        }
      );

      setListings((current) => [payload.listing, ...current]);
      setForm(initialForm);
      setShowComposer(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create listing.");
    } finally {
      setSaving(false);
    }
  };
  const selectedServiceGroup = inferServiceGroup({
    category: form.category,
    listingType: form.listingType,
  });
  const selectedSubtypes = selectedServiceGroup.subtypes;
  const shouldShowDestinationSelect =
    serviceGroups.some((group) => group.providerCategory === form.category) ||
    listingRequiresDestination(form.category);

  const toggleVisibility = async (listing: ProviderListingRecord) => {
    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        `/api/provider/listings/${listing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            visibility: listing.visibility === "public" ? "private" : "public",
          }),
        }
      );

      setListings((current) =>
        current.map((item) => (item.id === payload.listing.id ? payload.listing : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update listing.");
    }
  };

  const toggleStatus = async (listing: ProviderListingRecord) => {
    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        `/api/provider/listings/${listing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: listing.status === "active" ? "paused" : "active",
            visibility: listing.status === "active" ? listing.visibility : "public",
          }),
        }
      );

      setListings((current) =>
        current.map((item) => (item.id === payload.listing.id ? payload.listing : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update listing.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="theme-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="theme-heading text-2xl font-semibold">Listing management</h2>
            <p className="theme-muted mt-2 text-sm">
              Providers can create and control multiple PRD-aligned listings from one
              company profile.
            </p>
          </div>
          <button
            onClick={() => setShowComposer((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {showComposer ? "Close composer" : "Add new listing"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.1fr_auto]">
          <div className="relative">
            <Search className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search listings"
              className="theme-input w-full rounded-2xl py-3 pl-11 pr-4 text-sm"
            />
          </div>
          <div className="theme-card-soft rounded-2xl px-5 py-3 text-sm">
            {filteredListings.length} listing{filteredListings.length === 1 ? "" : "s"}
          </div>
        </div>

        {showComposer ? (
          <form
            onSubmit={handleCreateListing}
            className="mt-6 grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2"
          >
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
              placeholder="Listing title"
              required
            />
            <input
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({ ...current, location: event.target.value }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
              placeholder="Location"
              required={!listingRequiresDestination(form.category)}
            />
            {shouldShowDestinationSelect ? (
              <select
                value={form.destinationId}
                onChange={(event) => {
                  const destination = destinations.find(
                    (item) => item.id === event.target.value
                  );
                  setForm((current) => ({
                    ...current,
                    destinationId: event.target.value,
                    location: destination?.name || current.location,
                  }));
                }}
                className="theme-input rounded-2xl px-4 py-3 text-sm"
                required={listingRequiresDestination(form.category)}
              >
                <option value="">
                  {listingRequiresDestination(form.category)
                    ? "Choose destination"
                    : "Optional destination"}
                </option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={form.category}
              onChange={(event) =>
                setForm((current) => {
                  const group = serviceGroups.find(
                    (item) => item.providerCategory === event.target.value
                  );

                  return {
                    ...current,
                    category: event.target.value,
                    listingType: group?.subtypes[0]?.id || current.listingType,
                    destinationId: listingRequiresDestination(event.target.value)
                      ? current.destinationId
                      : current.destinationId,
                  };
                })
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
            >
              {serviceGroups.map((group) => (
                <option key={group.id}>{group.providerCategory}</option>
              ))}
              <option>Shopping Product</option>
            </select>
            <select
              value={form.listingType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  listingType: event.target.value,
                }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
            >
              {selectedSubtypes.map((subtype) => (
                <option key={subtype.id} value={subtype.id}>
                  {subtype.label}
                </option>
              ))}
            </select>
            <select
              value={form.bookingMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bookingMode: event.target.value,
                  status: event.target.value === "instant" ? "active" : current.status,
                }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
            >
              <option value="request">Booking request</option>
              <option value="instant">Instant booking</option>
            </select>
            <input
              value={form.basePrice}
              onChange={(event) =>
                setForm((current) => ({ ...current, basePrice: event.target.value }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
              placeholder="Base price"
            />
            <input
              type="number"
              min={0}
              value={form.capacity}
              onChange={(event) =>
                setForm((current) => ({ ...current, capacity: event.target.value }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
              placeholder="Default capacity"
            />
            <select
              value={form.visibility}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  visibility: event.target.value as "private" | "public",
                }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <input
              value={form.shortDescription}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shortDescription: event.target.value,
                }))
              }
              className="theme-input rounded-2xl px-4 py-3 text-sm md:col-span-2"
              placeholder="Short description"
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="theme-input min-h-32 rounded-2xl px-4 py-3 text-sm md:col-span-2"
              placeholder="Describe the service, what is included, and what travelers should expect."
              required
            />
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create listing"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setShowComposer(false);
                }}
                className="theme-button-secondary rounded-full px-5 py-3 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
        {error ? <p className="mt-4 text-sm text-[#ff8a63]">{error}</p> : null}
      </section>

      {loading ? (
        <section className="theme-panel rounded-[32px] p-6 text-sm">
          Loading provider listings...
        </section>
      ) : (
        <section className="grid gap-5">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onToggleVisibility={toggleVisibility}
              onToggleStatus={toggleStatus}
              onSaveAvailability={async (currentListing, availability, capacity) => {
                const payload = await apiFetch<{ listing: ProviderListingRecord }>(
                  `/api/provider/listings/${currentListing.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({
                      availability: availability.map((slot) => ({
                        startDate: slot.startDate,
                        endDate: slot.endDate,
                        unitsAvailable: slot.unitsAvailable ?? null,
                        status: slot.status,
                        notes: slot.notes ?? null,
                      })),
                      capacity,
                    }),
                  }
                );

                setListings((current) =>
                  current.map((item) =>
                    item.id === payload.listing.id ? payload.listing : item
                  )
                );
              }}
              onImagesUpdated={(imgs) =>
                setListings((prev) =>
                  prev.map((l) => (l.id === listing.id ? { ...l, images: imgs } : l))
                )
              }
            />
          ))}

          {filteredListings.length === 0 ? (
            <article className="theme-panel rounded-[32px] p-6 text-sm">
              No listings found.
            </article>
          ) : null}
        </section>
      )}

      <section className="theme-panel rounded-[32px] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#153220] p-3">
            <CheckCircle className="h-5 w-5 text-[#8cf0a1]" />
          </div>
          <div>
            <h3 className="theme-heading text-lg font-semibold">One business, many services</h3>
          </div>
        </div>
      </section>
    </div>
  );
}
