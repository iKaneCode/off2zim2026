"use client";

import {
  ArrowRight,
  Briefcase,
  CalendarRange,
  Coins,
  MapPinned,
  NotebookPen,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { TripPlannerMeta } from "@/types/trip-planner";

interface PlannerOverviewSectionProps {
  meta: TripPlannerMeta;
  totalBudget: number;
  onMetaChange: (updates: Partial<TripPlannerMeta>) => void;
  onBudgetChange: (value: number) => void;
  onContinueToBoard: () => void;
  onOpenAddDrawer: (date?: string) => void;
}

const quickActions = [
  {
    title: "Stay",
    text: "Anchor each destination with a place to rest.",
  },
  {
    title: "Experience",
    text: "Add the moments that make the trip memorable.",
  },
  {
    title: "Transfer",
    text: "Connect the route so every day feels realistic.",
  },
];

export default function PlannerOverviewSection({
  meta,
  totalBudget,
  onMetaChange,
  onBudgetChange,
  onContinueToBoard,
  onOpenAddDrawer,
}: PlannerOverviewSectionProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div className="theme-panel rounded-[30px] p-5 shadow-xl md:p-7">
        <div className="flex flex-col gap-3 border-b border-black/10 pb-5 dark:border-white/10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="theme-label text-xs uppercase tracking-[0.24em]">
              Explore
            </p>
            <h2 className="theme-heading mt-2 text-2xl font-semibold md:text-3xl">
              Shape the journey before you place it on the board
            </h2>
            <p className="theme-muted mt-3 max-w-2xl text-sm leading-6 md:text-base">
              Start with the trip brief, align the budget, and define the travel
              window. Once the foundation is right, the day-by-day board becomes
              faster and much easier to use.
            </p>
          </div>

          <button
            onClick={onContinueToBoard}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff5630]/20 transition hover:bg-[#e44c28]"
          >
            Continue to board
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
              <Briefcase className="h-4 w-4" />
              Trip name
            </span>
            <input
              value={meta.title}
              onChange={(event) => onMetaChange({ title: event.target.value })}
              placeholder="My Zimbabwe Journey"
              className="theme-input h-12 w-full rounded-[18px] px-4"
            />
          </label>

          <label className="space-y-2">
            <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
              <Users className="h-4 w-4" />
              Travelers
            </span>
            <input
              type="number"
              min={1}
              value={meta.travelers}
              onChange={(event) =>
                onMetaChange({ travelers: Math.max(1, Number(event.target.value) || 1) })
              }
              className="theme-input h-12 w-full rounded-[18px] px-4"
            />
          </label>

          <label className="space-y-2">
            <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
              <CalendarRange className="h-4 w-4" />
              Start date
            </span>
            <input
              type="date"
              value={meta.startDate || ""}
              onChange={(event) => onMetaChange({ startDate: event.target.value || undefined })}
              className="theme-input h-12 w-full rounded-[18px] px-4"
            />
          </label>

          <label className="space-y-2">
            <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
              <MapPinned className="h-4 w-4" />
              End date
            </span>
            <input
              type="date"
              value={meta.endDate || ""}
              min={meta.startDate}
              onChange={(event) => onMetaChange({ endDate: event.target.value || undefined })}
              className="theme-input h-12 w-full rounded-[18px] px-4"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
              <Coins className="h-4 w-4" />
              Trip budget
            </span>
            <div className="theme-input flex h-12 items-center rounded-[18px] px-4">
              <span className="theme-subtle pr-2 text-sm">$</span>
              <input
                type="number"
                min={0}
                value={totalBudget}
                onChange={(event) => onBudgetChange(Number(event.target.value) || 0)}
                className="h-full w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="theme-label inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
              <NotebookPen className="h-4 w-4" />
              Planning notes
            </span>
            <textarea
              value={meta.notes || ""}
              onChange={(event) => onMetaChange({ notes: event.target.value })}
              placeholder="Special requests, pacing preferences, family needs, or must-do moments."
              className="theme-input min-h-[120px] w-full rounded-[22px] px-4 py-3"
            />
          </label>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="theme-panel rounded-[30px] p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="theme-label text-xs uppercase tracking-[0.24em]">
                Enjoy
              </p>
              <h3 className="theme-heading mt-2 text-xl font-semibold">
                Quick-start the itinerary
              </h3>
            </div>
            <Sparkles className="h-5 w-5 text-[#ff5630]" />
          </div>

          <div className="mt-5 space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => onOpenAddDrawer(meta.startDate)}
                className="theme-card-soft flex w-full items-start justify-between gap-3 rounded-[24px] p-4 text-left transition hover:border-[#ff5630] hover:text-[#ff5630] dark:hover:border-[#ff7352]"
              >
                <div>
                  <div className="theme-heading font-semibold">{action.title}</div>
                  <div className="theme-muted mt-1 text-sm leading-6">
                    {action.text}
                  </div>
                </div>
                <div className="rounded-full bg-[#ff5630] p-2 text-white">
                  <Plus className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}
