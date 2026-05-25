export type ServiceProviderCategoryId =
  | "stays"
  | "events"
  | "things_to_do"
  | "bus"
  | "flight";

export const SERVICE_PROVIDER_FILTERS: Array<{
  id: "all" | ServiceProviderCategoryId;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "stays", label: "Stays" },
  { id: "events", label: "Events" },
  { id: "things_to_do", label: "Things to do" },
  { id: "bus", label: "Bus" },
  { id: "flight", label: "Flight" },
];

const CATEGORY_KEYWORDS: Record<ServiceProviderCategoryId, string[]> = {
  stays: [
    "accommodation",
    "bnb",
    "bed and breakfast",
    "camp",
    "hotel",
    "lodge",
    "resort",
    "safari camp",
    "stay",
    "stays",
  ],
  events: [
    "arts",
    "boma",
    "concert",
    "event",
    "events",
    "festival",
    "happening",
    "live music",
    "sport",
  ],
  things_to_do: [
    "activity",
    "adventure",
    "attraction",
    "culture",
    "experience",
    "game drive",
    "guide",
    "safari",
    "things to do",
    "tour",
    "waterfall",
    "wildlife",
  ],
  bus: ["bus", "coach", "intercity"],
  flight: ["air ticket", "airline", "flight", "flights"],
};

export function inferServiceProviderCategories(
  values: Array<string | null | undefined>,
) {
  const normalized = values
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return (Object.keys(CATEGORY_KEYWORDS) as ServiceProviderCategoryId[]).filter(
    (categoryId) =>
      CATEGORY_KEYWORDS[categoryId].some((keyword) =>
        normalized.some((value) => value.includes(keyword)),
      ),
  );
}
