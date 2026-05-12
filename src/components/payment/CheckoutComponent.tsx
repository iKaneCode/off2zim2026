"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookingItem } from "@/types/payment";
import {
  ArrowRight, CalendarClock, Mail, Minus, Plus,
  ShieldCheck, Trash2, Users, Calendar, MapPin, Package,
} from "lucide-react";

interface CheckoutComponentProps {
  items: BookingItem[];
  onSuccess: (confirmationNumber: string) => void;
  onCancel: () => void;
}

function nightsBetween(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 1;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CheckoutComponent({ items: initialItems, onSuccess, onCancel }: CheckoutComponentProps) {
  const [items, setItems] = useState<BookingItem[]>(initialItems.map((i) => ({ ...i })));
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── helpers ── */
  const updateItem = (id: string, patch: Partial<BookingItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  const changeQty = (id: string, delta: number) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
      )
    );

  const changeDate = (id: string, field: "checkIn" | "checkOut", value: string) =>
    updateItem(id, { [field]: value });

  /* ── totals ── */
  const subtotal = items.reduce((sum, it) => {
    const nights = it.type === "accommodation" ? nightsBetween(it.checkIn, it.checkOut) : 1;
    return sum + it.price * it.quantity * nights;
  }, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  /* ── submit ── */
  const handleSubmit = () => {
    setIsSubmitting(true);
    const confirmationNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;
    localStorage.setItem("off2zim_booking_request", JSON.stringify({
      confirmationNumber,
      createdAt: new Date().toISOString(),
      items,
      total,
      mode: "booking_request",
    }));
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess(confirmationNumber);
    }, 600);
  };

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="theme-panel rounded-[32px] p-10 text-center">
          <p className="theme-muted text-sm">All items removed. Add something to continue.</p>
          <button onClick={onCancel} className="mt-5 rounded-full border border-white/10 px-5 py-2.5 text-sm theme-muted hover:bg-white/[0.05] transition-colors">
            Go back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

        {/* ── Left: Editable items ── */}
        <div className="space-y-4">
          <h2 className="theme-heading text-xl font-semibold">Review &amp; edit items</h2>

          {items.map((item) => {
            const isAccommodation = item.type === "accommodation";
            const isTripPackage = item.type === "trip_package";
            const isFixedPlannerItem = item.metadata?.pricingModel === "fixed";
            const nights = isAccommodation ? nightsBetween(item.checkIn, item.checkOut) : 1;
            const lineTotal = item.price * item.quantity * nights;

            return (
              <div key={item.id} className="theme-panel rounded-[28px] p-5">
                {/* Item header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.06]">
                      {item.type === "accommodation" ? <MapPin className="h-4 w-4 text-[#5aa7ff]" /> :
                       item.type === "transport"     ? <CalendarClock className="h-4 w-4 text-[#ffc247]" /> :
                                                       <Package className="h-4 w-4 text-[#ff7352]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="theme-heading text-sm font-semibold leading-snug">{item.name}</p>
                      {item.description && (
                        <p className="theme-muted text-xs mt-0.5 line-clamp-2 leading-5">{item.description}</p>
                      )}
                      {typeof item.metadata?.location === "string" && (
                        <p className="theme-subtle text-xs mt-1">{item.metadata.location}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="theme-heading text-sm font-semibold">${lineTotal.toFixed(2)}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-full p-1.5 text-white/30 hover:bg-[#2a0f0a] hover:text-[#ff8a78] transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Editable controls */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  {/* Accommodation: check-in / check-out / nights */}
                  {isAccommodation && (
                    <>
                      <div>
                        <label className="block text-xs theme-subtle mb-1">Check-in</label>
                        <input
                          type="date"
                          value={item.checkIn?.slice(0, 10) ?? ""}
                          onChange={(e) => changeDate(item.id, "checkIn", e.target.value)}
                          className="theme-input w-full rounded-[12px] px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs theme-subtle mb-1">Check-out</label>
                        <input
                          type="date"
                          value={item.checkOut?.slice(0, 10) ?? ""}
                          onChange={(e) => changeDate(item.id, "checkOut", e.target.value)}
                          className="theme-input w-full rounded-[12px] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2 rounded-[14px] bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                        <Calendar className="h-4 w-4 text-[#8dc9ff]" />
                        <span className="theme-muted text-xs">
                          {nights} night{nights !== 1 ? "s" : ""} ·{" "}
                          {item.checkIn ? formatDate(item.checkIn) : "—"} → {item.checkOut ? formatDate(item.checkOut) : "—"}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Trip package: read-only travel window */}
                  {isTripPackage && (item.checkIn || item.checkOut) && (
                    <div className="sm:col-span-2 flex items-center gap-2 rounded-[14px] bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                      <Calendar className="h-4 w-4 text-[#fb923c]" />
                      <span className="theme-muted text-xs">
                        Travel window · {item.checkIn ? formatDate(item.checkIn) : "—"} → {item.checkOut ? formatDate(item.checkOut) : "—"}
                        {item.metadata?.durationDays ? ` · ${item.metadata.durationDays} days` : ""}
                      </span>
                    </div>
                  )}

                  {/* Guests */}
                  <div className={isAccommodation ? "sm:col-span-1" : ""}>
                    <label className="block text-xs theme-subtle mb-1">
                      {isAccommodation
                        ? "Rooms"
                        : isFixedPlannerItem
                          ? "Quantity"
                          : item.category === "dining"
                            ? "Party size"
                            : "Travelers"}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] disabled:opacity-30 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="theme-heading w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="theme-subtle text-xs ml-1 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {isFixedPlannerItem
                          ? item.quantity === 1 ? "item" : "items"
                          : item.quantity === 1 ? "person" : "people"}
                      </span>
                    </div>
                  </div>

                  {/* Unit price reminder */}
                  <div className="flex items-end">
                    <p className="theme-subtle text-xs">
                      ${item.price.toFixed(2)}{" "}
                      {isAccommodation
                        ? "/ night"
                        : isTripPackage
                          ? "/ person (package)"
                          : isFixedPlannerItem
                            ? "fixed"
                            : "/ person"}
                      {isAccommodation && nights > 1 ? ` × ${nights} nights` : ""}
                      {item.quantity > 1
                        ? ` × ${item.quantity} ${isFixedPlannerItem ? "items" : "people"}`
                        : ""}
                      {typeof item.metadata?.pricingLabel === "string"
                        ? ` · ${item.metadata.pricingLabel}`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Reservation time for dining */}
                {item.metadata?.reservationTime && (
                  <div className="mt-3">
                    <label className="block text-xs theme-subtle mb-1">Reservation time</label>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(item.metadata.allTimes)
                        ? item.metadata.allTimes.filter(
                            (time): time is string => typeof time === "string"
                          )
                        : [item.metadata.reservationTime].filter(
                            (time): time is string => typeof time === "string"
                          )
                      ).map((t, ti) => (
                        <button
                          key={`${t}-${ti}`}
                          onClick={() => updateItem(item.id, { metadata: { ...item.metadata, reservationTime: t } })}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            item.metadata?.reservationTime === t
                              ? "bg-[#ff5630] text-white"
                              : "theme-chip hover:bg-white/[0.1]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dietary notes for dining (editable in cart) */}
                {item.category === "dining" && (
                  <div className="mt-3">
                    <label className="block text-xs theme-subtle mb-1">Dietary needs / notes</label>
                    <input
                      type="text"
                      value={
                        typeof item.metadata?.dietaryNotes === "string"
                          ? item.metadata.dietaryNotes
                          : ""
                      }
                      onChange={(e) => updateItem(item.id, { metadata: { ...item.metadata, dietaryNotes: e.target.value || null } })}
                      placeholder="e.g. vegetarian, nut allergy, high chair…"
                      className="theme-input w-full rounded-[12px] px-3 py-2 text-xs"
                    />
                  </div>
                )}

                {/* Special notes for Guide+ bookings */}
                {item.category === "guide-plus" &&
                  typeof item.metadata?.guideName === "string" && (
                  <div className="mt-3 rounded-[14px] bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 text-xs theme-muted">
                    Guide: {item.metadata.guideName}
                    {typeof item.metadata.service === "string"
                      ? ` · ${item.metadata.service}`
                      : ""}
                    {typeof item.metadata.location === "string"
                      ? ` · ${item.metadata.location}`
                      : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right: Summary + Submit ── */}
        <div>
          <div className="theme-panel sticky top-24 rounded-[36px] p-6 space-y-5">
            <h2 className="theme-heading text-xl font-semibold">Booking summary</h2>

            {/* Line items */}
            <div className="space-y-2.5">
              {items.map((item) => {
                const nights = item.type === "accommodation" ? nightsBetween(item.checkIn, item.checkOut) : 1;
                const lineTotal = item.price * item.quantity * nights;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="theme-heading font-medium text-sm leading-snug truncate">{item.name}</p>
                      <p className="theme-subtle text-xs mt-0.5">
                        {item.quantity} {item.quantity > 1 ? "people" : "person"}
                        {item.type === "accommodation" && nights > 0 ? ` · ${nights} night${nights !== 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                    <span className="theme-heading text-sm font-medium shrink-0">${lineTotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t border-white/[0.08] pt-4 space-y-2 text-sm">
              <div className="flex justify-between theme-muted">
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between theme-muted">
                <span>VAT (15%)</span><span>${vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between theme-muted">
                <span>Service fee</span><span>$0.00</span>
              </div>
              <div className="flex justify-between theme-heading text-lg font-semibold border-t border-white/[0.08] pt-3 mt-1">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Trust */}
            <div className="rounded-[20px] border border-[#4ade80]/20 bg-[#0f2a1e] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-[#4ade80] shrink-0" />
                <p className="text-xs text-white/60 leading-5">
                  Booking protection included — clear confirmation and a clean handoff into your itinerary.
                </p>
              </div>
            </div>

            {/* What happens next */}
            <div className="theme-card-soft rounded-[24px] p-4 space-y-3">
              <h3 className="theme-heading text-sm font-semibold">What happens next</h3>
              <div className="space-y-2.5">
                {[
                  { icon: CalendarClock, color: "text-[#ff7352]", text: "Your items stay grouped under one request." },
                  { icon: Mail,          color: "text-[#5aa7ff]", text: "A reference number is issued for follow-ups." },
                  { icon: ArrowRight,    color: "text-[#4ade80]", text: "Off2Zim guides the final confirmation step." },
                ].map(({ icon: Icon, color, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                    <p className="theme-muted text-xs leading-5">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={onCancel}
                className="theme-button-secondary rounded-full px-6 py-3 text-sm font-semibold"
              >
                Go back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || items.length === 0}
                className="rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Submitting…" : "Submit booking request"}
              </button>
            </div>

            <p className="text-center text-xs theme-subtle">
              Need help?{" "}
              <Link href="/contact" className="text-[#ff7352] hover:underline">Contact support</Link>
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
