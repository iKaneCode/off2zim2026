"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudSun,
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
    title: "Victoria Falls",
    description:
      "Stays, activities, transport, and trip planning in one destination-led flow.",
    location: "Victoria Falls",
    image: "/images/victoria-falls.jpg",
    href: "/travel-guide/victoria-falls",
  },
  {
    id: "hwange-national-park",
    eyebrow: "Safari route",
    title: "Hwange National Park",
    description:
      "Safari camps, game drives, local guides, and transfers organized around the destination.",
    location: "Hwange",
    image: "/images/hwange-national-park.jpg",
    href: "/travel-guide/hwange-national-park",
  },
  {
    id: "eastern-highlands",
    eyebrow: "Scenic escape",
    title: "Eastern Highlands",
    description:
      "Mountain stays, trails, scenic drives, and local guides for quieter Zimbabwe travel.",
    location: "Nyanga",
    image: "/images/nyanga.jpg",
    href: "/travel-guide/eastern-highlands",
  },
  {
    id: "kariba",
    eyebrow: "Lake escape",
    title: "Lake Kariba",
    description:
      "Lake stays, houseboats, fishing, transfers, and sunset escapes in one calm view.",
    location: "Kariba",
    image: "/images/kariba.jpg",
    href: "/travel-guide/kariba",
  },
];

const destinations: DestinationItem[] = [
  {
    id: "victoria-falls",
    name: "Victoria Falls",
    weather: "25°C · Sunny",
    image: "/images/destinations/victoria-falls.jpg",
    href: "/travel-guide/victoria-falls",
  },
  {
    id: "hwange-national-park",
    name: "Hwange",
    weather: "30°C · Clear",
    image: "/images/destinations/hwange.jpg",
    href: "/travel-guide/hwange-national-park",
  },
  {
    id: "kariba",
    name: "Kariba",
    weather: "31°C · Warm",
    image: "/images/destinations/lake-kariba.jpg",
    href: "/travel-guide/kariba",
  },
  {
    id: "great-zimbabwe",
    name: "Great Zimbabwe",
    weather: "27°C · Clear",
    image: "/images/destinations/great-zimbabwe.jpg",
    href: "/travel-guide/great-zimbabwe",
  },
  {
    id: "eastern-highlands",
    name: "Eastern Highlands",
    weather: "19°C · Cool",
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
  { label: "Explore", href: "/travel-guide", icon: Search },
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
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="apple-scale-in relative h-[430px] overflow-hidden rounded-[1.25rem] bg-[#111] shadow-[0_28px_90px_-72px_rgba(0,0,0,0.72)] dark:border dark:border-white/[0.08] sm:rounded-[1.5rem] md:h-[520px]">
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

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.08)_38%,rgba(0,0,0,0.72)_100%)]" />

        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6 md:p-8">
          <div className="apple-fade-up max-w-2xl">
            <LocationPill label={activeItem.location} overlay />
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/68">
              {activeItem.eyebrow}
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-none md:text-6xl">
              {activeItem.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/76 md:text-base">
              {activeItem.description}
            </p>
            <Link href={activeItem.href} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1d1d1f] transition hover:bg-white/88">
              Explore
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="absolute right-4 top-4 hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/18 text-white backdrop-blur-xl transition hover:bg-black/32"
            aria-label="Previous featured destination"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/18 text-white backdrop-blur-xl transition hover:bg-black/32"
            aria-label="Next featured destination"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {carouselItems.map((item, index) => (
            <button
              key={`${item.id}-dot`}
              type="button"
              onClick={() => goTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-7 bg-white" : "w-1.5 bg-white/42 hover:bg-white/70"
              }`}
              aria-label={`Go to ${item.location}`}
            />
          ))}
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
      className="group relative mr-4 block h-[200px] w-[calc((100vw-48px)/2)] max-w-[224px] shrink-0 overflow-hidden rounded-[14px] bg-white transition duration-500 hover:-translate-y-1 dark:bg-[#1c1c1e] sm:h-[224px] sm:w-[224px] sm:rounded-2xl"
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
      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2.5 py-2.5">
        <h3 className="truncate text-left text-lg font-bold leading-none text-white">{item.name}</h3>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-left text-sm font-bold leading-none text-white">
          <CloudSun className="h-4 w-4 shrink-0 text-[#ffd60a]" />
          <span className="truncate">{item.weather}</span>
        </div>
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
