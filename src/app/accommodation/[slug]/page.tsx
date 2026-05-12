"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Calendar, CheckCircle2, MapPin, Star, Users, Wifi,
  Coffee, Dumbbell, Waves, TreePine, Telescope, Utensils,
} from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi:        <Wifi className="h-4 w-4" />,
  Pool:        <Waves className="h-4 w-4" />,
  Spa:         <Dumbbell className="h-4 w-4" />,
  Restaurant:  <Utensils className="h-4 w-4" />,
  Dining:      <Utensils className="h-4 w-4" />,
  Bar:         <Coffee className="h-4 w-4" />,
  Safari:      <Telescope className="h-4 w-4" />,
  "Game Drives":<Telescope className="h-4 w-4" />,
  Guides:      <Telescope className="h-4 w-4" />,
  "All Meals": <Utensils className="h-4 w-4" />,
  Transfers:   <TreePine className="h-4 w-4" />,
};

const accommodations = [
  {
    slug: "palm-river-hotel",
    name: "Palm River Hotel",
    type: "Luxury Hotel",
    location: "Victoria Falls",
    price: 320,
    priceUnit: "/night",
    rating: 4.9,
    reviews: 1567,
    image: "/images/palm-river-hotel-604329-original.jpg",
    images: ["/images/palm-river-hotel-604329-original.jpg", "/images/victoria-falls.jpg"],
    amenities: ["WiFi", "Pool", "Spa", "Transfers", "Restaurant", "Bar"],
    description: "Riverfront luxury with polished service and a serene Falls-side atmosphere. The Palm River Hotel delivers an immersive Victoria Falls experience with world-class hospitality, breathtaking views, and curated safari excursions from the front door.",
    highlights: ["Private river access", "Falls-view suites", "Daily guided excursions", "Fine dining restaurant"],
    maxGuests: 4,
    availability: "Verified",
  },
  {
    slug: "old-drift-lodge",
    name: "Old Drift Lodge",
    type: "Safari Lodge",
    location: "Victoria Falls",
    price: 450,
    priceUnit: "/night",
    rating: 4.8,
    reviews: 932,
    image: "/images/old-drift.jpg",
    images: ["/images/old-drift.jpg", "/images/victoria-falls.jpg"],
    amenities: ["Game Drives", "All Meals", "Pool", "WiFi", "Guides"],
    description: "A cinematic bush-and-river stay designed for premium wildlife escapes. Old Drift Lodge sits inside the Zambezi National Park, offering all-inclusive stays with twice-daily game drives, expert guides, and intimate candlelit dining.",
    highlights: ["Inside national park", "All-inclusive package", "Expert wildlife guides", "Candlelit dining"],
    maxGuests: 3,
    availability: "Filling Fast",
  },
  {
    slug: "somalisa-camp",
    name: "Somalisa Camp",
    type: "Safari Camp",
    location: "Hwange",
    price: 385,
    priceUnit: "/night",
    rating: 4.9,
    reviews: 511,
    image: "/images/african-bush-camps-somalisa-camp-604482-original.jpg",
    images: ["/images/african-bush-camps-somalisa-camp-604482-original.jpg", "/images/hwange.jpg"],
    amenities: ["Safari", "Dining", "Pool", "Guides"],
    description: "Immersive wildlife accommodation for travelers chasing iconic Hwange moments. Somalisa sits in the heart of Hwange National Park, surrounded by elephant herds, and offers some of Zimbabwe's finest guided safari experiences.",
    highlights: ["Elephant herds", "Walking safaris", "Stargazing deck", "Remote wilderness"],
    maxGuests: 2,
    availability: "Verified",
  },
  {
    slug: "ivory-lodge",
    name: "Ivory Lodge",
    type: "Boutique Stay",
    location: "Binga",
    price: 180,
    priceUnit: "/night",
    rating: 4.6,
    reviews: 278,
    image: "/images/ivoryLodge.jpg",
    images: ["/images/ivoryLodge.jpg"],
    amenities: ["Lake Views", "Restaurant", "WiFi", "Bar"],
    description: "Relaxed lakeside comfort with warm local hospitality and sunset character. Ivory Lodge sits on the shores of Lake Kariba, offering a quieter pace with spectacular sunsets, fresh lake cuisine, and close-up wildlife encounters.",
    highlights: ["Lake Kariba views", "Sunset cruises", "Fishing excursions", "Local cuisine"],
    maxGuests: 4,
    availability: "Available",
  },
  {
    slug: "safari-camp-retreat",
    name: "Safari Camp Retreat",
    type: "Bush Camp",
    location: "Mana Pools",
    price: 290,
    priceUnit: "/night",
    rating: 4.7,
    reviews: 344,
    image: "/images/safariCamp1.jpg",
    images: ["/images/safariCamp1.jpg"],
    amenities: ["Guided Walks", "Dining", "River Access", "Firepit"],
    description: "Quiet, story-rich accommodation made for travelers who want nature up close. Mana Pools is a UNESCO World Heritage Site known for canoeing, walking safaris alongside big game, and an unspoiled wilderness experience.",
    highlights: ["UNESCO site", "Canoe safaris", "Walking with elephants", "Riverside camp"],
    maxGuests: 2,
    availability: "Limited",
  },
  {
    slug: "bush-camps-collection",
    name: "Bush Camps Collection",
    type: "Curated Collection",
    location: "Zimbabwe Circuit",
    price: 210,
    priceUnit: "/night",
    rating: 4.5,
    reviews: 189,
    image: "/images/bush-camps.jpg",
    images: ["/images/bush-camps.jpg"],
    amenities: ["Multi-stop", "Curated", "Local Support", "Flexible"],
    description: "A curated set of camp stays for multi-destination itineraries across Zimbabwe. Perfect for travelers who want to move through multiple parks and destinations, with local support and flexible scheduling at each stop.",
    highlights: ["Multi-destination", "Flexible scheduling", "Local guide network", "Itinerary planning"],
    maxGuests: 4,
    availability: "Available",
  },
];

