export interface ExplorerDestinationSummary {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
  images?: string[];
  region?: string | null;
  bestTime?: string | null;
  explorerFocus?: string | null;
  highlights?: string[];
  stays_count?: number;
  activities_count?: number;
  transport_count?: number;
  dining_count?: number;
  events_count?: number;
  featured?: boolean;
  category?: string | null;
  price_range?: string | null;
  rating?: number | null;
  weather?: string | null;
}

export interface CuratedDestinationEntry {
  id: string;
  name: string;
  location: string;
  region: string;
  description: string;
  explorerFocus: string;
  bestTime: string;
  category: string;
  featured?: boolean;
  highlights: string[];
  image_url: string;
  images: string[];
}

export const curatedZimbabweDestinations: CuratedDestinationEntry[] = [
  {
    id: "victoria-falls",
    name: "Victoria Falls",
    location: "Matabeleland North",
    region: "North-west Zimbabwe",
    description: "Zimbabwe's most iconic arrival point for waterfalls, river activity, safari extensions, and high-energy first impressions.",
    explorerFocus: "Adventure, iconic sights, and river atmosphere",
    bestTime: "May - October",
    category: "Adventure capital",
    featured: true,
    highlights: ["The Falls", "Zambezi cruises", "Helicopter views", "Adventure sports"],
    image_url: "/images/victoria-falls.jpg",
    images: ["/images/victoria-falls.jpg"],
  },
  {
    id: "hwange-national-park",
    name: "Hwange National Park",
    location: "Matabeleland North",
    region: "Western safari belt",
    description: "A flagship safari destination known for elephants, game drives, bush camps, and longer wildlife-focused itineraries.",
    explorerFocus: "Safari, wildlife density, and remote lodges",
    bestTime: "April - October",
    category: "Safari classic",
    featured: true,
    highlights: ["Elephant herds", "Game drives", "Bush camps", "Birdlife"],
    image_url: "/images/hwange.jpg",
    images: ["/images/hwange.jpg"],
  },
  {
    id: "great-zimbabwe",
    name: "Great Zimbabwe",
    location: "Masvingo Province",
    region: "South-east heritage corridor",
    description: "A heritage-led route built around the stone ruins, cultural context, museums, and slower historical travel.",
    explorerFocus: "Culture, history, and heritage storytelling",
    bestTime: "April - September",
    category: "Culture & history",
    featured: true,
    highlights: ["Stone ruins", "Museum visits", "Cultural tours", "Lake Mutirikwi"],
    image_url: "/images/great-zimbabwe.jpg",
    images: ["/images/great-zimbabwe.jpg"],
  },
  {
    id: "eastern-highlands",
    name: "Eastern Highlands",
    location: "Manicaland",
    region: "Eastern mountain corridor",
    description: "A cooler scenic route of mountains, waterfalls, tea estates, and boutique escapes spread across Nyanga, Vumba, and Chimanimani.",
    explorerFocus: "Scenery, hiking, and quiet escapes",
    bestTime: "March - November",
    category: "Scenic escape",
    featured: true,
    highlights: ["Waterfalls", "Mountain roads", "Tea estates", "Boutique retreats"],
    image_url: "/images/destinations/eastern-highlands.jpg",
    images: ["/images/destinations/eastern-highlands.jpg"],
  },
  {
    id: "kariba",
    name: "Kariba",
    location: "Mashonaland West",
    region: "Northern lake district",
    description: "A slower lake destination shaped by houseboats, sunsets, fishing, and water-led group escapes.",
    explorerFocus: "Lake travel, sunsets, and houseboat rhythm",
    bestTime: "May - October",
    category: "Lake escape",
    highlights: ["Houseboats", "Sunset cruises", "Fishing trips", "Lake views"],
    image_url: "/images/kariba.jpg",
    images: ["/images/kariba.jpg"],
  },
  {
    id: "harare",
    name: "Harare",
    location: "Harare Province",
    region: "Central urban gateway",
    description: "The main entry and business hub for many Zimbabwe trips, with dining, events, city stays, and easy onward planning.",
    explorerFocus: "Urban stays, food, and practical arrival logistics",
    bestTime: "Year-round",
    category: "Urban gateway",
    highlights: ["Restaurants", "Events", "City hotels", "Day-trip access"],
    image_url: "/images/jacaranda.JPG",
    images: ["/images/jacaranda.JPG"],
  },
  {
    id: "bulawayo",
    name: "Bulawayo",
    location: "Bulawayo Metropolitan",
    region: "South-west city and heritage zone",
    description: "A calmer city base for architecture, museums, rail history, and onward access to Matobo and Hwange routes.",
    explorerFocus: "Culture, city history, and regional access",
    bestTime: "Year-round",
    category: "Historic city",
    highlights: ["Museums", "Architecture", "Matobo access", "Arts festivals"],
    image_url: "/images/bulawayo.jpg",
    images: ["/images/bulawayo.jpg"],
  },
  {
    id: "matobo-hills",
    name: "Matobo Hills",
    location: "Matabeleland South",
    region: "Granite landscape near Bulawayo",
    description: "A destination of balancing rocks, cave art, rhino tracking, and spiritual landscapes close to Bulawayo.",
    explorerFocus: "Landscape, heritage, and guided nature walks",
    bestTime: "April - October",
    category: "Landscape & heritage",
    highlights: ["Balancing rocks", "Rock art", "Rhino tracking", "Hill walks"],
    image_url: "/images/destinations/matobo.jpg",
    images: ["/images/destinations/matobo.jpg"],
  },
  {
    id: "mana-pools",
    name: "Mana Pools",
    location: "Mashonaland West",
    region: "Lower Zambezi wilderness",
    description: "A remote wilderness destination for canoeing, walking safari, and some of the country's most immersive wildlife travel.",
    explorerFocus: "Raw safari, canoeing, and remote camps",
    bestTime: "June - October",
    category: "Remote wilderness",
    highlights: ["Walking safari", "Canoeing", "Riverside camps", "Big game"],
    image_url: "/images/safariCamp1.jpg",
    images: ["/images/safariCamp1.jpg"],
  },
  {
    id: "chimanimani",
    name: "Chimanimani",
    location: "Manicaland",
    region: "South-eastern mountain frontier",
    description: "A mountain-focused route for serious hiking, wild scenery, and explorers who want distance from mainstream circuits.",
    explorerFocus: "Hiking, mountain routes, and wilderness",
    bestTime: "April - November",
    category: "Mountain adventure",
    highlights: ["Multi-day hikes", "Peaks", "Mountain rivers", "Remote lodges"],
    image_url: "/images/destinations/eastern-highlands.jpg",
    images: ["/images/destinations/eastern-highlands.jpg"],
  },
  {
    id: "nyanga",
    name: "Nyanga",
    location: "Manicaland",
    region: "Northern Eastern Highlands",
    description: "A highland route of mist, trout fishing, mountain drives, and cool-weather scenery for slower scenic travel.",
    explorerFocus: "Cool weather, views, and gentle outdoor travel",
    bestTime: "March - November",
    category: "Highland retreat",
    highlights: ["Mountain views", "Trout fishing", "Waterfalls", "Scenic drives"],
    image_url: "/images/destinations/eastern-highlands.jpg",
    images: ["/images/destinations/eastern-highlands.jpg"],
  },
  {
    id: "mutare",
    name: "Mutare",
    location: "Manicaland",
    region: "Eastern gateway city",
    description: "A practical eastern base that opens up Vumba, Nyanga, and border-crossing routes while still offering city convenience.",
    explorerFocus: "Gateway stays, road access, and eastern routes",
    bestTime: "Year-round",
    category: "Gateway city",
    highlights: ["Eastern gateway", "Nearby mountains", "Road-trip base", "Urban convenience"],
    image_url: "/images/destinations/eastern-highlands.jpg",
    images: ["/images/destinations/eastern-highlands.jpg"],
  },
];

