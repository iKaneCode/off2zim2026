"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSurfaceHref } from "@/lib/app-surface";

export default function TripPlannerAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="theme-page flex min-h-[70vh] items-center justify-center px-4">
        <div className="theme-card h-40 w-full max-w-md animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="theme-page flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="apple-surface max-w-xl rounded-[2rem] p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0071e3] text-white">
            <CalendarDays className="h-5 w-5" />
          </div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#86868b] dark:text-white/42">
            Itinerary
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-[#1d1d1f] dark:text-white">
            Sign in to build and manage your itinerary.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6e6e73] dark:text-white/62">
            The calendar, saved trip items, and booking timeline are account tools, so they only appear once you are signed in.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={`${getSurfaceHref("explorer", "/login")}?redirect=${encodeURIComponent("/trip-planner")}`}
              className="apple-action"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={getSurfaceHref("explorer", "/register")}
              className="apple-action-secondary"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
