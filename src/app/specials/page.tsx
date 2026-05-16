"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Minus, Plus, Tag, X } from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";

interface Special {
  id: number;
  title: string;
  description: string;
  originalPrice: number;
  specialPrice: number;
  discount: string;
  image: string;
  location: string;
  duration: string;
  durationDays: number;
  features: string[];
}

const specials: Special[] = [
  {
    id: 1,
    title: "Victoria Falls Adventure Package",
    description:
      "A tighter multi-day route that combines aerial views, water activity, and a strong destination stay.",
    originalPrice: 899,
    specialPrice: 649,
    discount: "28%",
    image: "/images/victoria-falls.jpg",
    location: "Victoria Falls",
    duration: "3 days",
    durationDays: 3,
    features: ["Helicopter ride", "Rafting", "Sunset cruise", "Hotel included"],
  },
  {
    id: 2,
    title: "Hwange Safari Experience",
    description:
      "A wildlife-focused package built for travelers who want game drives, pacing, and lodge comfort in one booking.",
    originalPrice: 1299,
    specialPrice: 899,
    discount: "31%",
    image: "/images/hwange-bush-camp-548548-original.jpg",
    location: "Hwange",
    duration: "4 days",
    durationDays: 4,
    features: ["Game drives", "Bush walks", "All meals", "Guide included"],
  },
  {
    id: 3,
    title: "Eastern Highlands Retreat",
    description:
      "A scenic mountain reset with softer pacing, lodge atmosphere, and outdoors-led time.",
    originalPrice: 699,
    specialPrice: 499,
    discount: "29%",
    image: "/images/destinations/eastern-highlands.jpg",
    location: "Nyanga",
    duration: "5 days",
    durationDays: 5,
    features: ["Hiking", "Fishing", "Scenic views", "Lodge stay"],
  },
];

interface BookingModalProps {
  special: Special;
  onClose: () => void;
  onConfirm: (special: Special, travelers: number, startDate: string) => void;
}

