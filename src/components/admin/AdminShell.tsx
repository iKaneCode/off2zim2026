"use client";

import { ReactNode, useEffect } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminShell({
  activePath,
  title,
  titleLeading,
  titleTrailing,
  description,
  actions,
  fixedHeader = false,
  children,
}: {
  activePath: string;
  title: ReactNode;
  titleLeading?: ReactNode;
  titleTrailing?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  fixedHeader?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!fixedHeader) return;

    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [fixedHeader]);

  return (
    <div
      className={
        fixedHeader
          ? "h-dvh overflow-hidden bg-slate-100/70 dark:bg-[#050505]"
          : "min-h-screen bg-slate-100/70 dark:bg-[#050505]"
      }
    >
      <div
        className={
          fixedHeader
            ? "grid h-full lg:grid-cols-[250px_minmax(0,1fr)]"
            : "grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]"
        }
      >
        <AdminSidebar activePath={activePath} />
        <main
          className={
            fixedHeader
              ? "flex h-full min-w-0 flex-col overflow-hidden"
              : "min-w-0"
          }
        >
          <AdminPageHeader
            title={title}
            titleLeading={titleLeading}
            titleTrailing={titleTrailing}
            description={description}
            actions={actions}
          />
          <div
            data-detail-scroll-container={fixedHeader ? "" : undefined}
            className={
              fixedHeader
                ? "min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6"
                : "space-y-6 px-4 py-6 sm:px-6"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
