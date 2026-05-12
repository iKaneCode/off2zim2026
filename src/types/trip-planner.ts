export type PlannerItemType =
  | "accommodation"
  | "activity"
  | "transport"
  | "dining";

export interface PlannerCatalogItem {
  id: string;
  name: string;
  type: PlannerItemType;
  category: string;
  location: string;
  price: string;
  priceUnit: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  duration?: string;
  amenities?: string[];
  highlights?: string[];
  difficulty?: string;
  groupSize?: string;
  maxGuests?: number;
  availability: string;
  featured: boolean;
}

export interface TripPlannerItem {
  id: string;
  sourceId?: string;
  title: string;
  type: PlannerItemType;
  location: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  duration: string;
  cost: number;
  unitCost?: number;
  quantity?: number;
  pricingUnit?: string;
  maxGuests?: number;
  description: string;
  rating: number;
  image: string;
  category: string;
}

export interface TripPlannerMeta {
  title: string;
  travelers: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  excludedDates?: string[];
}

export interface PlannerScheduleDefaults {
  date?: string;
  startTime?: string;
  endTime?: string;
}

export interface TripPlannerState {
  items: TripPlannerItem[];
  totalBudget: number;
  meta: TripPlannerMeta;
}
