"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  MessageCircle,
  Plane,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { getSurfaceHref } from "@/lib/app-surface";

type CategoryKey = "all" | "stays" | "things" | "events" | "transport";

type HeroSlide = {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  image: string;
  location: string;
  href: string;
};

type Category = {
  key: CategoryKey;
  label: string;
  href: string;
  iconSrc?: string;
  icon?: typeof Bus;
  color: string;
};

type Destination = {
  title: string;
  location: string;
  image: string;
  href: string;
  tag: string;
  stays: number;
  activities: number;
  rating: number;
};

type BookablePick = {
  id: string;
  category: Exclude<CategoryKey, "all">;
  title: string;
  location: string;
  image: string;
  href: string;
  rating: number | "N/A";
  reviews: number;
  price: string;
  meta: string;
  status?: "Open" | "Upcoming" | "Daily" | "Scheduled";
};

const heroSlides: HeroSlide[] = [
  {
    id: "victoria-falls",
    title: "Victoria Falls",
    eyebrow: "Featured destination",
    body: "Adventure, river views, stays, events, transfers, and local experiences in one planning flow.",
    image: "/images/victoria-falls.jpg",
    location: "Matabeleland North",
    href: "/travel-guide/victoria-falls",
  },
  {
    id: "hwange",
    title: "Hwange National Park",
    eyebrow: "Safari route",
    body: "Build a wildlife trip around camps, game drives, guides, transfers, and verified service providers.",
    image: "/images/hwange-national-park.jpg",
    location: "Hwange",
    href: "/travel-guide/hwange",
  },
  {
    id: "kariba",
    title: "Lake Kariba",
    eyebrow: "Water escape",
    body: "Houseboats, fishing, sunsets, lake stays, and slow travel plans grouped by destination.",
    image: "/images/kariba.jpg",
    location: "Mashonaland West",
    href: "/travel-guide/kariba",
  },
  {
    id: "great-zimbabwe",
    title: "Great Zimbabwe",
    eyebrow: "Heritage trip",
    body: "Turn a heritage stop into a full itinerary with nearby stays, transport, guides, and dining.",
    image: "/images/great-zimbabwe.jpg",
    location: "Masvingo",
    href: "/travel-guide/great-zimbabwe",
  },
];

const categories: Category[] = [
  {
    key: "all",
    label: "All",
    href: "/marketplace",
    icon: Search,
    color: "#ff5630",
  },
  {
    key: "stays",
    label: "Stays",
    href: "/accommodation",
    iconSrc: "/icons/mobile/accommodation.svg",
    color: "#0f7b58",
  },
  {
    key: "things",
    label: "Things to do",
    href: "/activities",
    iconSrc: "/icons/mobile/things.svg",
    color: "#2563eb",
  },
  {
    key: "events",
    label: "Events",
    href: "/events",
    iconSrc: "/icons/mobile/events.svg",
    color: "#b45309",
  },
  {
    key: "transport",
    label: "Transport",
    href: "/transport",
    icon: Bus,
    color: "#7c3aed",
  },
];

const destinations: Destination[] = [
  {
    title: "Victoria Falls",
    location: "Victoria Falls",
    image: "/images/victoria-falls.jpg",
    href: "/travel-guide/victoria-falls",
    tag: "Adventure",
    stays: 24,
    activities: 38,
    rating: 4.9,
  },
  {
    title: "Hwange",
    location: "Hwange",
    image: "/images/hwange.jpg",
    href: "/travel-guide/hwange",
    tag: "Safari",
    stays: 16,
    activities: 21,
    rating: 4.8,
  },
  {
    title: "Kariba",
    location: "Kariba",
    image: "/images/kariba.jpg",
    href: "/travel-guide/kariba",
    tag: "Lake stays",
    stays: 18,
    activities: 14,
    rating: 4.7,
  },
  {
    title: "Eastern Highlands",
    location: "Nyanga and Mutare",
    image: "/images/nyanga.jpg",
    href: "/travel-guide/eastern-highlands",
    tag: "Scenic",
    stays: 12,
    activities: 19,
    rating: 4.8,
  },
];

