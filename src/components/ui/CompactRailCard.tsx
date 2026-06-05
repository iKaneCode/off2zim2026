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
      className={`group relative flex h-[204px] overflow-hidden rounded-[1.75rem] border border-black/[0.08] bg-white text-[#1d1d1f] shadow-[0_22px_70px_-58px_rgba(0,0,0,0.4)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_90px_-56px_rgba(0,0,0,0.48)] dark:border-white/[0.09] dark:bg-white/[0.055] dark:text-white ${className}`}
      tabIndex={href ? -1 : 0}
    >
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.68)), url('${imageUrl}')`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] dark:bg-[linear-gradient(180deg,#1c1c1e,#0b0b0d)]" />
      )}

      <div className="relative flex h-full w-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/88 text-[#0071e3] shadow-sm backdrop-blur-xl dark:bg-black/42 dark:text-[#8ec5ff]">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            {meta ? (
              <span className="truncate rounded-full border border-white/16 bg-black/34 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xl">
                {meta}
              </span>
            ) : null}
          </div>
          {badge !== undefined && badge !== null ? (
            <span className="rounded-full bg-white/88 px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] shadow-sm backdrop-blur-xl dark:bg-black/50 dark:text-white">
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
              <MapPin className="h-3.5 w-3.5 shrink-0 fill-current text-[#ff3b30]" />
              {detail}
            </p>
          ) : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>

      {description ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-3 rounded-2xl border border-white/12 bg-black/78 p-3 text-xs leading-5 text-white opacity-0 shadow-lg backdrop-blur-xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {description}
        </div>
      ) : null}

      {href ? (
        <span className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/88 text-[#1d1d1f] opacity-0 shadow-sm backdrop-blur-xl transition duration-300 group-hover:opacity-100 dark:bg-black/55 dark:text-white">
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
