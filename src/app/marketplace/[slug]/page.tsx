"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { useAuth } from "@/contexts/AuthContext";
import type { PublicListingRecord } from "@/types/platform";
import { SkeletonDetail } from "@/components/ui/Skeleton";

// ── helpers ───────────────────────────────────────────────────────────────────

function getImages(listing: PublicListingRecord): string[] {
  if (listing.images && listing.images.length > 0) return listing.images;
  return [];
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Accommodation:
    "from-[#1f2d3d] via-[#162330] to-[#0d1a26] dark:from-[#1f2d3d] dark:to-[#0d1a26]",
  Experience:
    "from-[#2d1f0f] via-[#231a0d] to-[#1a1208] dark:from-[#2d1f0f] dark:to-[#1a1208]",
  Transport:
    "from-[#1a1f2d] via-[#151923] to-[#0e1219] dark:from-[#1a1f2d] dark:to-[#0e1219]",
  Dining:
    "from-[#2d1a1a] via-[#231515] to-[#1a0f0f] dark:from-[#2d1a1a] dark:to-[#1a0f0f]",
  Shopping:
    "from-[#1a2d1a] via-[#152315] to-[#0f1a0f] dark:from-[#1a2d1a] dark:to-[#0f1a0f]",
};
function categoryGradient(category: string) {
  return (
    CATEGORY_GRADIENTS[category] ??
    "from-[#1e1e2e] via-[#18182a] to-[#111122]"
  );
}

function formatSlotRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid slot";
  }

  return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleDateString()} ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MarketplaceListingDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [listing, setListing] = useState<PublicListingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Booking form
  const [guests, setGuests] = useState(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  // Image gallery
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    apiFetch<{ listing: PublicListingRecord }>(`/api/listings/${params.slug}`)
      .then(({ listing: l }) => {
        setListing(l);
        const firstAvailableSlot = l.availability.find(
          (slot) => slot.status === "available"
        );

        if (l.bookingMode === "instant" && firstAvailableSlot) {
          setSelectedAvailabilityId(firstAvailableSlot.id);
          setCheckIn(firstAvailableSlot.startDate.slice(0, 10));
          setCheckOut(firstAvailableSlot.endDate.slice(0, 10));
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load listing.")
      )
      .finally(() => setLoading(false));
  }, [params.slug]);

  const requestBooking = async () => {
    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/marketplace/${params.slug}`)}`
      );
      return;
    }
    setSubmitting(true);
    setBookingError("");
    try {
      const payload = await apiFetch<{
        booking: { id: string; status: string; confirmationNumber: string };
      }>(`/api/listings/${params.slug}/book`, {
        method: "POST",
        body: JSON.stringify({
          guests,
          availabilityId: selectedAvailabilityId || null,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          specialRequests: specialRequests || null,
        }),
      });
      setBookingMessage(
        `Booking ${payload.booking.status.toLowerCase()} - confirmation #${payload.booking.confirmationNumber}`
      );
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Unable to create booking."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="theme-page min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 h-5 w-32 animate-pulse rounded-full bg-white/8" />
          <SkeletonDetail />
        </div>
      </div>
    );
  }

  // ── error ────────────────────────────────────────────────────────────────
  if (error || !listing) {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center px-4">
        <div className="theme-panel max-w-sm rounded-[28px] p-8 text-center">
          <p className="theme-heading font-semibold">Listing not found</p>
          <p className="theme-muted mt-2 text-sm">{error || "This listing is unavailable."}</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = getImages(listing);
  const hasImages = images.length > 0;
  const availableSlots = listing.availability.filter(
    (slot) => slot.status === "available"
  );
  const requiresSlot = listing.bookingMode === "instant";
  const canSubmitBooking =
    !requiresSlot || (!!selectedAvailabilityId && availableSlots.length > 0);

  return (
    <div className="theme-page min-h-screen pb-20">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Back nav */}
        <Link
          href="/marketplace"
          className="theme-muted mb-8 inline-flex items-center gap-2 text-sm transition hover:text-current"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Hero image / gallery */}
            <div className="relative overflow-hidden rounded-[32px]">
              {hasImages ? (
                <>
                  <img
                    src={images[imgIndex]}
                    alt={listing.title}
                    className="aspect-[16/9] w-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setImgIndex((i) => Math.max(0, i - 1))}
                        disabled={imgIndex === 0}
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setImgIndex((i) => Math.min(images.length - 1, i + 1))
                        }
                        disabled={imgIndex === images.length - 1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      {/* dot indicators */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setImgIndex(i)}
                            className={`h-1.5 rounded-full transition-all ${
                              i === imgIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {/* thumbnail strip */}
                  {images.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 flex gap-2 bg-gradient-to-t from-black/60 to-transparent px-4 pb-10 pt-6">
                      {images.slice(0, 6).map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIndex(i)}
                          className={`h-12 w-16 shrink-0 overflow-hidden rounded-xl transition ${
                            i === imgIndex
                              ? "ring-2 ring-white ring-offset-1 ring-offset-black/30"
                              : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={`aspect-[16/9] w-full bg-gradient-to-br ${categoryGradient(listing.category)} flex items-end p-6`}
                >
                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm">
                    {listing.category}
                  </span>
                </div>
              )}
            </div>

            {/* Core details panel */}
            <div className="theme-panel rounded-[32px] p-6">
              {/* Type label + title */}
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff5630]">
                {listing.listingType.replace(/_/g, " ")}
              </p>
              <h1 className="theme-heading mt-2 text-3xl font-semibold leading-tight">
                {listing.title}
              </h1>

              {/* Meta row */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-white/60">
                  <MapPin className="h-4 w-4 text-[#ff7352]" />
                  {listing.location}
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/60">
                  {listing.bookingMode === "instant" ? (
                    <Zap className="h-4 w-4 text-[#fbbf24]" />
                  ) : (
                    <Clock className="h-4 w-4 text-white/40" />
                  )}
                  {listing.bookingMode === "instant"
                    ? "Instant booking"
                    : "Booking request required"}
                </span>
                {listing.capacity ? (
                  <span className="inline-flex items-center gap-1.5 text-white/60">
                    <Users className="h-4 w-4 text-white/40" />
                    Up to {listing.capacity} guests
                  </span>
                ) : null}
              </div>

              {/* Provider */}
              <div className="mt-5 flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff5630]/15 text-sm font-semibold text-[#ff5630]">
                  {listing.provider.companyName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="theme-heading truncate text-sm font-semibold">
                      {listing.provider.tradingName ?? listing.provider.companyName}
                    </span>
                    {listing.provider.hasVerifiedBadge ? (
                      <ShieldCheck className="h-4 w-4 shrink-0 text-[#8dc9ff]" />
                    ) : null}
                  </div>
                  <p className="theme-muted truncate text-xs">
                    {listing.provider.location}
                  </p>
                </div>
                {listing.provider.hasVerifiedBadge ? (
                  <span className="shrink-0 rounded-full bg-[#13283a] px-3 py-1 text-xs font-medium text-[#8dc9ff]">
                    {listing.provider.verificationTier}
                  </span>
                ) : null}
              </div>

              {/* Description */}
              <p className="theme-muted mt-6 text-sm leading-7">
                {listing.description}
              </p>

              {/* Tags */}
              {listing.tags.length > 0 ? (
                <div className="mt-6">
                  <div className="flex flex-wrap gap-1.5">
                    {listing.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-3 py-1 text-xs text-white/60"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Amenities */}
            {listing.amenities.length > 0 ? (
              <div className="theme-panel rounded-[28px] p-6">
                <h2 className="theme-heading mb-4 text-lg font-semibold">
                  What&apos;s included
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {listing.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 rounded-[16px] bg-white/[0.04] px-3 py-2.5 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-[#4ade80]" />
                      <span className="theme-muted truncate">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Availability hint */}
            {listing.availability && listing.availability.length > 0 ? (
              <div className="theme-panel rounded-[28px] p-6">
                <h2 className="theme-heading mb-4 inline-flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="h-5 w-5 text-[#ff5630]" />
                  Availability
                </h2>
                <div className="space-y-2">
                  {listing.availability.slice(0, 5).map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-[16px] bg-white/[0.04] px-4 py-3 text-sm"
                    >
                      <span className="theme-muted">
                        {new Date(slot.startDate).toLocaleDateString()} –{" "}
                        {new Date(slot.endDate).toLocaleDateString()}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          slot.status === "available"
                            ? "bg-[#0f2a1e] text-[#4ade80]"
                            : "bg-white/8 text-white/50"
                        }`}
                      >
                        {slot.status}
                        {slot.unitsAvailable ? ` · ${slot.unitsAvailable} units` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Right column — booking sidebar ───────────────────────── */}
          <div id="booking" className="lg:sticky lg:top-8 h-fit space-y-4">
            <div className="theme-panel rounded-[32px] p-6">
              {/* Price */}
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                  Starting from
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="theme-heading text-4xl font-semibold">
                    {listing.basePrice ? `$${listing.basePrice}` : "Quote"}
                  </span>
                  {listing.basePrice ? (
                    <span className="theme-muted mb-1 text-sm">
                      / {listing.pricingModel.replace(/_/g, " ")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  {listing.bookingMode === "instant" ? (
                    <>
                      <Zap className="h-3.5 w-3.5 text-[#fbbf24]" />
                      <span className="text-xs text-[#fbbf24]">Instant confirmation</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-xs text-white/40">Provider review required</span>
                    </>
                  )}
                </div>
              </div>

              {/* Booking confirmed message */}
              {bookingMessage ? (
                <div className="mb-4 rounded-[18px] bg-[#0f2a1e] px-4 py-3 text-sm text-[#4ade80]">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Booking submitted
                  </div>
                  <p className="mt-1 text-xs opacity-80">{bookingMessage}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Guests */}
                  <div>
                    <label className="theme-muted mb-1.5 block text-xs font-medium">
                      Guests
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <select
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="theme-input h-12 w-full rounded-2xl pl-10 pr-4 text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} guest{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Availability slot */}
                  {availableSlots.length > 0 ? (
                    <div>
                      <label className="theme-muted mb-1.5 block text-xs font-medium">
                        Availability
                      </label>
                      <select
                        value={selectedAvailabilityId}
                        onChange={(e) => {
                          const slot = availableSlots.find(
                            (item) => item.id === e.target.value
                          );
                          setSelectedAvailabilityId(e.target.value);
                          if (slot) {
                            setCheckIn(slot.startDate.slice(0, 10));
                            setCheckOut(slot.endDate.slice(0, 10));
                          }
                        }}
                        className="theme-input h-12 w-full rounded-2xl px-4 text-sm"
                      >
                        <option value="">
                          {requiresSlot ? "Choose an available slot" : "No specific slot"}
                        </option>
                        {availableSlots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {formatSlotRange(slot.startDate, slot.endDate)}
                            {slot.unitsAvailable
                              ? ` · ${slot.unitsAvailable} left`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : requiresSlot ? (
                    <div className="rounded-[18px] bg-[#2d1714] px-4 py-3 text-sm text-[#ffb09c]">
                      This instant-book listing does not have available slots yet.
                    </div>
                  ) : null}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="theme-muted mb-1.5 block text-xs font-medium">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="theme-input h-12 w-full rounded-2xl px-4 text-sm"
                      />
                    </div>
                    <div>
                      <label className="theme-muted mb-1.5 block text-xs font-medium">
                        End date
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="theme-input h-12 w-full rounded-2xl px-4 text-sm"
                      />
                    </div>
                  </div>

                  {/* Special requests */}
                  <div>
                    <label className="theme-muted mb-1.5 block text-xs font-medium">
                      Special requests
                    </label>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={3}
                      className="theme-input w-full resize-none rounded-[20px] px-4 py-3 text-sm"
                      placeholder="Pickup notes, dietary needs, preferred times…"
                    />
                  </div>

                  {/* Error */}
                  {bookingError ? (
                    <div className="rounded-[18px] bg-[#2d1714] px-4 py-3 text-sm text-[#ff8a78]">
                      {bookingError}
                    </div>
                  ) : null}

                  {/* CTA */}
                  <button
                    onClick={requestBooking}
                    disabled={submitting || !canSubmitBooking}
                    className="w-full rounded-full bg-[#ff5630] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting…"
                      : listing.bookingMode === "instant"
                        ? "Book now"
                        : "Request booking"}
                  </button>
                </div>
              )}
            </div>

            {/* Trust signals */}
            <div className="theme-card-soft rounded-[24px] p-5">
              <div className="space-y-3 text-xs text-white/55">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#8dc9ff] shrink-0" />
                  Verified provider with booking support through Off2Zim
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#fbbf24] shrink-0" />
                  Ratings are shown after completed bookings
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/35 shrink-0" />
                  Free cancellation up to 24 hours before start
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
