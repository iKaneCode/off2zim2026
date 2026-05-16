"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Minus, Plane, Plus, Sparkles, Ticket, Users } from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";

const flightRoutes = [
  { id: "hre-vfa", route: "Harare to Victoria Falls",          duration: "1h 15m", price: 180 },
  { id: "hre-byo", route: "Harare to Bulawayo",                duration: "1h 05m", price: 160 },
  { id: "vfa-jnb", route: "Victoria Falls to Johannesburg",    duration: "1h 45m", price: 290 },
  { id: "hre-cpt", route: "Harare to Cape Town",               duration: "2h 15m", price: 320 },
];

export default function FlightsPage() {
  const router = useRouter();
  const { addToBooking } = usePayment();
  const [passengers, setPassengers] = useState<Record<string, number>>({});

  const getPax = (id: string) => passengers[id] ?? 1;

  const handleBook = (flight: typeof flightRoutes[0]) => {
    const qty = getPax(flight.id);
    const item: BookingItem = {
      id: `flight-${flight.id}-${Date.now()}`,
      type: "transport",
      name: `Flight: ${flight.route}`,
      description: `${flight.duration} · ${qty} passenger${qty !== 1 ? "s" : ""}`,
      price: flight.price,
      currency: "USD",
      quantity: qty,
      metadata: { route: flight.route, duration: flight.duration },
    };
    addToBooking(item);
    router.push("/checkout");
  };

  return (
    <div className="theme-page pb-20">
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <Link href="/transport" className="inline-flex items-center gap-2 theme-muted text-sm mb-4 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Transport
        </Link>

        <CompactPageHero
          eyebrow="Transport: Flights"
          title="Compare flights for faster travel across Zimbabwe and the region"
          description="Flights sit under Transport. Use them when time matters most and flying makes your itinerary easier."
          imageUrl="/images/victoria-falls.jpg"
          className="px-0 pb-0 pt-0"
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <CompactSectionHeader eyebrow="Flight routes" title="Choose an air route" />
        <HorizontalRail itemClassName="w-[82vw] max-w-[320px] sm:w-[300px]">
          {flightRoutes.map((flight) => {
            const qty = getPax(flight.id);
            return (
              <div key={flight.id} className="theme-card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <Plane className="h-6 w-6 text-[#ff7352] shrink-0 mt-0.5" />
                  <span className="theme-chip rounded-full px-3 py-1 text-xs">From ${flight.price}</span>
                </div>
                <h2 className="theme-heading mt-3 text-xl font-semibold">{flight.route}</h2>
                <div className="theme-muted mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#5aa7ff]" />{flight.duration}</div>
                  <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#8cf0a1]" />Cuts down long travel days</div>
                  <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-[#ffca74]" />${flight.price}/person</div>
                </div>

                {/* Passengers selector */}
                <div className="mt-4 flex items-center gap-3">
                  <Users className="h-4 w-4 text-white/40" />
                  <span className="theme-subtle text-sm">Passengers</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setPassengers((p) => ({ ...p, [flight.id]: Math.max(1, getPax(flight.id) - 1) }))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="theme-heading w-6 text-center text-sm font-semibold">{qty}</span>
                    <button
                      onClick={() => setPassengers((p) => ({ ...p, [flight.id]: getPax(flight.id) + 1 }))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-right theme-subtle text-xs">
                  Total: ${(flight.price * qty).toFixed(2)}
                </div>

                <button
                  onClick={() => handleBook(flight)}
                  className="mt-4 w-full rounded-lg bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
                >
                  Book flight
                </button>
              </div>
            );
          })}
        </HorizontalRail>
      </section>
    </div>
  );
}
