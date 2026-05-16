"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bus, Clock3, MapPin, Route, Users } from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";

const routes = [
  { id: "hre-byo",  from: "Harare",   to: "Bulawayo",       duration: "4–5 hrs",  price: 12, operators: ["Intercity", "Pioneer"] },
  { id: "hre-vic",  from: "Harare",   to: "Victoria Falls", duration: "7–8 hrs",  price: 18, operators: ["Intercity", "Shu-Shine"] },
  { id: "byo-vic",  from: "Bulawayo", to: "Victoria Falls", duration: "3–4 hrs",  price: 10, operators: ["Citiliner", "Pathfinder"] },
  { id: "hre-mut",  from: "Harare",   to: "Mutare",         duration: "3–4 hrs",  price: 8,  operators: ["Intercity", "Eagle"] },
];

export default function BusTransportPage() {
  const router = useRouter();
  const { addToBooking } = usePayment();
  const [passengers, setPassengers] = useState<Record<string, number>>({});

  const getPassengers = (id: string) => passengers[id] ?? 1;

  const handleBook = (route: typeof routes[0]) => {
    const qty = getPassengers(route.id);
    const item: BookingItem = {
      id: `bus-${route.id}-${Date.now()}`,
      type: "transport",
      name: `Bus: ${route.from} → ${route.to}`,
      description: `Intercity bus — ${route.duration}`,
      price: route.price,
      currency: "USD",
      quantity: qty,
      metadata: { from: route.from, to: route.to, duration: route.duration, operators: route.operators },
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
          eyebrow="Bus transport"
          title="Compare bus routes for affordable travel across Zimbabwe"
          description="Browse practical intercity routes, compare operators, and book seats for the next leg of your trip."
          imageUrl="/images/slide1.jpg"
          className="px-0 pb-0 pt-0"
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <CompactSectionHeader eyebrow="Bus routes" title="Choose a route" />
        <HorizontalRail itemClassName="w-[82vw] max-w-[320px] sm:w-[300px]">
          {routes.map((route) => (
            <div key={route.id} className="theme-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <Bus className="h-6 w-6 text-[#ff7352] shrink-0 mt-0.5" />
                <span className="theme-chip rounded-full px-3 py-1 text-xs">${route.price}/seat</span>
              </div>
              <h2 className="theme-heading mt-3 text-xl font-semibold">{route.from} → {route.to}</h2>
              <div className="theme-muted mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#5aa7ff]" />{route.duration}</div>
                <div className="flex items-center gap-2"><Route className="h-4 w-4 text-[#8cf0a1]" />{route.operators.join(" · ")}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ffca74]" />{route.from} to {route.to}</div>
              </div>

              {/* Passenger selector */}
              <div className="mt-4 flex items-center gap-3">
                <Users className="h-4 w-4 text-white/40" />
                <span className="theme-subtle text-sm">Passengers</span>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => setPassengers((p) => ({ ...p, [route.id]: Math.max(1, getPassengers(route.id) - 1) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors">−</button>
                  <span className="theme-heading w-6 text-center text-sm font-semibold">{getPassengers(route.id)}</span>
                  <button onClick={() => setPassengers((p) => ({ ...p, [route.id]: getPassengers(route.id) + 1 }))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors">+</button>
                </div>
              </div>

              <div className="mt-2 text-right theme-subtle text-xs">
                Total: ${(route.price * getPassengers(route.id)).toFixed(2)}
              </div>

              <button onClick={() => handleBook(route)}
                className="mt-4 w-full rounded-lg bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors">
                  Book bus route
              </button>
            </div>
          ))}
        </HorizontalRail>
      </section>
    </div>
  );
}
