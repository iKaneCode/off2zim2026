import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bus,
  CalendarDays,
  Compass,
  MessageCircle,
  Plane,
  ShieldCheck,
  Ticket,
  UtensilsCrossed,
} from "lucide-react";
import CompactRailCard from "@/components/ui/CompactRailCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";
import WeatherBadge from "@/components/ui/WeatherBadge";
import { getSurfaceHref, getSurfaceHome, resolveAppSurface } from "@/lib/app-surface";

const hero = {
  eyebrow: "Explore | Experience | Enjoy",
  title: "Discover Zimbabwe's destinations, stays, activities, events, and local travel help in one place.",
  body: "Find places to visit, plan your route, ask locals for advice, and book with confidence.",
  image: "/images/slide1.jpg",
  location: "Eastern Highlands",
};

const platformMoments = [
  {
    title: "Travel guide",
    body: "Explore destinations across Zimbabwe and see what each place offers before you plan.",
    href: "/travel-guide",
    icon: Compass,
  },
  {
    title: "Trip planner",
    body: "Build a day-by-day itinerary with transport, timing, and cost visibility.",
    href: "/trip-planner",
    icon: CalendarDays,
  },
  {
    title: "Destination guidance",
    body: "Choose a destination, then explore local advice, stays, dining, and other services in that area.",
    href: "/travel-guide",
    icon: MessageCircle,
  },
  {
    title: "Travel enquiries",
    body: "Send enquiries when you want help shaping a route, stay, transfer, or experience.",
    href: "/contact",
    icon: ShieldCheck,
  },
];

const serviceAtlas = [
  { label: "Destinations", detail: "Cities, parks, heritage sites, lakes, and scenic routes.", icon: Compass },
  { label: "Transport", detail: "Flights, transfers, buses, and movement planning.", icon: Bus },
  { label: "Events", detail: "Tickets, festivals, and moments worth building around.", icon: Ticket },
  { label: "Destination services", detail: "Stays, dining, and local guidance unlock once a place is selected.", icon: UtensilsCrossed },
  { label: "Flights", detail: "Air travel options for tighter timelines and longer journeys.", icon: Plane },
  { label: "Trip planner", detail: "Keep the route moving while destinations and global transport stay connected.", icon: CalendarDays },
];

const destinationFrames = [
  {
    title: "Victoria Falls",
    body: "Iconic adventure, river energy, and one of the strongest first impressions in the region.",
    image: "/images/victoria-falls.jpg",
  },
  {
    title: "Harare",
    body: "Urban stays, business rhythm, dining, and the practical start point for many trips.",
    image: "/images/jacaranda.JPG",
  },
  {
    title: "Kariba",
    body: "Houseboats, lake air, fishing, and a slower route built around water and sunsets.",
    image: "/images/kariba.jpg",
  },
];

const trustPoints = [
  "Destination-led discovery instead of scattered searching",
  "Planner and guide tools built into the same platform",
  "One account for travelers and a separate workspace for providers",
];

const quickRoutes = [
  { label: "Destinations", href: "/travel-guide" },
  { label: "Trip Planner", href: "/trip-planner" },
  { label: "Flights", href: "/transport/flights" },
  { label: "Events", href: "/events" },
  { label: "Travel help", href: "/contact" },
];

