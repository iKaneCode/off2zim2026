"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CarTaxiFront, CreditCard, Minus, Navigation, Plus, ShieldCheck, Users } from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";

const taxiServices = [
  { id: "city",    name: "City taxi",        description: "Quick movement inside the city",                 price: 2.5 },
  { id: "airport", name: "Airport transfer", description: "Reliable pickup and drop-off",                   price: 25 },
  { id: "luxury",  name: "Luxury taxi",      description: "Higher-comfort movement for premium travel",     price: 8 },
];

export default function TaxiPage() {
  const router = useRouter();
  const { addToBooking } = usePayment();
  const [passengers, setPassengers] = useState<Record<string, number>>({});

  const getPax = (id: string) => passengers[id] ?? 1;

  const handleBook = (taxi: typeof taxiServices[0]) => {
    const qty = getPax(taxi.id);
    const item: BookingItem = {
      id: `taxi-${taxi.id}-${Date.now()}`,
      type: "transport",
      name: `Taxi: ${taxi.name}`,
      description: `${taxi.description} · ${qty} passenger${qty !== 1 ? "s" : ""}`,
      price: taxi.price,
      currency: "USD",
      quantity: qty,
      metadata: { serviceType: taxi.name },
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
          eyebrow="Taxi services"
          title="Book taxis for airport transfers and local travel"
          description="Use taxis for airport pickup, city rides, and simple local transfers without extra planning stress."
          imageUrl="/images/jacaranda.JPG"
          className="px-0 pb-0 pt-0"
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <CompactSectionHeader eyebrow="Taxi options" title="Choose a ride type" />
        <HorizontalRail itemClassName="w-[82vw] max-w-[320px] sm:w-[300px]">
          {taxiServices.map((taxi) => {
            const qty = getPax(taxi.id);
            return (
              <div key={taxi.id} className="theme-card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <CarTaxiFront className="h-6 w-6 text-[#ff7352] shrink-0 mt-0.5" />
                  <span className="theme-chip rounded-full px-3 py-1 text-xs">From ${taxi.price}</span>
                </div>
                <h2 className="theme-heading mt-3 text-xl font-semibold">{taxi.name}</h2>
                <p className="theme-muted mt-2 text-sm leading-6">{taxi.description}</p>
                <div className="theme-muted mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Navigation className="h-4 w-4 text-[#5aa7ff]" />Station, hotel, and airport transfers</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#8cf0a1]" />Clear, reliable transfer options</div>
                  <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#ffca74]" />${taxi.price}/ride</div>
                </div>

                {/* Passengers selector */}
                <div className="mt-4 flex items-center gap-3">
                  <Users className="h-4 w-4 text-white/40" />
                  <span className="theme-subtle text-sm">Passengers</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setPassengers((p) => ({ ...p, [taxi.id]: Math.max(1, getPax(taxi.id) - 1) }))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="theme-heading w-6 text-center text-sm font-semibold">{qty}</span>
                    <button
                      onClick={() => setPassengers((p) => ({ ...p, [taxi.id]: getPax(taxi.id) + 1 }))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-right theme-subtle text-xs">
                  Total: ${(taxi.price * qty).toFixed(2)}
                </div>

                <button
                  onClick={() => handleBook(taxi)}
                  className="mt-4 w-full rounded-lg bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
                >
                  Book ride
                </button>
              </div>
            );
          })}
        </HorizontalRail>
      </section>
    </div>
  );
}
