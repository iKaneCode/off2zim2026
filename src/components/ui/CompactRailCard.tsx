import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { ArrowRight, MapPin } from "lucide-react";

interface CompactRailCardProps {
  title: string;
  href?: string;
  imageUrl?: string | null;
  icon?: ElementType;
  meta?: string | null;
  detail?: string | null;
  description?: string | null;
  badge?: string | number | null;
  actionLabel?: string;
  children?: ReactNode;
  className?: string;
}

export default function CompactRailCard({
  title,
  href,
  imageUrl,
  icon: Icon,
  meta,
  detail,
  description,
  badge,
  actionLabel = "Open",
  children,
  className = "",
}: CompactRailCardProps) {
  const content = (
    <article
      className={`group relative flex h-[188px] overflow-hidden rounded-xl border border-black/10 bg-white text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff5630]/60 dark:border-white/10 dark:bg-white/[0.045] dark:text-white ${className}`}
      tabIndex={href ? -1 : 0}
    >
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.62)), url('${imageUrl}')`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/[0.035] dark:bg-white/[0.035]" />
      )}

      <div className="relative flex h-full w-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff5630] text-white">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            {meta ? (
              <span className="truncate rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {meta}
              </span>
            ) : null}
          </div>
          {badge !== undefined && badge !== null ? (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-950 dark:bg-black/55 dark:text-white">
              {badge}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className={`line-clamp-2 text-lg font-semibold leading-tight ${imageUrl ? "text-white" : "theme-heading"}`}>
            {title}
          </h3>
          {detail ? (
            <p className={`mt-2 flex items-center gap-1.5 truncate text-xs ${imageUrl ? "text-white/78" : "theme-muted"}`}>
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#ff7352]" />
              {detail}
            </p>
          ) : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>

      {description ? (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 translate-y-2 rounded-lg bg-black/82 p-3 text-xs leading-5 text-white opacity-0 shadow-lg backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {description}
        </div>
      ) : null}

      {href ? (
        <span className="absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#ff5630] text-white opacity-0 transition group-hover:opacity-100">
          <ArrowRight className="h-4 w-4" />
        </span>
      ) : null}
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} aria-label={`${actionLabel}: ${title}`} className="block focus:outline-none">
      {content}
    </Link>
  );
}
