"use client";

import type { ServiceSubtype } from "@/lib/taxonomy";

interface ServiceSubtypeChipsProps {
  subtypes: ServiceSubtype[];
  activeSubtype?: string;
  onSelect: (subtype: string) => void;
  allLabel?: string;
  className?: string;
}

export default function ServiceSubtypeChips({
  subtypes,
  activeSubtype = "all",
  onSelect,
  allLabel = "All types",
  className = "",
}: ServiceSubtypeChipsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onSelect("all")}
        className={chipClass(activeSubtype === "all")}
      >
        {allLabel}
      </button>
      {subtypes.map((subtype) => (
        <button
          key={subtype.id}
          type="button"
          onClick={() => onSelect(subtype.id)}
          className={chipClass(activeSubtype === subtype.id)}
          title={subtype.travelerHint}
        >
          {subtype.label}
        </button>
      ))}
    </div>
  );
}

function chipClass(active: boolean) {
  return [
    "rounded-full border px-3 py-2 text-xs font-semibold transition",
    active
      ? "border-[#ff5630] bg-[#ff5630] text-white"
      : "border-black/10 theme-muted hover:border-[#ff5630] hover:text-[#ff5630] dark:border-white/10",
  ].join(" ");
}
