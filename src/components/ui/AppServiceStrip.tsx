"use client";

import Link from "next/link";
import {
  Bus,
  CalendarDays,
  Compass,
  MessageCircle,
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
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#86868b] dark:text-white/45">
          <span className="h-2 w-2 rounded-full bg-[#ff5630]" />
          Selected destination: {destinationName}
        </div>
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="apple-surface flex min-w-max gap-1 rounded-full p-1">
        {items.map((item) => {
          const Icon = iconMap[item.label];
          const isActive = item.label === activeLabel;

          return (
            <Link
              key={item.label}
              href={withDestinationContext(item.href, destinationId)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#1d1d1f] text-white shadow-sm dark:bg-white dark:text-[#1d1d1f]"
                  : "text-[#6e6e73] hover:bg-black/[0.05] hover:text-[#1d1d1f] dark:text-white/62 dark:hover:bg-white/[0.08] dark:hover:text-white"
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
