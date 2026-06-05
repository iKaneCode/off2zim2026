"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Plane,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

type FeedSectionKey = "stays" | "events" | "things" | "bus" | "flights";

type CarouselItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  location: string;
  image: string;
  href: string;
  stats: Array<{ label: string; value: string }>;
};

type DestinationItem = {
  id: string;
  name: string;
  weather: string;
  image: string;
  href: string;
};

type FeedItem = {
  id: string;
  section: FeedSectionKey;
  name: string;
  location?: string;
  route?: string;
  venue?: string;
  dateLabel?: string;
  image: string;
  href: string;
  rating: number | "N/A";
  status?: string;
  amenities?: string[];
};

const carouselItems: CarouselItem[] = [
  {
    id: "victoria-falls",
    eyebrow: "Featured",
    title: "Victoria Falls, arranged around the way you travel.",
    description:
      "Stays, events, transport, experiences, and trip planning brought together in one destination-led flow.",
    location: "Victoria Falls",
    image: "/images/victoria-falls.jpg",
    href: "/travel-guide/victoria-falls",
    stats: [
      { label: "Stays", value: "24+" },
      { label: "Trips", value: "38" },
      { label: "Best for", value: "Adventure" },
    ],
  },
  {
    id: "hwange",
    eyebrow: "Safari route",
    title: "Hwange stays, drives, and transfers in one view.",
    description:
      "Compare safari camps, guided activities, transport routes, and local support without losing the trip context.",
    location: "Hwange",
    image: "/images/hwange-national-park.jpg",
    href: "/travel-guide/hwange",
    stats: [
      { label: "Stays", value: "16+" },
      { label: "Routes", value: "6" },
      { label: "Best for", value: "Safari" },
    ],
  },
  {
    id: "eastern-highlands",
    eyebrow: "Scenic escape",
    title: "Eastern Highlands with room to slow down.",
    description:
      "Discover mountain stays, trails, scenic drives, local guides, and flexible planning for quieter Zimbabwe travel.",
    location: "Nyanga",
    image: "/images/nyanga.jpg",
    href: "/travel-guide/eastern-highlands",
    stats: [
      { label: "Guides", value: "12" },
      { label: "Routes", value: "8" },
      { label: "Best for", value: "Scenery" },
    ],
  },
  {
    id: "kariba",
    eyebrow: "Lake escape",
    title: "Kariba weekends with stays, boats, and sunsets.",
    description:
      "Keep lake stays, houseboats, fishing, transfers, and activity options in a calmer planning surface.",
    location: "Kariba",
    image: "/images/kariba.jpg",
    href: "/travel-guide/kariba",
    stats: [
      { label: "Stays", value: "18" },
      { label: "Water", value: "Lake" },
      { label: "Best for", value: "Groups" },
    ],
  },
];

const destinations: DestinationItem[] = [
  {
    id: "victoria-falls",
    name: "Victoria Falls",
    weather: "Adventure",
    image: "/images/destinations/victoria-falls.jpg",
    href: "/travel-guide/victoria-falls",
  },
  {
    id: "hwange",
    name: "Hwange",
    weather: "Safari",
    image: "/images/destinations/hwange.jpg",
    href: "/travel-guide/hwange",
  },
  {
    id: "kariba",
    name: "Kariba",
    weather: "Lake",
    image: "/images/destinations/lake-kariba.jpg",
    href: "/travel-guide/kariba",
  },
  {
    id: "great-zimbabwe",
    name: "Great Zimbabwe",
    weather: "Heritage",
    image: "/images/destinations/great-zimbabwe.jpg",
    href: "/travel-guide/great-zimbabwe",
  },
  {
    id: "eastern-highlands",
    name: "Eastern Highlands",
    weather: "Scenic",
    image: "/images/nyanga.jpg",
    href: "/travel-guide/eastern-highlands",
  },
];

