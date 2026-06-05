"use client";

import { cn } from "@/lib/utils";

export function formatLocationLabel(location: string) {
  return location
    .replace(/,\s*zimbabwe$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function MobileLocationGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 512 512"
      className={className}
      fill="#ff3b30"
    >
      <path d="M256 32C167.67 32 96 103.67 96 192c0 120 160 288 160 288s160-168 160-288C416 103.67 344.33 32 256 32Zm0 224a64 64 0 1 1 64-64 64.07 64.07 0 0 1-64 64Z" />
    </svg>
  );
}

export function LocationIconBubble({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]",
        compact ? "h-5 w-5" : "mr-1.5 h-6 w-6",
      )}
    >
      <MobileLocationGlyph className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
    </span>
  );
}

export default function LocationPill({
  location,
  className,
}: {
  location: string;
  className?: string;
}) {
  const label = formatLocationLabel(location) || "Location pending";

  return (
    <div
      aria-label={`Location: ${label}`}
      className={cn(
        "inline-flex max-w-full items-center rounded-full bg-black/[0.04] px-3.5 py-2 text-sm text-slate-950 dark:bg-white/10 dark:text-white",
        className,
      )}
    >
      <LocationIconBubble />
      <span className="truncate font-semibold text-slate-950 dark:text-white">
        {label}
      </span>
    </div>
  );
}