const bookablePicks: BookablePick[] = [
  {
    id: "old-drift",
    category: "stays",
    title: "Old Drift style river stay",
    location: "Victoria Falls",
    image: "/images/old-drift.jpg",
    href: "/accommodation",
    rating: 4.9,
    reviews: 184,
    price: "$280/night",
    meta: "Lodge",
    status: "Open",
  },
  {
    id: "hwange-camp",
    category: "stays",
    title: "Hwange safari camp",
    location: "Hwange",
    image: "/images/the-hide-safari-camp-630296-original.jpg",
    href: "/accommodation",
    rating: 4.8,
    reviews: 96,
    price: "$190/night",
    meta: "Safari stay",
    status: "Open",
  },
  {
    id: "zambezi-rafting",
    category: "things",
    title: "Zambezi rafting",
    location: "Victoria Falls",
    image: "/images/rafting.jpg",
    href: "/activities",
    rating: 4.9,
    reviews: 211,
    price: "From $120",
    meta: "Adventure",
    status: "Daily",
  },
  {
    id: "kariba-kayaking",
    category: "things",
    title: "Kariba kayaking",
    location: "Kariba",
    image: "/images/kayaking.jpg",
    href: "/activities",
    rating: 4.6,
    reviews: 72,
    price: "From $35",
    meta: "Water activity",
    status: "Daily",
  },
  {
    id: "boma-dinner",
    category: "events",
    title: "Boma dinner experience",
    location: "Victoria Falls",
    image: "/images/Boma-Dinner-Victoria-Falls-1.jpg",
    href: "/events",
    rating: 4.7,
    reviews: 128,
    price: "From $45",
    meta: "Dinner show",
    status: "Upcoming",
  },
  {
    id: "harare-vicfalls",
    category: "transport",
    title: "Harare to Victoria Falls",
    location: "Route service",
    image: "/images/slide2.jpg",
    href: "/transport",
    rating: "N/A",
    reviews: 0,
    price: "Compare",
    meta: "Bus and flight",
    status: "Scheduled",
  },
];

const trustSignals = [
  { label: "Verified providers", icon: BadgeCheck },
  { label: "Secure checkout", icon: ShieldCheck },
  { label: "Local support", icon: MessageCircle },
];

function IconMask({ src, className = "h-5 w-5" }: { src: string; className?: string }) {
  const style: CSSProperties = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };

  return <span className={`block bg-current ${className}`} style={style} aria-hidden="true" />;
}

function LocationPill({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ${
        dark
          ? "bg-white/14 text-white backdrop-blur"
          : "bg-black/[0.055] text-slate-950 dark:bg-white/10 dark:text-white"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          dark ? "bg-white text-[#ff3b30]" : "bg-white text-[#ff3b30] shadow-sm dark:bg-[#1c1c1e]"
        }`}
      >
        <MapPin className="h-3 w-3 fill-current" />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function RatingPill({
  rating,
  reviews,
  dark = false,
}: {
  rating: number | "N/A";
  reviews?: number;
  dark?: boolean;
}) {
  const value = typeof rating === "number" ? rating.toFixed(1) : rating;
  const reviewText = reviews && reviews > 0 ? ` • ${reviews}` : "";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ${
        dark
          ? "bg-white/14 text-white backdrop-blur"
          : "bg-black/[0.055] text-slate-950 dark:bg-white/10 dark:text-white"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          dark ? "bg-white text-[#daa520]" : "bg-white text-[#daa520] shadow-sm dark:bg-[#1c1c1e]"
        }`}
      >
        <Star className="h-3 w-3 fill-current" />
      </span>
      {value}
      {reviewText}
    </span>
  );
}

function StatusPill({ status }: { status: NonNullable<BookablePick["status"]> }) {
  const tone =
    status === "Open" || status === "Daily"
      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      : status === "Upcoming"
        ? "bg-amber-500/14 text-amber-700 dark:text-amber-300"
        : "bg-blue-500/12 text-blue-700 dark:text-blue-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {status}
    </span>
  );
}

