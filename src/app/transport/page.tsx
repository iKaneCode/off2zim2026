import Link from "next/link";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactRailCard from "@/components/ui/CompactRailCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";
import { getSubtypesForGroup } from "@/lib/taxonomy";
import {
  Bus,
  CarFront,
  Plane,
  Route,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

const transportTypes = [
  {
    id: "bus",
    name: "Bus transport",
    description: "Intercity movement, route planning, and practical budget-friendly travel.",
    icon: Bus,
    href: "/transport/bus",
    image: "/images/slide1.jpg",
    features: ["Intercity routes", "Regional movement", "Budget planning"],
  },
  {
    id: "car-rental",
    name: "Car rental",
    description: "Self-drive flexibility for travelers building multi-stop Zimbabwe routes.",
    icon: CarFront,
    href: "/transport/car-rental",
    image: "/images/destinations/eastern-highlands.jpg",
    features: ["SUV and 4x4", "Self-drive", "Flexible pickup"],
  },
  {
    id: "flights",
    name: "Flights",
    description: "Domestic hops and time-saving connections between major destinations.",
    icon: Plane,
    href: "/transport/flights",
    image: "/images/victoria-falls.jpg",
    features: ["Domestic links", "Scenic air movement", "Faster route shaping"],
  },
  {
    id: "taxi",
    name: "Taxi services",
    description: "Airport transfers, city movement, and last-mile itinerary support.",
    icon: Route,
    href: "/transport/taxi",
    image: "/images/jacaranda.JPG",
    features: ["Airport pickup", "City rides", "Last-mile support"],
  },
];
const transportSubtypes = getSubtypesForGroup("transport");

export default function TransportPage() {
  return (
    <div className="theme-page pb-20">
      <CompactPageHero
        eyebrow="Transport"
        title="Plan transport across Zimbabwe with clear, practical options"
        description="Compare routes, save time, and choose the transport that fits your itinerary."
        imageUrl="/images/destinations/eastern-highlands.jpg"
      >
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <HeroMiniFact icon={ShieldCheck} title="Trusted providers" detail="Verified operators" />
          <HeroMiniFact icon={TimerReset} title="Time visibility" detail="Compare travel pace" />
          <HeroMiniFact icon={Route} title="Trip-linked" detail="Match your itinerary" />
        </div>
      </CompactPageHero>

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <AppServiceStrip activeLabel="Transport" />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <CompactSectionHeader
          eyebrow="Modes"
          title="Choose the transport option that fits your route"
        />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {transportSubtypes.map((subtype) => (
            <Link
              key={subtype.id}
              href={`/marketplace?serviceGroup=transport&subtype=${encodeURIComponent(subtype.id)}`}
              className="theme-chip shrink-0 rounded-lg px-3 py-2 text-xs font-semibold"
              title={subtype.travelerHint}
            >
              {subtype.label}
            </Link>
          ))}
        </div>
        <HorizontalRail itemClassName="w-[78vw] max-w-[300px] sm:w-[280px]">
          {transportTypes.map((transport) => {
            const Icon = transport.icon;
            return (
              <CompactRailCard
                key={transport.id}
                href={transport.href}
                title={transport.name}
                imageUrl={transport.image}
                icon={Icon}
                meta="Transport"
                detail={transport.features[0]}
                description={transport.description}
                actionLabel="View transport options"
              />
            );
          })}
        </HorizontalRail>
      </section>
    </div>
  );
}

function HeroMiniFact({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-[160px] items-center gap-2 rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white backdrop-blur">
      <Icon className="h-4 w-4 shrink-0 text-[#ffca74]" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-white/62">{detail}</span>
      </span>
    </div>
  );
}
