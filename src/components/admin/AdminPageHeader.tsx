"use client";

import { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: ReactNode;
  titleLeading?: ReactNode;
  titleTrailing?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export default function AdminPageHeader({
  title,
  titleLeading,
  titleTrailing,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-slate-100/95 px-6 py-5 backdrop-blur dark:border-white/10 dark:bg-[#050505]/95">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-3xl items-start gap-3">
          {titleLeading}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {title}
              </h1>
              {titleTrailing}
            </div>
            {typeof description === "string" ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-white/45">
                {description}
              </p>
            ) : description ? (
              <div className="mt-2">{description}</div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
