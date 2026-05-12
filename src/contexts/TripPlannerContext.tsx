"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  PlannerCatalogItem,
  TripPlannerItem,
  TripPlannerMeta,
  TripPlannerState,
} from "@/types/trip-planner";
import { toTripPlannerItem } from "@/lib/trip-planner/catalog";

export const TRIP_PLANNER_STORAGE_KEY = "off2zim_trip_planner_v2";
const LEGACY_STORAGE_KEYS = ["off2zim_trip_planner_v1"];
const DEFAULT_META: TripPlannerMeta = {
  title: "My Zimbabwe Journey",
  travelers: 2,
};

interface TripPlannerContextType extends TripPlannerState {
  isHydrated: boolean;
  addItem: (item: TripPlannerItem) => void;
  addCatalogItem: (
    item: PlannerCatalogItem,
    overrides?: Partial<TripPlannerItem>
  ) => TripPlannerItem;
  updateItem: (itemId: string, updates: Partial<TripPlannerItem>) => void;
  removeItem: (itemId: string) => void;
  reorderItems: (items: TripPlannerItem[]) => void;
  clearItems: () => void;
  setTotalBudget: (value: number) => void;
  updateMeta: (updates: Partial<TripPlannerMeta>) => void;
  loadSharedPlan: (plan: TripPlannerState) => void;
}

const TripPlannerContext = createContext<TripPlannerContextType | undefined>(undefined);

export function useTripPlanner() {
  const context = useContext(TripPlannerContext);
  if (!context) {
    throw new Error("useTripPlanner must be used within TripPlannerProvider");
  }
  return context;
}

export function TripPlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TripPlannerState>({
    items: [],
    totalBudget: 2000,
    meta: DEFAULT_META,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

      const raw = localStorage.getItem(TRIP_PLANNER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TripPlannerState>;
        setState({
          items: Array.isArray(parsed.items) ? parsed.items : [],
          totalBudget:
            typeof parsed.totalBudget === "number" ? parsed.totalBudget : 2000,
          meta:
            parsed.meta && typeof parsed.meta === "object"
              ? {
                  ...DEFAULT_META,
                  ...parsed.meta,
                }
              : DEFAULT_META,
        });
      }
    } catch {
      // Ignore malformed persisted planner data.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(TRIP_PLANNER_STORAGE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const value = useMemo<TripPlannerContextType>(
    () => ({
      ...state,
      isHydrated,
      addItem: (item) => {
        setState((prev) => ({ ...prev, items: [...prev.items, item] }));
      },
      addCatalogItem: (item, overrides = {}) => {
        const plannerItem = toTripPlannerItem(item, overrides);
        setState((prev) => ({ ...prev, items: [...prev.items, plannerItem] }));
        return plannerItem;
      },
      updateItem: (itemId, updates) => {
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }));
      },
      removeItem: (itemId) => {
        setState((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        }));
      },
      reorderItems: (items) => {
        setState((prev) => ({ ...prev, items }));
      },
      clearItems: () => {
        setState((prev) => ({ ...prev, items: [] }));
      },
      setTotalBudget: (value) => {
        setState((prev) => ({ ...prev, totalBudget: value }));
      },
      updateMeta: (updates) => {
        setState((prev) => ({
          ...prev,
          meta: {
            ...prev.meta,
            ...updates,
            // Enforce minimum of 1 traveler so quantity never becomes 0
            // (which would silently produce $0 bookings).
            ...(updates.travelers !== undefined
              ? { travelers: Math.max(1, updates.travelers) }
              : {}),
          },
        }));
      },
      loadSharedPlan: (plan) => {
        setState({
          items: Array.isArray(plan.items) ? plan.items : [],
          totalBudget: typeof plan.totalBudget === "number" ? plan.totalBudget : 2000,
          meta:
            plan.meta && typeof plan.meta === "object"
              ? {
                  ...DEFAULT_META,
                  ...plan.meta,
                }
              : DEFAULT_META,
        });
      },
    }),
    [isHydrated, state]
  );

  return (
    <TripPlannerContext.Provider value={value}>
      {children}
    </TripPlannerContext.Provider>
  );
}