function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = heroSlides[activeIndex];

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [paused]);

  const goTo = (index: number) => setActiveIndex((index + heroSlides.length) % heroSlides.length);

  return (
    <section
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[560px] lg:h-[calc(100vh-170px)] lg:min-h-[590px] lg:max-h-[680px]">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== activeIndex}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center transition-transform duration-[6500ms] ${
                index === activeIndex ? "scale-105" : "scale-100"
              }`}
              style={{ backgroundImage: `url('${slide.image}')` }}
            />
          </div>
        ))}

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.46)_46%,rgba(0,0,0,0.26)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.62)_0%,transparent_42%,rgba(0,0,0,0.28)_100%)]" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="max-w-3xl pt-8 lg:pt-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase text-white/86 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#ff5630]" />
              {activeSlide.eyebrow}
            </div>

            <p className="mt-5 text-sm font-bold uppercase text-white/62">Off2Zim</p>
            <h1 className="mt-2 max-w-4xl text-5xl font-bold leading-[1.02] text-white md:text-7xl">
              {activeSlide.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/78 md:text-lg">
              {activeSlide.body}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <LocationPill label={activeSlide.location} dark />
              <RatingPill rating={4.8} reviews={240} dark />
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Link
                href={activeSlide.href}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff5630] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff6f4d]"
              >
                Explore destination
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/trip-planner"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/16 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/16"
              >
                Start planning
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="hidden max-w-full gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`group flex min-w-[190px] items-center gap-3 rounded-lg border p-2 text-left transition ${
                    index === activeIndex
                      ? "border-white/40 bg-white/18 text-white"
                      : "border-white/12 bg-black/24 text-white/72 hover:bg-white/12"
                  }`}
                  aria-label={`Show ${slide.title}`}
                >
                  <span
                    className="h-12 w-14 shrink-0 rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url('${slide.image}')` }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{slide.title}</span>
                    <span className="mt-1 block truncate text-xs text-white/58">{slide.location}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 sm:hidden">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeIndex ? "w-7 bg-white" : "w-2.5 bg-white/42"
                    }`}
                    aria-label={`Show ${slide.title}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-black/30 text-white backdrop-blur transition hover:bg-white/12"
                aria-label="Previous destination"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-black/30 text-white backdrop-blur transition hover:bg-white/12"
                aria-label="Next destination"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryStrip({
  selected,
  onSelect,
}: {
  selected: CategoryKey;
  onSelect: (category: CategoryKey) => void;
}) {
  return (
    <section className="border-b border-black/10 bg-white/92 py-4 backdrop-blur dark:border-white/10 dark:bg-[#080808]/92">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 scrollbar-hide sm:px-6 lg:px-8">
        {categories.map((category) => {
          const LucideIcon = category.icon;
          const active = selected === category.key;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelect(category.key)}
              className={`flex min-w-max items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                active
                  ? "border-[#ff5630] bg-[#ff5630] text-white shadow-sm"
                  : "border-black/10 bg-black/[0.035] text-slate-800 hover:border-black/20 hover:bg-black/[0.055] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
              }`}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm"
                style={{ color: active ? category.color : category.color }}
              >
                {category.iconSrc ? (
                  <IconMask src={category.iconSrc} className="h-5 w-5" />
                ) : LucideIcon ? (
                  <LucideIcon className="h-5 w-5" />
                ) : null}
              </span>
              {category.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase text-slate-500 dark:text-white/42">
          {eyebrow}
        </p>
        <h2 className="mt-1 max-w-3xl text-2xl font-bold text-slate-950 dark:text-white md:text-3xl">
          {title}
        </h2>
      </div>
      {href && action ? (
        <Link
          href={href}
          className="hidden items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-black/[0.055] dark:border-white/10 dark:text-white dark:hover:bg-white/[0.07] sm:inline-flex"
        >
          {action}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={destination.href}
      className="group relative block min-h-[320px] overflow-hidden rounded-lg bg-slate-900 text-white"
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url('${destination.image}')` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.72))]" />
      <span
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-slate-950 backdrop-blur transition hover:bg-white"
        aria-hidden="true"
      >
        <Heart className="h-5 w-5" />
      </span>
      <div className="absolute left-3 top-3">
        <span className="rounded-full bg-white/88 px-3 py-1.5 text-xs font-bold text-slate-950 backdrop-blur">
          {destination.tag}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-2xl font-bold text-white">{destination.title}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <LocationPill label={destination.location} dark />
          <RatingPill rating={destination.rating} dark />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-white/82">
          <span className="rounded-md bg-white/12 px-3 py-2 backdrop-blur">
            {destination.stays} stays
          </span>
          <span className="rounded-md bg-white/12 px-3 py-2 backdrop-blur">
            {destination.activities} things to do
          </span>
        </div>
      </div>
    </Link>
  );
}

function BookableCard({ item }: { item: BookablePick }) {
  const category = categories.find((entry) => entry.key === item.category);
  const LucideIcon = category?.icon;

  return (
    <Link
      href={item.href}
      className="group block min-w-[280px] overflow-hidden rounded-lg border border-black/10 bg-white text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff5630]/50 dark:border-white/10 dark:bg-[#111111] dark:text-white sm:min-w-0"
    >
      <div className="relative h-48 overflow-hidden bg-slate-200 dark:bg-white/[0.04]">
        <div
          className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url('${item.image}')` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.56))]" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm"
            style={{ color: category?.color || "#ff5630" }}
          >
            {category?.iconSrc ? (
              <IconMask src={category.iconSrc} className="h-5 w-5" />
            ) : LucideIcon ? (
              <LucideIcon className="h-5 w-5" />
            ) : null}
          </span>
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-950 backdrop-blur">
            {item.meta}
          </span>
        </div>
        <div className="absolute bottom-3 right-3">
          <RatingPill rating={item.rating} reviews={item.reviews} dark />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-lg font-bold text-slate-950 dark:text-white">
              {item.title}
            </h3>
            <div className="mt-2">
              <LocationPill label={item.location} />
            </div>
          </div>
          {item.status ? <StatusPill status={item.status} /> : null}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
          <span className="text-base font-bold text-slate-950 dark:text-white">{item.price}</span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ff5630] text-white transition group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function PublicHomeExperience() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const visiblePicks = useMemo(
    () =>
      selectedCategory === "all"
        ? bookablePicks
        : bookablePicks.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );

  return (
    <div className="theme-page overflow-hidden">
      <HeroCarousel />
      <CategoryStrip selected={selectedCategory} onSelect={setSelectedCategory} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-3">
          {trustSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <div
                key={signal.label}
                className="flex items-center gap-3 rounded-lg border border-black/10 bg-white/88 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff5630]/12 text-[#ff5630]">
                  <Icon className="h-5 w-5" />
                </span>
                {signal.label}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Featured destinations"
          title="Start with the place, then unlock stays, activities, transport, and events around it"
          href="/travel-guide"
          action="View destinations"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {destinations.map((destination) => (
            <DestinationCard key={destination.title} destination={destination} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Bookable picks"
          title={
            selectedCategory === "all"
              ? "A compact marketplace view for planning, comparing, and booking"
              : `${categories.find((category) => category.key === selectedCategory)?.label} ready to compare`
          }
          href="/marketplace"
          action="Open marketplace"
        />
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
          {visiblePicks.map((item) => (
            <BookableCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111111]">
            <SectionHeader
              eyebrow="Plan with logic"
              title="Choose a destination once, then compare what is actually available there"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "Pick a place", body: "Start from Victoria Falls, Hwange, Kariba, Harare, or any destination page.", icon: MapPin },
                { title: "Compare options", body: "See stays, events, activities, transport, prices, ratings, and provider status.", icon: Search },
                { title: "Book or message", body: "Reserve directly, ask a provider a question, or save the item for your trip plan.", icon: ShoppingBag },
              ].map((step) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="rounded-lg bg-black/[0.035] p-4 dark:bg-white/[0.04]">
                    <Icon className="h-5 w-5 text-[#ff5630]" />
                    <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/62">{step.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-[#0f0f0f] p-5 text-white shadow-sm dark:border-white/10">
            <p className="text-xs font-bold uppercase text-white/44">Traveler workspace</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Save the trip, then keep moving.</h2>
            <div className="mt-4 grid gap-2">
              {[
                { label: "Saved places and favorites", icon: Heart },
                { label: "Trip planner with dates and transport", icon: CalendarDays },
                { label: "Provider messages and booking updates", icon: MessageCircle },
                { label: "Events, tickets, stays, and route services", icon: Ticket },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-3 text-sm font-bold text-white/84">
                    <Icon className="h-4 w-4 text-[#ff7352]" />
                    {item.label}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href={getSurfaceHref("explorer", "/login")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff5630] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff6f4d]"
              >
                Traveler login
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={getSurfaceHref("provider", "/register")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]"
              >
                Register business
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-white/78 py-6 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 text-sm font-bold text-slate-700 dark:text-white/64 sm:px-6 md:grid-cols-4 lg:px-8">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#ff5630]" />
            Live availability-ready listings
          </span>
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            Provider and traveler accounts
          </span>
          <span className="inline-flex items-center gap-2">
            <Bus className="h-4 w-4 text-blue-600" />
            Bus, flight, and transfer planning
          </span>
          <span className="inline-flex items-center gap-2">
            <Plane className="h-4 w-4 text-violet-600" />
            Destination-first marketplace
          </span>
        </div>
      </section>
    </div>
  );
}
