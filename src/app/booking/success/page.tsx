"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import type { ExplorerBookingRecord } from "@/types/platform";

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const confirmationNumber = searchParams.get("confirmation");

  const [booking, setBooking] = useState<ExplorerBookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmationNumber) {
      setError("No booking reference provided");
      setIsLoading(false);
      return;
    }

    // Primary source: the booking request saved to localStorage by CheckoutComponent.
    // The API endpoint doesn't exist yet (backend pending), so we read locally first.
    try {
      const raw = localStorage.getItem("off2zim_booking_request");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.confirmationNumber === confirmationNumber) {
          const firstItem = Array.isArray(saved.items) ? saved.items[0] : null;
          const synthetic: ExplorerBookingRecord = {
            id: confirmationNumber,
            confirmationNumber,
            status: "pending",
            totalAmount: saved.total ?? 0,
            currency: "USD",
            bookingType: firstItem?.type ?? "booking_request",
            checkIn: firstItem?.checkIn ?? null,
            checkOut: firstItem?.checkOut ?? null,
            guests: firstItem?.quantity ?? null,
            specialRequests: null,
            createdAt: saved.createdAt ?? new Date().toISOString(),
            updatedAt: saved.createdAt ?? new Date().toISOString(),
            listing: firstItem
              ? {
                  id: firstItem.id,
                  slug: firstItem.id,
                  title: firstItem.name,
                  category: firstItem.category ?? firstItem.type,
                  location: firstItem.metadata?.location ?? "",
                }
              : null,
            provider: null,
            paymentStatus: "pending",
          };
          setBooking(synthetic);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // localStorage unavailable or corrupt — fall through to API attempt
    }

    // Fallback: try the real API (will work once backend is live).
    apiFetch<{ booking: ExplorerBookingRecord }>(`/api/bookings/${confirmationNumber}`)
      .then((p) => setBooking(p.booking))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load booking."))
      .finally(() => setIsLoading(false));
  }, [confirmationNumber]);

  if (isLoading) {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#ff5630]" />
          <p className="mt-4 theme-muted text-sm">Loading your confirmation…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center px-4">
        <div className="theme-panel w-full max-w-md rounded-[32px] p-8 text-center">
          <h1 className="theme-heading text-2xl font-semibold">Unable to load booking</h1>
          <p className="theme-muted mt-3 text-sm leading-6">{error || "We couldn't find your confirmation details."}</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="theme-panel rounded-[36px] p-6 md:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0f2a1e]">
              <CheckCircle2 className="h-10 w-10 text-[#4ade80]" />
            </div>
            <h1 className="theme-heading mt-6 text-4xl font-semibold">Booking confirmed</h1>
            <p className="theme-muted mx-auto mt-3 max-w-xl text-sm leading-7">
              Your reservation has been recorded successfully.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left */}
            <div className="space-y-4">
              <div className="theme-card-soft rounded-[28px] p-6">
                <h2 className="theme-heading text-lg font-semibold mb-4">Confirmation details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Stat label="Confirmation number" value={booking.confirmationNumber} />
                  <Stat label="Booking date" value={new Date(booking.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
                  <Stat label="Total" value={`$${booking.totalAmount.toFixed(2)} ${booking.currency}`} />
                  <Stat label="Payment status" value={booking.paymentStatus} />
                </div>
              </div>

              <div className="theme-card-soft rounded-[28px] p-6">
                <h2 className="theme-heading text-lg font-semibold mb-4">Your booking</h2>
                <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="theme-heading font-semibold">{booking.listing?.title || booking.bookingType}</h3>
                      <p className="theme-subtle mt-1 text-sm">{booking.provider?.companyName || "Off2Zim Provider"}</p>
                      <div className="mt-3 space-y-1.5 theme-subtle text-sm">
                        {booking.checkIn && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(booking.checkIn).toLocaleDateString()}
                            {booking.checkOut ? ` → ${new Date(booking.checkOut).toLocaleDateString()}` : ""}
                          </div>
                        )}
                        {booking.listing?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {booking.listing.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="theme-heading font-semibold">${booking.totalAmount.toFixed(2)}</div>
                      <div className="theme-subtle text-xs mt-1">{booking.guests || 1} guest{(booking.guests || 1) > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">
              <div className="theme-card-soft rounded-[28px] p-6">
                <h2 className="theme-heading text-lg font-semibold mb-4">Quick actions</h2>
                <div className="space-y-3">
                  <Link href="/bookings" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors">
                    View all bookings
                  </Link>
                  <Link href="/trip-planner" className="theme-button-secondary flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
                    Open trip planner
                  </Link>
                </div>
              </div>

              <div className="theme-card-soft rounded-[28px] p-6">
                <h2 className="theme-heading text-lg font-semibold mb-3">Contact</h2>
                <div className="space-y-2.5 theme-muted text-sm">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" />Details available in your bookings dashboard</div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4" />Save your confirmation number for support</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#4ade80]/20 bg-[#0f2a1e] p-6">
                <h2 className="theme-heading text-lg font-semibold mb-3">What happens next</h2>
                <div className="space-y-2 theme-muted text-sm leading-6">
                  <p>Your booking is now visible in your explorer dashboard.</p>
                  <p>The provider will review and confirm it from their workspace.</p>
                  <p>You&apos;ll receive updates as the booking is processed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTAs */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/activities" className="rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors">
              Book more activities
            </Link>
            <Link href="/marketplace" className="theme-button-secondary rounded-full px-6 py-3 text-sm font-semibold">
              Explore marketplace
            </Link>
            <Link href="/" className="theme-button-secondary rounded-full px-6 py-3 text-sm font-semibold">
              Back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="theme-subtle text-xs">{label}</div>
      <div className="theme-heading mt-1.5 font-semibold text-sm">{value}</div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="theme-page flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#ff5630]" /></div>}>
      <BookingSuccessContent />
    </Suspense>
  );
}
