import type { ReactNode } from "react";

interface CompactPageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  imageUrl: string;
  children?: ReactNode;
  className?: string;
}

export default function CompactPageHero({
  eyebrow,
  title,
  description,
  imageUrl,
  children,
  className = "",
}: CompactPageHeroProps) {
  return (
    <section className={`mx-auto max-w-7xl px-4 pb-3 pt-5 sm:px-6 lg:px-8 ${className}`}>
      <div
        className="relative overflow-hidden rounded-2xl border border-black/10 bg-cover bg-center shadow-sm dark:border-white/10"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.74), rgba(0,0,0,0.34) 58%, rgba(0,0,0,0.48)), url('${imageUrl}')`,
        }}
      >
        <div className="flex min-h-[250px] flex-col justify-end p-4 text-white sm:p-5 lg:p-6">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-lg bg-black/42 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/76 backdrop-blur">
              {eyebrow}
            </div>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight md:text-5xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 md:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
