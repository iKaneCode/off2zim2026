"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";
import ServiceSubtypeChips from "@/components/ui/ServiceSubtypeChips";
import {
  getSubtypesForGroup,
  inferServiceSubtype,
  normalizeTaxonomyValue,
} from "@/lib/taxonomy";
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  TicketIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import {
  HeartIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Minus, Plus } from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  endDate: string;
  time: string;
  location: string;
  category: string;
  price: string;         // display string e.g. "$15 - $45"
  priceGeneral: number;  // actual price for General tier
  priceVip: number;      // actual price for VIP tier (= priceGeneral if no range)
  image: string;
  featured: boolean;
  capacity: string;
  organizer: string;
  status: string;
}

const events: Event[] = [
  {
    id: 1,
    title: "Harare International Festival of the Arts",
    description:
      "A flagship arts moment bringing music, theatre, food, and international creativity into one city-wide program.",
    date: "2026-05-01",
    endDate: "2026-05-06",
    time: "Various times",
    location: "Harare",
    category: "Arts & Culture",
    price: "$15 – $45",
    priceGeneral: 15,
    priceVip: 45,
    image: "/images/jacaranda.JPG",
    featured: true,
    capacity: "10,000+",
    organizer: "HIFA Trust",
    status: "Early access",
  },
  {
    id: 2,
    title: "Victoria Falls Carnival",
    description:
      "A destination-scale celebration with street energy, music, and year-end atmosphere in one of Zimbabwe's best-known places.",
    date: "2026-12-31",
    endDate: "2026-12-31",
    time: "18:00",
    location: "Victoria Falls",
    category: "Festival",
    price: "$20 – $60",
    priceGeneral: 20,
    priceVip: 60,
    image: "/images/victoria-falls.jpg",
    featured: true,
    capacity: "5,000+",
    organizer: "Victoria Falls Events",
    status: "Coming soon",
  },
  {
    id: 3,
    title: "Zimbabwe International Trade Fair",
    description:
      "A major business and exhibition calendar anchor for travelers combining meetings, networking, and city stays.",
    date: "2026-04-24",
    endDate: "2026-04-28",
    time: "09:00 – 17:00",
    location: "Bulawayo",
    category: "Business",
    price: "$15 – $50",
    priceGeneral: 15,
    priceVip: 50,
    image: "/images/bulawayo.jpg",
    featured: false,
    capacity: "50,000+",
    organizer: "ZITF",
    status: "Registration open",
  },
  {
    id: 4,
    title: "Intwasa Arts Festival",
    description:
      "A strong regional arts program that pairs well with Bulawayo cultural stays and city discovery.",
    date: "2026-09-26",
    endDate: "2026-09-29",
    time: "Various times",
    location: "Bulawayo",
    category: "Arts & Culture",
    price: "$8 – $25",
    priceGeneral: 8,
    priceVip: 25,
    image: "/images/bulawayo.jpg",
    featured: true,
    capacity: "8,000+",
    organizer: "Intwasa Arts",
    status: "Early access",
  },
  {
    id: 5,
    title: "Lake Kariba Tiger Fishing Tournament",
    description:
      "A multi-day sports event that works well for group itineraries, stays, and lakeside transport planning.",
    date: "2026-10-15",
    endDate: "2026-10-18",
    time: "06:00 – 18:00",
    location: "Kariba",
    category: "Sport",
    price: "$100 – $300",
    priceGeneral: 100,
    priceVip: 300,
    image: "/images/destinations/eastern-highlands.jpg",
    featured: false,
    capacity: "500",
    organizer: "Zimbabwe Fishing Association",
    status: "Tickets available",
  },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToBooking } = usePayment();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSubtype, setActiveSubtype] = useState(searchParams?.get("subtype") || "all");
  const destinationParam = searchParams?.get("destination");
  const initialLocation = destinationParam
    ? destinationParam
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "All";
  const [activeLocation, setActiveLocation] = useState(initialLocation);

  const categories = ["All", ...Array.from(new Set(events.map((event) => event.category)))];
  const locations = ["All", ...Array.from(new Set(events.map((event) => event.location)))];

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesCategory = activeCategory === "All" || event.category === activeCategory;
      const matchesSubtype =
        activeSubtype === "all" ||
        inferServiceSubtype({
          category: "Event",
          listingType: event.category,
          title: event.title,
          metadata: { serviceGroup: "events", serviceSubtype: event.category },
        })?.id === activeSubtype ||
        normalizeTaxonomyValue(event.category) === activeSubtype;
      const matchesLocation =
        activeLocation === "All" ||
        normalizeTaxonomyValue(event.location).includes(normalizeTaxonomyValue(activeLocation)) ||
        normalizeTaxonomyValue(activeLocation).includes(normalizeTaxonomyValue(event.location));
      const matchesSearch =
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term);
      return matchesCategory && matchesSubtype && matchesLocation && matchesSearch;
    });
  }, [activeCategory, activeLocation, activeSubtype, search]);

  const featured = filteredEvents.filter((event) => event.featured);

  const handleBookEvent = (event: Event, qty: number, tier: "general" | "vip") => {
    const ticketPrice = tier === "vip" ? event.priceVip : event.priceGeneral;
    const bookingItem: BookingItem = {
      id: `event_${event.id}_${Date.now()}`,
      type: "activity",
      name: event.title,
      description: `${tier === "vip" ? "VIP" : "General"} ticket · ${event.title}`,
      price: ticketPrice,
      currency: "USD",
      category: "events",
      quantity: qty,
      metadata: {
        tier,
        date: event.date,
        endDate: event.endDate,
        location: event.location,
        time: event.time,
        capacity: event.capacity,
        organizer: event.organizer,
        category: event.category,
        image: event.image,
        priceGeneral: event.priceGeneral,
        priceVip: event.priceVip,
      },
    };

    addToBooking(bookingItem);
    router.push("/checkout");
  };

  return (
    <div className="theme-page pb-20">
      <CompactPageHero
        eyebrow="Events"
        title="Find events worth building your trip around"
        description="Festivals, cultural showcases, and live events across Zimbabwe. Filter by destination or date, pick your tickets, and add them straight to your itinerary or cart."
        imageUrl="/images/victoria-falls.jpg"
      >
        <div className="rounded-xl border border-white/12 bg-black/35 p-3 backdrop-blur">
          <div className="grid gap-2 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/12 bg-white/95 pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-500"
                placeholder="Search event, city, or vibe"
              />
            </div>
            <select
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
              className="h-11 rounded-lg border border-white/12 bg-white/95 px-3 text-sm text-slate-950 outline-none"
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <select
              value={activeLocation}
              onChange={(event) => setActiveLocation(event.target.value)}
              className="h-11 rounded-lg border border-white/12 bg-white/95 px-3 text-sm text-slate-950 outline-none"
            >
              {locations.map((location) => (
                <option key={location}>{location}</option>
              ))}
            </select>
          </div>
          <ServiceSubtypeChips
            subtypes={getSubtypesForGroup("events")}
            activeSubtype={activeSubtype}
            onSelect={setActiveSubtype}
            allLabel="All events"
            className="mt-3"
          />
        </div>
      </CompactPageHero>

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <AppServiceStrip activeLabel="Events" />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <CompactSectionHeader
            eyebrow="Featured"
            title="Strong travel pull"
            count={`${featured.length} highlighted`}
          />
          <HorizontalRail itemClassName="w-[82vw] max-w-[320px] sm:w-[300px]">
            {(featured.length ? featured : filteredEvents).map((event) => (
              <EventCard key={`featured-${event.id}`} event={event} onBook={handleBookEvent} />
            ))}
          </HorizontalRail>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <CompactSectionHeader
            eyebrow="Explore more"
            title="Happening around Zimbabwe"
            count={`${filteredEvents.length} results`}
          />
          <HorizontalRail itemClassName="w-[82vw] max-w-[320px] sm:w-[300px]">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} onBook={handleBookEvent} />
            ))}
          </HorizontalRail>
        </div>
      </section>
    </div>
  );
}