function BookingModal({ special, onClose, onConfirm }: BookingModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [travelers, setTravelers] = useState(2);
  const [startDate, setStartDate] = useState(today);

  const endDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + special.durationDays - 1);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  const total = special.specialPrice * travelers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="theme-panel w-full max-w-md rounded-[32px] p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="theme-label text-xs uppercase tracking-[0.22em]">Book special</p>
            <h2 className="theme-heading mt-1 text-xl font-semibold">{special.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-full p-2 theme-muted hover:bg-white/[0.07] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Package info */}
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 theme-muted">
            <MapPin className="h-4 w-4 text-[#ff7352]" /> {special.location}
          </span>
          <span className="inline-flex items-center gap-1.5 theme-muted">
            <CalendarDays className="h-4 w-4 text-[#5aa7ff]" /> {special.duration}
          </span>
        </div>

        {/* Included features */}
        <div className="flex flex-wrap gap-2">
          {special.features.map((f) => (
            <span key={f} className="theme-chip rounded-full px-3 py-1.5 text-xs">{f}</span>
          ))}
        </div>

        {/* Start date */}
        <div>
          <label className="block text-xs theme-subtle mb-1.5">Start date</label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            className="theme-input w-full rounded-[14px] px-3 py-2.5 text-sm"
          />
          <p className="theme-muted mt-1.5 text-xs">
            Package runs {special.durationDays} days: ends {endDate}
          </p>
        </div>

        {/* Travelers */}
        <div>
          <label className="block text-xs theme-subtle mb-1.5">Travelers</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTravelers((t) => Math.max(1, t - 1))}
              disabled={travelers <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 theme-muted hover:bg-white/[0.07] disabled:opacity-30 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="theme-heading w-8 text-center text-sm font-semibold">{travelers}</span>
            <button
              onClick={() => setTravelers((t) => t + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 theme-muted hover:bg-white/[0.07] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <span className="theme-subtle text-xs ml-1">person{travelers !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Price summary */}
        <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.07] p-4 space-y-1.5 text-sm">
          <div className="flex justify-between theme-muted">
            <span>${special.specialPrice} × {travelers} traveler{travelers !== 1 ? "s" : ""}</span>
            <span>${total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between theme-subtle text-xs">
            <span>Original: ${(special.originalPrice * travelers).toLocaleString()}</span>
            <span className="text-[#4ade80]">You save ${((special.originalPrice - special.specialPrice) * travelers).toLocaleString()}</span>
          </div>
          <div className="flex justify-between theme-heading font-semibold border-t border-white/[0.07] pt-2 mt-1">
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onConfirm(special, travelers, startDate)}
            className="w-full rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
          >
            Add to cart &amp; review
          </button>
          <button
            onClick={onClose}
            className="theme-button-secondary w-full rounded-full px-6 py-3 text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SpecialsPage() {
  const router = useRouter();
  const { addToBooking } = usePayment();
  const [activeSpecial, setActiveSpecial] = useState<Special | null>(null);

  const handleConfirm = (special: Special, travelers: number, startDate: string) => {
    const endD = new Date(startDate);
    endD.setDate(endD.getDate() + special.durationDays - 1);

    const item: BookingItem = {
      id: `special-${special.id}-${Date.now()}`,
      // "trip_package" is the correct semantic type for multi-day bundled specials.
      // Using "activity" caused the checkout to label these "/ person" for a single
      // night rather than showing the travel window. "trip_package" is also a valid
      // BookingItem type and correctly signals that checkIn/checkOut should be shown.
      type: "trip_package",
      name: special.title,
      description: special.description,
      price: special.specialPrice,
      currency: "USD",
      category: "specials",
      quantity: travelers,
      checkIn: startDate,
      checkOut: endD.toISOString().slice(0, 10),
      metadata: {
        location: special.location,
        duration: special.duration,
        durationDays: special.durationDays,
        features: special.features,
        originalPrice: special.originalPrice,
        discount: special.discount,
        image: special.image,
      },
    };

    addToBooking(item);
    setActiveSpecial(null);
    router.push("/checkout");
  };

  return (
    <div className="theme-page pb-20">
      {activeSpecial && (
        <BookingModal
          special={activeSpecial}
          onClose={() => setActiveSpecial(null)}
          onConfirm={handleConfirm}
        />
      )}

      <CompactPageHero
        eyebrow="Specials"
        title="More of Zimbabwe, at a better price"
        description="Each special bundles accommodation, guided experiences, and key activities into one price so you spend less time planning and more time in the destination."
        imageUrl="/images/victoria-falls.jpg"
      />

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <CompactSectionHeader title="Current specials" count={specials.length} />
        <HorizontalRail itemClassName="w-[84vw] max-w-[340px] sm:w-[320px]">
          {specials.map((special) => (
            <article key={special.id} className="theme-card flex h-[420px] flex-col overflow-hidden rounded-xl">
              <div
                className="min-h-[132px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.48)), url('${special.image}')`,
                }}
              >
                <div className="p-4">
                  <div className="inline-flex rounded-full bg-[#ff5630] px-3 py-1 text-sm font-semibold text-white">
                    -{special.discount}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h2 className="theme-heading text-xl font-semibold">{special.title}</h2>
                <p className="theme-muted mt-2 flex-1 text-sm leading-6">{special.description}</p>

                <div className="theme-muted mt-4 flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#ff7352]" />
                    {special.location}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#5aa7ff]" />
                    {special.duration}
                  </span>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {special.features.map((feature) => (
                    <span key={feature} className="theme-chip shrink-0 rounded-lg px-2.5 py-1.5 text-xs">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="theme-muted text-sm line-through">
                      ${special.originalPrice.toLocaleString()}
                    </div>
                    <div className="theme-heading text-2xl font-semibold">
                      ${special.specialPrice.toLocaleString()}
                      <span className="theme-subtle ml-1 text-sm font-normal">/ person</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSpecial(special)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
                  >
                    <Tag className="h-4 w-4" />
                    Book
                  </button>
                </div>
              </div>
            </article>
          ))}
        </HorizontalRail>
      </section>
    </div>
  );
}
