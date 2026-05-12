"use client";

import Link from "next/link";
import {
  Bus,
  CalendarDays,
  Compass,
  MessageCircle,
  Plane,
  Ticket,
  BedDouble,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import {
  destinationScopedServices,
  explorerGlobalServices,
  withDestinationContext,
} from "@/lib/destination-explorer";

const iconMap = {
  Destinations: Compass,
  Flights: Plane,
  Events: Ticket,
  Transport: Bus,
  "Trip Planner": CalendarDays,
  Stays: BedDouble,
  "Things To Do": Sparkles,
  Restaurants: UtensilsCrossed,
  "Ask a Local": MessageCircle,
} as const;

interface AppServiceStripProps {
  activeLabel?: string;
  destinationId?: string | null;
  destinationName?: string | null;
}

export default function AppServiceStrip({
  activeLabel,
  destinationId,
  destinationName,
}: AppServiceStripProps) {
  const items = [
    ...explorerGlobalServices,
    ...(destinationId ? destinationScopedServices : []),
  ];

  return (
    <div className="space-y-3">
      {destinationId && destinationName ? (
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/45 dark:text-white/45">
          <span className="h-2 w-2 rounded-full bg-[#ff5630]" />
          Selected destination: {destinationName}
        </div>
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {items.map((item) => {
          const Icon = iconMap[item.label];
          const isActive = item.label === activeLabel;

          return (
            <Link
              key={item.label}
              href={withDestinationContext(item.href, destinationId)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-[#ff5630] bg-[#ff5630] text-white"
                  : "theme-chip hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
    </div>
  );
}