function statusClasses(status: string) {
  if (status === "Verified")     return "bg-[#0f2a1e] text-[#4ade80]";
  if (status === "Filling Fast") return "bg-[#2a1f00] text-[#ffc247]";
  if (status === "Limited")      return "bg-[#2a0f0a] text-[#ff8a78]";
  return "bg-white/[0.08] text-white/60";
}

export default function AccommodationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { addToBooking } = usePayment();

  const stay = accommodations.find((a) => a.slug === slug);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [checkIn, setCheckIn]   = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests]     = useState(2);
  const [special, setSpecial]   = useState("");
  const [activeImg, setActiveImg] = useState(0);

  if (!stay) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center px-4">
        <div className="theme-panel rounded-[32px] p-10 text-center max-w-md">
          <h1 className="theme-heading text-2xl font-semibold">Stay not found</h1>
          <p className="theme-muted mt-2 text-sm">This accommodation is not available or may have been removed.</p>
          <Link href="/accommodation" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to stays
          </Link>
        </div>
      </div>
    );
  }

  const nights = Math.max(1, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));
  const subtotal = stay.price * nights * guests;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const handleBook = () => {
    const item: BookingItem = {
      id: `stay-${stay.slug}-${Date.now()}`,
      type: "accommodation",
      name: stay.name,
      description: stay.description,
      price: stay.price,
      currency: "USD",
      quantity: guests,
      checkIn,
      checkOut,
      guests,
      metadata: { location: stay.location, type: stay.type, image: stay.image, special, nights },
    };
    addToBooking(item);
    router.push("/checkout");
  };

  return (
    <div className="theme-page min-h-screen pb-20">
      {/* Back */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/accommodation" className="inline-flex items-center gap-2 theme-muted text-sm hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to stays
        </Link>
      </div>

      {/* Image gallery */}
      <div className="mx-auto max-w-7xl px-4 mt-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] h-72 sm:h-96">
          <img
            src={stay.images[activeImg] ?? stay.image}
            alt={stay.name}
            className="h-full w-full object-cover"
          />
          <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium ${statusClasses(stay.availability)}`}>
            {stay.availability}
          </div>
          {stay.images.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              {stay.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${i === activeImg ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 mt-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* Left */}
          <div className="space-y-6">
            <div>
              <p className="theme-label text-xs uppercase tracking-[0.24em]">{stay.type}</p>
              <h1 className="theme-heading mt-2 text-4xl font-semibold">{stay.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 theme-muted text-sm">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#ff7352]" />{stay.location}</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#ffc247] text-[#ffc247]" />{stay.rating} · {stay.reviews.toLocaleString()} reviews</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-[#5aa7ff]" />Up to {stay.maxGuests} guests</span>
              </div>
            </div>

            <div className="theme-panel rounded-[24px] p-5">
              <h2 className="theme-heading font-semibold mb-3">About this stay</h2>
              <p className="theme-muted text-sm leading-7">{stay.description}</p>
            </div>

            <div className="theme-panel rounded-[24px] p-5">
              <h2 className="theme-heading font-semibold mb-4">What&apos;s included</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {stay.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.04] border border-white/[0.06] px-3 py-2.5">
                    <span className="text-[#ff7352]">{AMENITY_ICONS[amenity] ?? <CheckCircle2 className="h-4 w-4" />}</span>
                    <span className="theme-muted text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="theme-panel rounded-[24px] p-5">
              <h2 className="theme-heading font-semibold mb-4">Highlights</h2>
              <div className="space-y-2">
                {stay.highlights.map((h) => (
                  <div key={h} className="flex items-center gap-2.5 theme-muted text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4ade80]" />
                    {h}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: booking form */}
          <div>
            <div className="theme-panel sticky top-6 rounded-[28px] p-6 space-y-5">
              <div className="flex items-baseline gap-1">
                <span className="theme-heading text-3xl font-bold">${stay.price}</span>
                <span className="theme-subtle text-sm">/night</span>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs theme-subtle mb-1.5">Check-in</label>
                  <input type="date" value={checkIn} min={today}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="theme-input w-full rounded-[14px] px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs theme-subtle mb-1.5">Check-out</label>
                  <input type="date" value={checkOut} min={checkIn}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="theme-input w-full rounded-[14px] px-3 py-2.5 text-sm" />
                </div>
              </div>

              {/* Nights summary */}
              <div className="flex items-center gap-2 rounded-[14px] bg-white/[0.04] border border-white/[0.06] px-3 py-2.5">
                <Calendar className="h-4 w-4 text-[#8dc9ff]" />
                <span className="theme-muted text-sm">{nights} night{nights !== 1 ? "s" : ""}</span>
              </div>

              {/* Guests */}
              <div>
                <label className="block text-xs theme-subtle mb-1.5">Guests</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors">
                    −
                  </button>
                  <span className="theme-heading w-8 text-center font-semibold">{guests}</span>
                  <button onClick={() => setGuests((g) => Math.min(stay.maxGuests, g + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.07] transition-colors">
                    +
                  </button>
                  <span className="theme-subtle text-xs">max {stay.maxGuests}</span>
                </div>
              </div>

              {/* Special requests */}
              <div>
                <label className="block text-xs theme-subtle mb-1.5">Special requests (optional)</label>
                <textarea rows={3} value={special} onChange={(e) => setSpecial(e.target.value)}
                  className="theme-input w-full rounded-[14px] px-3 py-2.5 text-sm resize-none"
                  placeholder="Dietary needs, room preferences, arrival time…" />
              </div>

              {/* Price breakdown */}
              <div className="border-t border-white/[0.08] pt-4 space-y-2 text-sm">
                <div className="flex justify-between theme-muted">
                  <span>${stay.price} × {nights} night{nights !== 1 ? "s" : ""} × {guests} guest{guests !== 1 ? "s" : ""}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between theme-muted"><span>VAT (15%)</span><span>${vat.toFixed(2)}</span></div>
                <div className="flex justify-between theme-heading font-semibold text-base border-t border-white/[0.08] pt-2.5 mt-1">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handleBook}
                className="w-full rounded-full bg-[#ff5630] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors">
                Reserve this stay
              </button>

              <p className="text-center text-xs theme-subtle">You will not be charged yet. This sends a booking request.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
