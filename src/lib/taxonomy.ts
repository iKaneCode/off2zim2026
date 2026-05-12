export type ServiceGroupId =
  | "stays"
  | "transport"
  | "dining"
  | "activities"
  | "events";

export interface ServiceSubtype {
  id: string;
  label: string;
  aliases: string[];
  description: string;
  travelerHint: string;
}

export interface ServiceGroup {
  id: ServiceGroupId;
  label: string;
  providerCategory: string;
  description: string;
  destinationScoped: boolean;
  globalBrowse: boolean;
  subtypes: ServiceSubtype[];
}

export const serviceGroups: ServiceGroup[] = [
  {
    id: "stays",
    label: "Stays",
    providerCategory: "Accommodation",
    description: "Hotels, lodges, BnBs, safari camps, caravan parks, and other places to sleep.",
    destinationScoped: true,
    globalBrowse: false,
    subtypes: [
      subtype("hotel", "Hotels", "Full-service stays for city, business, and leisure trips.", ["hotels"]),
      subtype("lodge", "Lodges", "Nature-led stays, often close to parks, lakes, or scenic routes.", ["lodges"]),
      subtype("bnb", "BnBs", "Smaller guest stays with local hosting and simpler booking.", ["b&b", "b and b", "bed and breakfast", "bnbs"]),
      subtype("backpackers", "Backpackers", "Budget-friendly hostels and social traveler stays.", ["backpacker", "hostel", "hostels"]),
      subtype("safari-camp", "Safari camps", "Bush camps, tented camps, and wildlife-focused stays.", ["safari camp", "tented camp", "bush camp"]),
      subtype("caravan-park", "Caravan parks", "Camping, caravan, and self-drive overnight stops.", ["caravan", "camping", "camp site", "campsite"]),
    ],
  },
  {
    id: "transport",
    label: "Transport",
    providerCategory: "Transport",
    description: "Flights, ride hailing, rental cars, buses, taxis, shuttles, game drives, and cruises.",
    destinationScoped: false,
    globalBrowse: true,
    subtypes: [
      subtype("flights", "Flights", "Domestic and regional air connections.", ["flight", "air ticket", "airline"]),
      subtype("ride-hailing", "Ride hailing", "On-demand local rides and app-style pickup services.", ["ride hailing", "ride share", "rideshare"]),
      subtype("car-rental", "Car rental", "Self-drive cars, SUVs, and 4x4 rentals.", ["car hire", "rental car", "self drive", "self-drive"]),
      subtype("bus-bookings", "Bus bookings", "Intercity and regional bus seats.", ["bus", "coach", "intercity"]),
      subtype("taxi-services", "Taxi services", "Local taxis, private rides, and point-to-point transfers.", ["taxi", "cab"]),
      subtype("airport-shuttles", "Airport shuttles", "Airport pickup, drop-off, and hotel transfers.", ["airport transfer", "airport shuttle", "transfer"]),
      subtype("game-drive", "Game drives", "Vehicle-based wildlife drives in parks and conservancies.", ["game drive", "safari drive"]),
      subtype("boat-cruise", "Boat cruises", "Lake, river, and sunset cruise transport experiences.", ["boat cruise", "sunset cruise", "cruise"]),
    ],
  },
  {
    id: "dining",
    label: "Dining",
    providerCategory: "Dining",
    description: "Restaurants, cafes, fast food, fine dining, and local food experiences.",
    destinationScoped: true,
    globalBrowse: false,
    subtypes: [
      subtype("restaurant", "Restaurants", "Sit-down dining and destination restaurants.", ["restaurants"]),
      subtype("cafe", "Cafes", "Coffee, light meals, and casual daytime stops.", ["cafes", "coffee shop"]),
      subtype("fast-food", "Fast food", "Quick meals, takeaways, and casual chains.", ["fast food", "takeaway", "take away"]),
      subtype("fine-dining", "Fine dining", "Premium dining and special occasion restaurants.", ["fine dining"]),
      subtype("local-cuisine", "Local cuisine", "Zimbabwean dishes and local food experiences.", ["traditional food", "local food"]),
    ],
  },
  {
    id: "activities",
    label: "Activities",
    providerCategory: "Experience",
    description: "Adventure, culture, wildlife, water, and guided things to do.",
    destinationScoped: true,
    globalBrowse: true,
    subtypes: [
      subtype("skydiving", "Skydiving", "High-adrenaline aerial experiences.", ["sky diving", "skydive"]),
      subtype("zip-line", "Zip line", "Canopy and gorge zip line activities.", ["zipline", "zip lining"]),
      subtype("bungee-jumping", "Bungee jumping", "Bridge and gorge bungee experiences.", ["bungee", "bungy"]),
      subtype("helicopter-ride", "Helicopter rides", "Scenic flights and aerial sightseeing.", ["helicopter", "heli ride", "flight of angels"]),
      subtype("rafting", "Rafting", "White-water and river rafting trips.", ["white water rafting", "white-water rafting"]),
      subtype("game-drive", "Game drives", "Wildlife viewing by vehicle.", ["safari drive", "game viewing"]),
      subtype("quad-biking", "Quad biking", "ATV and off-road adventure rides.", ["quad bike", "atv"]),
      subtype("snorkeling", "Snorkeling", "Guided underwater or lake-based activities.", ["snorkelling"]),
      subtype("cultural-tour", "Cultural tours", "Heritage, history, village, and arts-led tours.", ["culture", "heritage", "museum"]),
    ],
  },
  {
    id: "events",
    label: "Events",
    providerCategory: "Event",
    description: "Concerts, festivals, arts, sport, Boma nights, and location-specific happenings.",
    destinationScoped: false,
    globalBrowse: true,
    subtypes: [
      subtype("music-concert", "Music concerts", "Live music, nightlife, and entertainment events.", ["concert", "music", "live music"]),
      subtype("festival", "Festivals", "Food, culture, music, and seasonal festivals.", ["festivals"]),
      subtype("arts", "Arts", "Gallery, theatre, craft, and cultural arts programming.", ["art", "theatre", "theater", "gallery"]),
      subtype("boma", "The Boma", "Dinner, drum, dance, and destination-specific cultural nights.", ["the boma", "boma dinner", "drum show"]),
      subtype("sport", "Sport", "Sporting events, races, and active gatherings.", ["sports", "race", "marathon"]),
      subtype("local-happening", "Local happenings", "Location-specific activities and community events.", ["local event", "community", "market"]),
    ],
  },
];

