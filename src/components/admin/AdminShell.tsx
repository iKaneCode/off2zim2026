"use client";

import { ReactNode } from "react";
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
  return (
    <div
      className={
        fixedHeader
          ? "h-screen bg-slate-100/70 dark:bg-[#050505]"
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
              ? "flex h-screen min-w-0 flex-col overflow-hidden"
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
