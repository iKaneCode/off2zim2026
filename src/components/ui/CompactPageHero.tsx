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
    <section className={`mx-auto max-w-7xl px-4 pb-4 pt-5 sm:px-6 lg:px-8 ${className}`}>
      <div
        className="apple-scale-in relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-cover bg-center shadow-[0_32px_100px_-74px_rgba(0,0,0,0.55)] dark:border-white/[0.1]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.62)), url('${imageUrl}')`,
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.66),rgba(0,0,0,0.16)_58%,rgba(0,0,0,0.08))]" />
        <div className="relative flex min-h-[282px] flex-col justify-end p-4 text-white sm:p-6 lg:min-h-[330px] lg:p-8">
          <div className="apple-fade-up max-w-3xl">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/78 backdrop-blur-xl">
              {eyebrow}
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-[1.04] md:text-5xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/76 md:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {children ? <div className="apple-fade-up mt-5" style={{ animationDelay: "120ms" }}>{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