export const destinationBrowseModes = [
  {
    id: "region",
    label: "Browse by region",
    description: "Follow scenic corridors such as the Eastern Highlands, Zambezi, and western safari belt.",
  },
  {
    id: "province",
    label: "Browse by province",
    description: "Compare destinations by Zimbabwean province or metropolitan area.",
  },
  {
    id: "city",
    label: "Browse by city",
    description: "Start from gateway cities such as Harare, Bulawayo, Mutare, and Victoria Falls.",
  },
  {
    id: "activity",
    label: "Browse by activity",
    description: "Find destinations that offer the activity, event, or travel style you want.",
  },
] as const;

export function normalizeTaxonomyValue(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getServiceGroup(groupId: ServiceGroupId) {
  return serviceGroups.find((group) => group.id === groupId);
}

export function getSubtypesForGroup(groupId: ServiceGroupId) {
  return getServiceGroup(groupId)?.subtypes ?? [];
}

export function inferServiceGroup(input: {
  category?: string | null;
  listingType?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
}): ServiceGroup {
  const explicitGroup =
    typeof input.metadata?.serviceGroup === "string"
      ? normalizeTaxonomyValue(input.metadata.serviceGroup)
      : "";
  const values = [
    explicitGroup,
    input.category,
    input.listingType,
    input.title,
    typeof input.metadata?.serviceSubtype === "string"
      ? input.metadata.serviceSubtype
      : undefined,
  ]
    .filter(Boolean)
    .map((value) => normalizeTaxonomyValue(String(value)));

  for (const group of serviceGroups) {
    const categoryMatch = normalizeTaxonomyValue(group.providerCategory);
    const groupMatch = normalizeTaxonomyValue(group.id);
    const labelMatch = normalizeTaxonomyValue(group.label);

    if (values.some((value) => [categoryMatch, groupMatch, labelMatch].includes(value))) {
      return group;
    }
  }

  for (const group of serviceGroups) {
    if (
      group.subtypes.some((subtypeItem) =>
        [subtypeItem.id, subtypeItem.label, ...subtypeItem.aliases]
          .map(normalizeTaxonomyValue)
          .some((candidate) => values.includes(candidate))
      )
    ) {
      return group;
    }
  }

  return serviceGroups.find((group) => group.id === "activities") ?? serviceGroups[0];
}

export function inferServiceSubtype(input: {
  category?: string | null;
  listingType?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const group = inferServiceGroup(input);
  const values = [
    input.listingType,
    input.category,
    input.title,
    typeof input.metadata?.serviceSubtype === "string"
      ? input.metadata.serviceSubtype
      : undefined,
  ]
    .filter(Boolean)
    .map((value) => normalizeTaxonomyValue(String(value)));

  return (
    group.subtypes.find((subtypeItem) =>
      [subtypeItem.id, subtypeItem.label, ...subtypeItem.aliases]
        .map(normalizeTaxonomyValue)
        .some((candidate) =>
          values.some(
            (value) =>
              value === candidate ||
              value.includes(candidate) ||
              candidate.includes(value)
          )
        )
    ) ?? group.subtypes[0]
  );
}

function subtype(
  id: string,
  label: string,
  description: string,
  aliases: string[] = []
): ServiceSubtype {
  return {
    id,
    label,
    aliases: [label, id, ...aliases],
    description,
    travelerHint: description,
  };
}
