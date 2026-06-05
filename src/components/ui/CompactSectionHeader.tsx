import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

interface CompactSectionHeaderProps {
  eyebrow?: string;
  title: string;
  count?: number | string;
  actionHref?: string;
  actionLabel?: string;
  trailing?: ReactNode;
}

export default function CompactSectionHeader({
  eyebrow,
  title,
  count,
  actionHref,
  actionLabel = "View all",
  trailing,
}: CompactSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="theme-label text-[10px] font-semibold uppercase tracking-[0.22em]">{eyebrow}</p>
        ) : null}
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <h2 className="theme-heading truncate text-xl font-bold md:text-2xl">{title}</h2>
          {count !== undefined ? (
            <span className="shrink-0 rounded-full bg-black/[0.055] px-2.5 py-1 text-xs font-semibold text-[#6e6e73] dark:bg-white/[0.08] dark:text-white/62">
              {count}
            </span>
          ) : null}
        </div>
      </div>
      {trailing}
      {actionHref ? (
        <Link
          href={actionHref}
          aria-label={actionLabel}
          className="apple-action-secondary inline-flex h-9 w-9 shrink-0 items-center justify-center p-0"
          title={actionLabel}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
