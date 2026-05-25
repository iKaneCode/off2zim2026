"use client";

import { ReactNode } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminShell({
  activePath,
  title,
  description,
  actions,
  children,
}: {
  activePath: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#050505]">
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
        <AdminSidebar activePath={activePath} />
        <main className="min-w-0">
          <AdminPageHeader
            title={title}
            description={description}
            actions={actions}
          />
          <div className="space-y-6 px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
