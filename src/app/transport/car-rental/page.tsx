"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CarFront, MapPin, Minus, Plus, ShieldCheck, TimerReset, Users } from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";

const carTypes = [
  { id: "economy", name: "Economy cars",     description: "Fuel-efficient and budget-friendly",          pricePerDay: 25,  category: "Economy" },
  { id: "suv",     name: "SUVs and 4x4s",    description: "Better for multi-stop and rural routes",       pricePerDay: 65,  category: "4x4 / SUV" },
  { id: "luxury",  name: "Luxury vehicles",  description: "Premium comfort for higher-end travel",        pricePerDay: 120, category: "Luxury" },
];

type Sel = { days: number; passengers: number };

export default function CarRentalPage() {
  const router = useRouter();
  const { addToBooking } = usePayment();
  const [selections, setSelections] = useState<Record<string, Sel>>({});

  const get = (id: string): Sel => selections[id] ?? { days: 1, passengers: 1 };

  const adjust = (id: string, field: keyof Sel, delta: number, min: number, max: number) => {
    setSelections((prev) => {
      const cur = prev[id] ?? { days: 1, passengers: 1 };
      return { ...prev, [id]: { ...cur, [field]: Math.min(max, Math.max(min, cur[field] + delta)) } };
    });
  };

  const handleBook = (car: typeof carTypes[0]) => {
    const { days, passengers } = get(car.id);
    const item: BookingItem = {
      id: `car-${car.id}-${Date.now()}`,
      type: "transport",
      name: `Car Rental: ${car.name}`,
      description: `${car.category} · ${days} day${days !== 1 ? "s" : ""}`,
      price: car.pricePerDay,
      currency: "USD",
      quantity: days,
      metadata: { category: car.category, passengers, days },
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

        <div className="theme-panel-strong overflow-hidden rounded-[34px]">
          <div className="grid lg:grid-cols-[1.04fr_0.96fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="theme-chip inline-flex rounded-full px-4 py-2 text-xs uppercase tracking-[0.28em]">Car rental</div>
              <h1 className="theme-heading mt-4 text-4xl font-semibold md:text-5xl">
                Rent a car for more flexibility across your trip
              </h1>
              <p className="theme-muted mt-4 max-w-2xl text-sm leading-7 md:text-base">
                Car rental works well for multi-stop trips, scenic routes, and travelers who want to move at their own pace.
              </p>
            </div>
            <div
              className="min-h-[260px] bg-cover bg-center"
              style={{ backgroundImage: "linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.5)),url('/images/destinations/eastern-highlands.jpg')" }}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {carTypes.map((car) => {
            const { days, passengers } = get(car.id);
            return (
              <div key={car.id} className="theme-card rounded-[28px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <CarFront className="h-6 w-6 text-[#ff7352] shrink-0 mt-0.5" />
                  <span className="theme-chip rounded-full px-3 py-1 text-xs">${car.pricePerDay}/day</span>
                </div>
                <h2 className="theme-heading mt-4 text-2xl font-semibold">{car.name}</h2>
                <p className="theme-muted mt-3 text-sm leading-6">{car.description}</p>
                <div className="theme-muted mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#8cf0a1]" />Insurance options available</div>
                  <div className="flex items-center gap-2"><TimerReset className="h-4 w-4 text-[#5aa7ff]" />Flexible pickup and return</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ffca74]" />{car.category}</div>
                </div>

                {/* Days selector */}
                <div className="mt-5 flex items-center gap-3">
                  <TimerReset className="h-4 w-4 text-white/40" />
                  <span className="theme-subtle text-sm">Days</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => adjust(car.id, "days", -1, 1, 30)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="theme-heading w-6 text-center text-sm font-semibold">{days}</span>
                    <button
                      onClick={() => adjust(car.id, "days", 1, 1, 30)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Passengers selector */}
                <div className="mt-3 flex items-center gap-3">
                  <Users className="h-4 w-4 text-white/40" />
                  <span className="theme-subtle text-sm">Passengers</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => adjust(car.id, "passengers", -1, 1, 7)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="theme-heading w-6 text-center text-sm font-semibold">{passengers}</span>
                    <button
                      onClick={() => adjust(car.id, "passengers", 1, 1, 7)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-right theme-subtle text-xs">
                  Total: ${(car.pricePerDay * days).toFixed(2)} · {days} day{days !== 1 ? "s" : ""}
                </div>

                <button
                  onClick={() => handleBook(car)}
                  className="mt-4 w-full rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
                >
                  Book rental car
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
