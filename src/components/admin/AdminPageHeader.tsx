"use client";

import { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export default function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h1>
          {typeof description === "string" ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-white/45">
              {description}
            </p>
          ) : description ? (
            <div className="mt-2">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