export default async function HomePage() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const surfaceHeader = headerStore.get("x-off2zim-surface");
  const surface = surfaceHeader
    ? resolveAppSurface(surfaceHeader)
    : resolveAppSurface(host, "/");

  if (surface !== "public") {
    redirect(getSurfaceHome(surface));
  }

  return (
    <div className="theme-page relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top,rgba(255,106,61,0.22),transparent_58%)]" />
      <div className="absolute inset-x-0 top-48 h-[32rem] bg-[radial-gradient(circle_at_center,rgba(75,120,255,0.14),transparent_62%)]" />

      <section className="relative px-0 pb-4 pt-0">
        <div
          className="relative min-h-[520px] overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(4,4,4,0.78) 0%, rgba(4,4,4,0.48) 42%, rgba(4,4,4,0.62) 100%), url('${hero.image}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="mx-auto flex min-h-[520px] max-w-7xl flex-col justify-between px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            <div className="max-w-3xl pt-6 lg:pt-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/82 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#ff5630]" />
                {hero.eyebrow}
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl">
                {hero.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/76 md:text-lg">
                {hero.body}
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={getSurfaceHref("explorer", "/login")}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6c4d]"
                >
                  Traveler login
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={getSurfaceHref("provider", "/register")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                >
                  Register your business
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/14 bg-black/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/28"
                >
                  Request travel help
                </Link>
              </div>
            </div>

            <div className="flex max-w-5xl gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[270px] rounded-xl border border-white/12 bg-black/36 p-4 text-white backdrop-blur-md">
                <div className="text-xs uppercase tracking-[0.28em] text-white/52">
                  Featured atmosphere
                </div>
                <div className="mt-2 text-xl font-semibold">Eastern Highlands</div>
                <div className="mt-2 max-w-xl text-sm leading-6 text-white/72">
                  Forest roads, mountain air, tea country, waterfalls, and a calm route for travelers who want scenery before noise.
                </div>
              </div>
              <div className="min-w-[240px] rounded-xl border border-white/12 bg-black/36 p-4 text-white backdrop-blur-md">
                <div className="text-xs uppercase tracking-[0.28em] text-white/52">
                  Conditions
                </div>
                <div className="mt-2 text-xl font-semibold">
                  <WeatherBadge location={hero.location} className="text-white" compact />
                </div>
                <div className="mt-2 text-sm leading-6 text-white/72">
                  Live weather helps you plan with the latest local conditions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-3">
            {quickRoutes.map((route) => (
              <Link
                key={route.label}
                href={route.href}
                className="theme-chip inline-flex items-center rounded-full border px-4 py-2.5 text-sm font-medium transition hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
              >
                {route.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <CompactSectionHeader
          eyebrow="What the platform does"
          title="Off2Zim helps travelers explore, plan, and book Zimbabwe with confidence"
        />

        <HorizontalRail itemClassName="w-[74vw] max-w-[260px] sm:w-[240px]">
          {platformMoments.map((item) => {
            const Icon = item.icon;

            return (
              <CompactRailCard
                key={item.title}
                href={item.href}
                icon={Icon}
                meta="Start here"
                title={item.title}
                description={item.body}
                actionLabel="Open"
              />
            );
          })}
        </HorizontalRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <CompactSectionHeader
          eyebrow="Across the journey"
          title="Plan, book, and explore Zimbabwe from one platform"
        />

        <HorizontalRail itemClassName="w-[72vw] max-w-[250px] sm:w-[230px]">
          {serviceAtlas.map((item) => {
            const Icon = item.icon;

            return (
              <CompactRailCard
                key={item.label}
                icon={Icon}
                meta="Journey"
                title={item.label}
                description={item.detail}
              />
            );
          })}
        </HorizontalRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <CompactSectionHeader
          eyebrow="Zimbabwe at a glance"
          title="Three destinations that show the full range of what Zimbabwe offers"
        />

        <HorizontalRail itemClassName="w-[78vw] max-w-[300px] sm:w-[280px]">
          {destinationFrames.map((destination) => (
            <CompactRailCard
              key={destination.title}
              href="/travel-guide"
              title={destination.title}
              imageUrl={destination.image}
              meta="Destination"
              description={destination.body}
              actionLabel="Explore destinations"
            />
          ))}
        </HorizontalRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pb-20">
        <div className="theme-panel rounded-2xl p-4 md:p-5">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="theme-label text-xs uppercase tracking-[0.24em]">Built with clarity</p>
              <h2 className="theme-heading mt-2 text-xl font-semibold">
                A simpler way to plan your trip as the details come together
              </h2>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {trustPoints.map((point) => (
                  <div key={point} className="min-w-[220px] rounded-xl border border-black/10 px-3 py-2 text-xs leading-5 text-slate-700 dark:border-white/10 dark:text-white/70">
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <CompactSectionHeader
                eyebrow="Start with the right door"
                title="Choose the next step that matches why you came to Off2Zim"
              />

              <div className="grid gap-2 md:grid-cols-3">
                <Link
                  href={getSurfaceHref("explorer", "/login")}
                  title="Return to saved places, trip plans, bookings, and account details."
                  className="theme-card-soft rounded-xl p-4 transition hover:bg-black/[0.045] dark:hover:bg-white/[0.05]"
                >
                  <h3 className="theme-heading text-base font-semibold">Traveler login</h3>
                </Link>

                <Link
                  href="/trip-planner"
                  title="Build your route, organize each day, and keep your plans in one place."
                  className="theme-card-soft rounded-xl p-4 transition hover:bg-black/[0.045] dark:hover:bg-white/[0.05]"
                >
                  <h3 className="theme-heading text-base font-semibold">Trip planner</h3>
                </Link>

                <Link
                  href="/community-guides"
                  title="Ask locals for practical advice and connect with guides before you travel."
                  className="theme-card-soft rounded-xl p-4 transition hover:bg-black/[0.045] dark:hover:bg-white/[0.05]"
                >
                  <h3 className="theme-heading text-base font-semibold">Guides</h3>
                </Link>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6c4d]"
                >
                  Request travel help
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={getSurfaceHref("provider", "/register")}
                  className="theme-button-secondary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                >
                  Register your business
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