function EventCard({
  event,
  onBook,
}: {
  event: Event;
  onBook: (event: Event, qty: number, tier: "general" | "vip") => void;
}) {
  const [qty, setQty] = useState(1);
  const [tier, setTier] = useState<"general" | "vip">("general");
  const hasVip = event.priceVip > event.priceGeneral;
  const ticketPrice = tier === "vip" ? event.priceVip : event.priceGeneral;
  const lineTotal = ticketPrice * qty;

  return (
    <article className="theme-card flex h-[372px] flex-col overflow-hidden rounded-xl">
      <div
        className="relative min-h-[98px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.55)), url('${event.image}')`,
        }}
      >
        <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {event.status}
        </div>
        <button className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white backdrop-blur">
          <HeartIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="theme-label text-xs uppercase tracking-[0.24em]">{event.category}</div>
        <h3 className="theme-heading mt-1 line-clamp-2 text-lg font-semibold" title={event.description}>
          {event.title}
        </h3>

        <div className="theme-muted mt-2 grid grid-cols-2 gap-1 text-xs">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 text-[#ff7352]" />
            {formatDate(event.date)}
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-[#5aa7ff]" />
            {event.time}
          </div>
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-[#ff7352]" />
            {event.location}
          </div>
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-4 w-4 text-[#8cf0a1]" />
            {event.capacity} capacity
          </div>
        </div>

        {/* Ticket tier selector */}
        <div className="mt-3 border-t border-white/[0.07] pt-3">
          <p className="theme-subtle mb-2 flex items-center gap-1.5 text-xs">
            <TicketIcon className="h-3.5 w-3.5" /> Select ticket tier
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTier("general")}
              className={`flex flex-col items-center rounded-xl border px-3 py-2 text-xs transition-colors ${
                tier === "general"
                  ? "border-[#ff5630] bg-[#ff5630]/10 text-[#ff7352]"
                  : "border-white/[0.08] bg-white/[0.03] theme-muted hover:bg-white/[0.06]"
              }`}
            >
              <span className="font-semibold">General</span>
              <span className="mt-0.5 text-base font-bold">${event.priceGeneral}</span>
            </button>
            {hasVip && (
              <button
                onClick={() => setTier("vip")}
                className={`flex flex-col items-center rounded-xl border px-3 py-2 text-xs transition-colors ${
                  tier === "vip"
                    ? "border-[#ffc247] bg-[#ffc247]/10 text-[#ffc247]"
                    : "border-white/[0.08] bg-white/[0.03] theme-muted hover:bg-white/[0.06]"
                }`}
              >
                <span className="font-semibold">VIP</span>
                <span className="mt-0.5 text-base font-bold">${event.priceVip}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quantity + total */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors disabled:opacity-30"
              disabled={qty <= 1}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="theme-heading w-6 text-center text-sm font-semibold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="theme-subtle ml-1 text-xs">ticket{qty !== 1 ? "s" : ""}</span>
          </div>
          <div className="text-right">
            <span className="theme-heading text-lg font-bold">${lineTotal.toFixed(2)}</span>
            <p className="theme-subtle text-xs">${ticketPrice} × {qty}</p>
          </div>
        </div>

        <button
          onClick={() => onBook(event, qty, tier)}
          className="mt-3 w-full rounded-lg bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
        >
          Book {qty} {tier === "vip" ? "VIP" : "General"} ticket{qty !== 1 ? "s" : ""}
        </button>

        <div className="theme-muted mt-3 border-t border-white/[0.06] pt-2 text-xs">
          Hosted by {event.organizer}
        </div>
      </div>
    </article>
  );
}
