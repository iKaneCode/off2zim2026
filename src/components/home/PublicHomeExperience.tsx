"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Bus,
  CalendarDays,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Plane,
  Star,
} from "lucide-react";

type FeedSectionKey = "stays" | "events" | "things" | "bus" | "flights";

type CarouselItem = {
  id: string;
  title: string;
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
    title: "Victoria Falls",
    location: "Victoria Falls",
    image: "/images/victoria-falls.jpg",
    href: "/travel-guide/victoria-falls",
  },
  {
    id: "hwange",
    title: "Hwange National Park",
    location: "Hwange",
    image: "/images/hwange-national-park.jpg",
    href: "/travel-guide/hwange",
  },
  {
    id: "eastern-highlands",
    title: "Eastern Highlands",
    location: "Nyanga",
    image: "/images/nyanga.jpg",
    href: "/travel-guide/eastern-highlands",
  },
  {
    id: "kariba",
    title: "Lake Kariba",
    location: "Kariba",
    image: "/images/kariba.jpg",
    href: "/travel-guide/kariba",
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
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/82 text-[#1c1c1e] shadow-sm backdrop-blur transition group-hover:bg-white dark:bg-white/10 dark:text-white"
    >
      <span className={active ? "text-[#ff4757]" : ""}>{children}</span>
    </span>
  );
}

function LocationPill({ label, overlay = false }: { label: string; overlay?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-bold ${
        overlay
          ? "bg-white/80 text-black backdrop-blur dark:bg-black/70 dark:text-white"
          : "bg-black/[0.04] text-[#1c1c1e] dark:bg-white/10 dark:text-white"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          overlay ? "bg-white text-[#ff3b30] dark:bg-[#1c1c1e]" : "bg-white text-[#ff3b30]"
        }`}
      >
        <MapPin className="h-3 w-3 fill-current" />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function RatingPill({ value, overlay = false }: { value: number | "N/A"; overlay?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-bold ${
        overlay
          ? "bg-white/80 text-black backdrop-blur dark:bg-black/70 dark:text-white"
          : "bg-black/[0.04] text-[#1c1c1e] dark:bg-white/10 dark:text-white"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          overlay ? "bg-white text-[#daa520] dark:bg-[#1c1c1e]" : "bg-white text-[#daa520]"
        }`}
      >
        <Star className="h-3 w-3 fill-current" />
      </span>
      {typeof value === "number" ? value.toFixed(1) : value}
    </span>
  );
}

function InfoPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white/80 px-2.5 py-1.5 text-[13px] font-bold text-black backdrop-blur dark:bg-black/70 dark:text-white">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#8e8e93] dark:bg-[#1c1c1e]">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function ViewAllButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-2xl bg-[#1c1c1e] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-85 dark:bg-white dark:text-[#1c1c1e]"
    >
      View All
      <ChevronRight className="ml-1 h-3.5 w-3.5" />
    </Link>
  );
}

function CarouselIndicators({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  return (
    <div className="rounded-[10px] bg-black/45 px-2 py-1.5">
      <div className="flex items-center gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <span
            key={index}
            className={`h-2 rounded-full bg-white transition-all ${
              index === activeIndex ? "w-[22px] opacity-100" : "w-2 opacity-60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturedCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % carouselItems.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="relative h-[236px] overflow-hidden rounded-2xl bg-[#f2f2f7] dark:bg-[#1c1c1e] sm:h-[320px] lg:h-[398px]">
        {carouselItems.map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
          >
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url('${item.image}')` }}
            />
            <div className="absolute inset-x-0 bottom-4 flex justify-center px-5">
              <LocationPill label={item.location || item.title} overlay />
            </div>
          </Link>
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-[-2px] flex justify-center">
          <CarouselIndicators count={carouselItems.length} activeIndex={activeIndex} />
        </div>
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
    <div className="flex items-center justify-between gap-3 px-4 pt-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#1c1c1e] dark:text-white">
            <IconMask src={icon} />
          </span>
        ) : LucideIcon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#1c1c1e] dark:text-white">
            <LucideIcon className="h-6 w-6" />
          </span>
        ) : null}
        <h2 className="truncate text-xl font-bold leading-none text-[#1c1c1e] dark:text-white">
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
      className="group relative mr-4 block h-[200px] w-[calc((100vw-48px)/2)] max-w-[220px] shrink-0 overflow-hidden rounded-xl bg-white dark:bg-[#1c1c1e] sm:w-[210px]"
    >
      <div
        className="h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-105"
        style={{ backgroundImage: `url('${item.image}')` }}
      />
      <div className="absolute right-2 top-2 z-10">
        <IconActionButton label={`Favorite ${item.name}`}>
          <Heart className="h-4 w-4" />
        </IconActionButton>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/70 p-2">
        <h3 className="truncate text-left text-lg font-bold leading-none text-white">{item.name}</h3>
        <p className="mt-1 truncate text-left text-lg font-bold leading-none text-white">
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
      className="group relative mr-2 block h-[200px] w-[calc(100vw-120px)] max-w-[320px] shrink-0 overflow-hidden rounded-xl bg-white dark:bg-[#1c1c1e] sm:w-[300px]"
    >
      <div
        className="h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-105"
        style={{ backgroundImage: `url('${item.image}')` }}
      />
      <div className="absolute right-2 top-2 z-10">
        <IconActionButton label={`Favorite ${item.name}`} active={false}>
          <Heart className="h-4 w-4" />
        </IconActionButton>
      </div>
      <div className="absolute right-2 bottom-[68px] z-10">
        <RatingPill value={item.rating} overlay />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/70 p-2">
        <h3 className="truncate text-left text-lg font-bold leading-none text-white">{item.name}</h3>
        <div className="mt-1.5 flex items-center gap-2">
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
          {item.amenities ? (
            <span className="ml-auto inline-flex rounded-full bg-white/80 px-2.5 py-1.5 text-[13px] font-bold text-black backdrop-blur dark:bg-black/70 dark:text-white">
              {item.amenities.slice(0, 3).join(" | ")}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function PopularDestinations() {
  return (
    <section className="mx-auto w-full max-w-7xl pt-6">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold leading-none text-[#1c1c1e] dark:text-white">
          Popular Destinations
        </h2>
        <ViewAllButton href="/travel-guide" />
      </div>
      <div className="mt-3 flex overflow-x-auto px-4 pb-4 scrollbar-hide sm:px-6 lg:px-8">
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
    <section className="mx-auto mb-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1c1c1e]">
        <SectionHeader {...section} />
        <div className="mt-3 flex overflow-x-auto pb-2 pl-2 scrollbar-hide">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PublicHomeExperience() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] text-[#1c1c1e] dark:bg-black dark:text-white">
      <FeaturedCarousel />
      <PopularDestinations />

      {sections.map((section) => (
        <FeedSection key={section.key} section={section} />
      ))}
    </div>
  );
}