const feedItems: FeedItem[] = [
  {
    id: "old-drift",
    section: "stays",
    name: "Old Drift Lodge",
    location: "Victoria Falls",
    image: "/images/old-drift.jpg",
    href: "/accommodation",
    rating: 4.9,
    amenities: ["WiFi", "Pool", "Restaurant"],
  },
  {
    id: "the-hide",
    section: "stays",
    name: "The Hide Safari Camp",
    location: "Hwange",
    image: "/images/the-hide-safari-camp-630296-original.jpg",
    href: "/accommodation",
    rating: 4.8,
    amenities: ["Safari", "Meals", "Transfer"],
  },
  {
    id: "kariba-lodge",
    section: "stays",
    name: "Kariba Lake Stay",
    location: "Kariba",
    image: "/images/kariba.jpg",
    href: "/accommodation",
    rating: 4.7,
    amenities: ["Lake", "Fishing", "Boat"],
  },
  {
    id: "boma-dinner",
    section: "events",
    name: "Boma Dinner",
    location: "Victoria Falls",
    venue: "Victoria Falls",
    dateLabel: "Tonight",
    image: "/images/Boma-Dinner-Victoria-Falls-1.jpg",
    href: "/events",
    rating: 4.7,
  },
  {
    id: "jazz-festival",
    section: "events",
    name: "Zimbabwe Jazz Festival",
    location: "Harare",
    venue: "Harare Gardens",
    dateLabel: "Sep 12",
    image: "/images/jacaranda.JPG",
    href: "/events",
    rating: 4.6,
  },
  {
    id: "falls-marathon",
    section: "events",
    name: "Victoria Falls Marathon",
    location: "Victoria Falls",
    venue: "Falls Bridge",
    dateLabel: "Sep 20",
    image: "/images/victoria-falls.jpg",
    href: "/events",
    rating: 4.9,
  },
  {
    id: "rafting",
    section: "things",
    name: "White Water Rafting",
    location: "Victoria Falls",
    status: "Open",
    image: "/images/rafting.jpg",
    href: "/activities",
    rating: 4.9,
  },
  {
    id: "kayaking",
    section: "things",
    name: "Kayak Rentals",
    location: "Kariba",
    status: "Open",
    image: "/images/kayaking.jpg",
    href: "/activities",
    rating: 4.5,
  },
  {
    id: "bungee",
    section: "things",
    name: "Bungee Jumping",
    location: "Victoria Falls",
    status: "Open",
    image: "/images/bungee.jpeg",
    href: "/activities",
    rating: 4.8,
  },
  {
    id: "citylink",
    section: "bus",
    name: "CityLink",
    route: "Harare to Victoria Falls",
    status: "Scheduled",
    image: "/images/slide2.jpg",
    href: "/transport/bus",
    rating: 4.6,
  },
  {
    id: "intercape",
    section: "bus",
    name: "Intercape",
    route: "Bulawayo to Harare",
    status: "Scheduled",
    image: "/images/slide_1-1024x398-1.jpg",
    href: "/transport/bus",
    rating: 4.4,
  },
  {
    id: "fastjet",
    section: "flights",
    name: "Fastjet",
    route: "Harare to Bulawayo",
    status: "Scheduled",
    image: "/images/slide3.jpg",
    href: "/transport/flights",
    rating: 4.5,
  },
  {
    id: "air-zimbabwe",
    section: "flights",
    name: "Air Zimbabwe",
    route: "Harare to Victoria Falls",
    status: "Scheduled",
    image: "/images/vicfalls.jpg",
    href: "/transport/flights",
    rating: 4.3,
  },
];

const sections: Array<{
  key: FeedSectionKey;
  title: string;
  href: string;
  icon?: string;
  lucide?: typeof Bus;
}> = [
  {
    key: "stays",
    title: "Stays",
    href: "/accommodation",
    icon: "/icons/mobile/accommodation.svg",
  },
  {
    key: "events",
    title: "Upcoming Events",
    href: "/events",
    icon: "/icons/mobile/events.svg",
  },
  {
    key: "things",
    title: "Things To Do",
    href: "/activities",
    icon: "/icons/mobile/things.svg",
  },
  {
    key: "bus",
    title: "Bus",
    href: "/transport/bus",
    lucide: Bus,
  },
  {
    key: "flights",
    title: "Flights",
    href: "/transport/flights",
    lucide: Plane,
  },
];

const categoryDock = [
  { label: "Destinations", href: "/travel-guide", icon: Search },
  { label: "Stays", href: "/accommodation", icon: Sparkles },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Transport", href: "/transport", icon: Bus },
  { label: "Flights", href: "/transport/flights", icon: Plane },
];

function IconMask({ src, className = "h-6 w-6" }: { src: string; className?: string }) {
  const style: CSSProperties = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };

  return <span className={`block bg-current ${className}`} style={style} aria-hidden="true" />;
}