export const explorerGlobalServices = [
  { label: "Explore", href: "/travel-guide" },
  { label: "Events", href: "/events" },
  { label: "Transport", href: "/transport" },
  { label: "Itinerary", href: "/trip-planner" },
] as const;

export const destinationScopedServices = [
  { label: "Stays", href: "/accommodation" },
  { label: "Things To Do", href: "/activities" },
  { label: "Restaurants", href: "/restaurants" },
  { label: "Ask a Local", href: "/ask-a-local" },
] as const;

export function slugifyDestinationName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function normalizeDestinationValue(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function isMatchingDestination(
  value: string | null | undefined,
  destination: Pick<ExplorerDestinationSummary, "id" | "name" | "location">
) {
  const normalizedValue = normalizeDestinationValue(value);

  if (!normalizedValue) {
    return false;
  }

  return [destination.id, destination.name, destination.location]
    .map((item) => normalizeDestinationValue(item))
    .filter(Boolean)
    .some(
      (candidate) =>
        normalizedValue === candidate ||
        normalizedValue.includes(candidate) ||
        candidate.includes(normalizedValue)
    );
}

export function withDestinationContext(pathname: string, destinationId?: string | null) {
  if (!destinationId) {
    return pathname;
  }

  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}destination=${encodeURIComponent(destinationId)}`;
}

export function getDestinationById<T extends ExplorerDestinationSummary>(
  destinations: T[],
  destinationId: string | null | undefined
) {
  const normalizedId = normalizeDestinationValue(destinationId);

  if (!normalizedId) {
    return null;
  }

  return (
    destinations.find(
      (destination) =>
        normalizeDestinationValue(destination.id) === normalizedId ||
        normalizeDestinationValue(destination.name) === normalizedId
    ) ?? null
  );
}

export function enrichDestination(destination: ExplorerDestinationSummary): ExplorerDestinationSummary {
  const curated =
    curatedZimbabweDestinations.find(
      (item) =>
        normalizeDestinationValue(item.id) === normalizeDestinationValue(destination.id) ||
        normalizeDestinationValue(item.name) === normalizeDestinationValue(destination.name)
    ) ?? null;

  if (!curated) {
    return destination;
  }

  return {
    ...curated,
    ...destination,
    id: destination.id || curated.id,
    name: destination.name || curated.name,
    location: destination.location || curated.location,
    region: destination.region || curated.region,
    description: destination.description || curated.description,
    explorerFocus: destination.explorerFocus || curated.explorerFocus,
    bestTime: destination.bestTime || curated.bestTime,
    category: destination.category || curated.category,
    highlights:
      destination.highlights && destination.highlights.length > 0
        ? destination.highlights
        : curated.highlights,
    image_url: destination.image_url || curated.image_url,
    images: destination.images && destination.images.length > 0 ? destination.images : curated.images,
    featured: destination.featured ?? curated.featured ?? false,
  };
}

export function mergeWithCuratedDestinations<T extends ExplorerDestinationSummary>(destinations: T[]) {
  const merged = destinations.map((destination) => enrichDestination(destination)) as T[];
  const seen = new Set(
    merged.flatMap((destination) => [
      normalizeDestinationValue(destination.id),
      normalizeDestinationValue(destination.name),
    ])
  );

  for (const curated of curatedZimbabweDestinations) {
    if (seen.has(normalizeDestinationValue(curated.id)) || seen.has(normalizeDestinationValue(curated.name))) {
      continue;
    }

    merged.push({ ...curated } as T);
  }

  return merged;
}