function IconActionButton({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-white/72 text-[#1d1d1f] shadow-sm backdrop-blur-xl transition group-hover:bg-white dark:bg-black/44 dark:text-white"
    >
      <span className={active ? "text-[#ff375f]" : ""}>{children}</span>
    </span>
  );
}

function LocationPill({ label, overlay = false }: { label: string; overlay?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-bold ${
        overlay
          ? "border border-white/16 bg-white/76 text-[#1d1d1f] backdrop-blur-xl dark:bg-black/64 dark:text-white"
          : "bg-black/[0.04] text-[#1d1d1f] dark:bg-white/10 dark:text-white"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#ff3b30] dark:bg-[#1c1c1e]">
        <MapPin className="h-3 w-3 fill-current" />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function RatingPill({ value }: { value: number | "N/A" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/16 bg-white/76 px-2.5 py-1.5 text-[13px] font-bold text-[#1d1d1f] backdrop-blur-xl dark:bg-black/64 dark:text-white">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#f5b301] dark:bg-[#1c1c1e]">
        <Star className="h-3 w-3 fill-current" />
      </span>
      {typeof value === "number" ? value.toFixed(1) : value}
    </span>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-white/16 bg-white/76 px-2.5 py-1.5 text-[13px] font-bold text-[#1d1d1f] backdrop-blur-xl dark:bg-black/64 dark:text-white">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#86868b] dark:bg-[#1c1c1e]">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function ViewAllButton({ href }: { href: string }) {
  return (
    <Link href={href} className="apple-action-secondary shrink-0 px-3 py-1.5 text-xs">
      View All
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function FeaturedCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = carouselItems[activeIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % carouselItems.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, []);

  const goTo = (index: number) => {
    setActiveIndex((index + carouselItems.length) % carouselItems.length);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
      <div className="apple-scale-in relative min-h-[620px] overflow-hidden rounded-[2.25rem] border border-black/[0.08] bg-[#111] shadow-[0_40px_120px_-80px_rgba(0,0,0,0.72)] dark:border-white/[0.09] md:min-h-[680px]">
        {carouselItems.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition duration-700 ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== activeIndex}
          >
            <div
              className={`h-full w-full bg-cover bg-center transition duration-[7200ms] ${
                index === activeIndex ? "scale-[1.04]" : "scale-100"
              }`}
              style={{ backgroundImage: `url('${item.image}')` }}
            />
          </div>
        ))}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.22)_36%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(0,0,0,0.48),transparent)]" />

        <div className="relative flex min-h-[620px] flex-col justify-between p-4 text-white sm:p-6 md:min-h-[680px] lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <LocationPill label={activeItem.location} overlay />
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/12 backdrop-blur-xl transition hover:bg-white/22"
                aria-label="Previous featured destination"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/12 backdrop-blur-xl transition hover:bg-white/22"
                aria-label="Next featured destination"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_24rem] lg:items-end">
            <div className="apple-fade-up max-w-3xl">
              <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/78 backdrop-blur-xl">
                {activeItem.eyebrow}
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.02] md:text-6xl">
                {activeItem.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/76 md:text-base">
                {activeItem.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={activeItem.href} className="apple-action">
                  Explore destination
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/trip-planner" className="apple-action-secondary border-white/18 bg-white/12 text-white hover:bg-white/18">
                  Build a trip
                </Link>
              </div>
            </div>

            <div className="apple-surface rounded-[1.75rem] p-3 text-white dark:bg-black/36">
              <div className="grid grid-cols-3 gap-2">
                {activeItem.stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">
                    <div className="text-lg font-bold leading-none">{stat.value}</div>
                    <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/54">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {carouselItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`relative h-14 overflow-hidden rounded-2xl border transition ${
                      index === activeIndex
                        ? "border-white/75"
                        : "border-white/14 opacity-72 hover:opacity-100"
                    }`}
                    aria-label={`Show ${item.location}`}
                  >
                    <span
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${item.image}')` }}
                    />
                    <span className="absolute inset-0 bg-black/18" />
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                {carouselItems.map((item, index) => (
                  <button
                    key={`${item.id}-progress`}
                    type="button"
                    onClick={() => goTo(index)}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/22"
                    aria-label={`Go to ${item.location}`}
                  >
                    <span
                      className={`block h-full rounded-full bg-white transition-all duration-500 ${
                        index === activeIndex ? "w-full" : "w-0"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryDock() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="apple-surface flex gap-2 overflow-x-auto rounded-full p-1.5 scrollbar-hide">
        {categoryDock.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[#6e6e73] transition hover:bg-black/[0.055] hover:text-[#1d1d1f] dark:text-white/62 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  href,
  icon,
  lucide: LucideIcon,
}: {
  title: string;
  href: string;
  icon?: string;
  lucide?: typeof Bus;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.055] text-[#1d1d1f] dark:bg-white/[0.08] dark:text-white">
            <IconMask src={icon} />
          </span>
        ) : LucideIcon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.055] text-[#1d1d1f] dark:bg-white/[0.08] dark:text-white">
            <LucideIcon className="h-5 w-5" />
          </span>
        ) : null}
        <h2 className="truncate text-xl font-bold leading-none text-[#1d1d1f] dark:text-white">
          {title}
        </h2>
      </div>
      <ViewAllButton href={href} />
    </div>
  );
}

function DestinationCard({ item }: { item: DestinationItem }) {
  return (
    <Link
      href={item.href}
      className="group relative mr-4 block h-[218px] w-[calc((100vw-48px)/2)] max-w-[232px] shrink-0 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_22px_70px_-58px_rgba(0,0,0,0.42)] transition duration-500 hover:-translate-y-1 dark:bg-white/[0.055] sm:w-[220px]"
    >
      <div
        className="h-full w-full bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
        style={{ backgroundImage: `url('${item.image}')` }}
      />
      <div className="absolute right-3 top-3 z-10">
        <IconActionButton label={`Favorite ${item.name}`}>
          <Heart className="h-4 w-4" />
        </IconActionButton>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.76))] px-3 pb-3 pt-12">
        <h3 className="truncate text-left text-lg font-bold leading-none text-white">{item.name}</h3>
        <p className="mt-1 truncate text-left text-sm font-semibold leading-none text-white/72">
          {item.weather}
        </p>
      </div>
    </Link>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const isTransport = item.section === "bus" || item.section === "flights";
  const isEvent = item.section === "events";
  const meta = item.location || item.route || item.venue || "";

  return (
    <Link
      href={item.href}
      className="group relative mr-3 block h-[224px] w-[calc(100vw-112px)] max-w-[330px] shrink-0 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_22px_70px_-58px_rgba(0,0,0,0.42)] transition duration-500 hover:-translate-y-1 dark:bg-white/[0.055] sm:w-[310px]"
    >
      <div
        className="h-full w-full bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
        style={{ backgroundImage: `url('${item.image}')` }}
      />
      <div className="absolute right-3 top-3 z-10">
        <IconActionButton label={`Favorite ${item.name}`}>
          <Heart className="h-4 w-4" />
        </IconActionButton>
      </div>
      <div className="absolute right-3 bottom-[78px] z-10">
        <RatingPill value={item.rating} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.82))] px-3 pb-3 pt-16">
        <h3 className="truncate text-left text-lg font-bold leading-none text-white">{item.name}</h3>
        <div className="mt-2 flex items-center gap-2 overflow-hidden">
          {isTransport ? (
            <InfoPill icon={<Bus className="h-3 w-3" />} label={meta} />
          ) : (
            <LocationPill label={meta} overlay />
          )}
          {isEvent && item.dateLabel ? (
            <InfoPill icon={<CalendarDays className="h-3 w-3" />} label={item.dateLabel} />
          ) : null}
          {!isEvent && item.status ? (
            <InfoPill icon={<Clock3 className="h-3 w-3" />} label={item.status} />
          ) : null}
        </div>
        {item.amenities ? (
          <div className="mt-2 flex gap-1 overflow-hidden text-[11px] font-semibold text-white/76">
            {item.amenities.slice(0, 3).map((amenity) => (
              <span key={amenity} className="truncate rounded-full bg-white/14 px-2 py-1 backdrop-blur">
                {amenity}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function PopularDestinations() {
  return (
    <section className="mx-auto w-full max-w-7xl pt-8">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#86868b] dark:text-white/42">
            Destination first
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-none text-[#1d1d1f] dark:text-white">
            Popular Destinations
          </h2>
        </div>
        <ViewAllButton href="/travel-guide" />
      </div>
      <div className="mt-4 flex overflow-x-auto px-4 pb-5 scrollbar-hide sm:px-6 lg:px-8">
        {destinations.map((item) => (
          <DestinationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function FeedSection({ section }: { section: (typeof sections)[number] }) {
  const items = feedItems.filter((item) => item.section === section.key);

  return (
    <section className="mx-auto mb-7 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="apple-surface overflow-hidden rounded-[2rem]">
        <SectionHeader {...section} />
        <div className="mt-4 flex overflow-x-auto pb-4 pl-4 scrollbar-hide sm:pl-5">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformFlow() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 pt-2 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="apple-surface rounded-[2rem] p-6 md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#86868b] dark:text-white/42">
            One travel account
          </p>
          <h2 className="mt-3 max-w-lg text-3xl font-bold leading-tight text-[#1d1d1f] dark:text-white">
            Move from discovery to booking without rebuilding the same trip twice.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#6e6e73] dark:text-white/62">
            Off2Zim keeps destinations, listings, bookings, messages, favorites, and trip planning connected so travelers and service providers work from the same information.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Explore", body: "Start with a destination and see the services that belong there." },
            { title: "Compare", body: "Review stays, events, activities, transport, and prices in context." },
            { title: "Book", body: "Save, message, or checkout once the plan is ready." },
          ].map((item) => (
            <div key={item.title} className="apple-surface rounded-[2rem] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0071e3] text-sm font-bold text-white">
                {item.title[0]}
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1d1d1f] dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6e6e73] dark:text-white/62">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PublicHomeExperience() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white">
      <FeaturedCarousel />
      <CategoryDock />
      <PopularDestinations />

      {sections.map((section) => (
        <FeedSection key={section.key} section={section} />
      ))}

      <PlatformFlow />
    </div>
  );
}
