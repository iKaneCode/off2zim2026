import type { PublicListingRecord } from "@/types/platform";
import { inferServiceGroup, inferServiceSubtype } from "@/lib/taxonomy";

type DemoInput = {
  title: string;
  slug: string;
  category: string;
  listingType: string;
  serviceGroup: string;
  serviceSubtype: string;
  destinationName: string;
  destinationLocation: string;
  price: number;
  image: string;
};

const demoInputs: DemoInput[] = [
  item("Falls Boutique Hotel", "falls-boutique-hotel", "Accommodation", "hotel", "stays", "hotel", "Victoria Falls", "Matabeleland North", 180, "/images/palm-river-hotel-604329-original.jpg"),
  item("Hwange Elephant Lodge", "hwange-elephant-lodge", "Accommodation", "lodge", "stays", "lodge", "Hwange National Park", "Matabeleland North", 260, "/images/hwange.jpg"),
  item("Harare Garden BnB", "harare-garden-bnb", "Accommodation", "bnb", "stays", "bnb", "Harare", "Harare Province", 65, "/images/jacaranda.JPG"),
  item("Zambezi White Water Rafting", "zambezi-white-water-rafting", "Experience", "rafting", "activities", "rafting", "Victoria Falls", "Matabeleland North", 145, "/images/rafting.jpg"),
  item("Flight of Angels Helicopter Ride", "flight-of-angels-helicopter-ride", "Experience", "helicopter-ride", "activities", "helicopter-ride", "Victoria Falls", "Matabeleland North", 165, "/images/victoria-falls.jpg"),
  item("Chimanimani Cultural Hiking Tour", "chimanimani-cultural-hiking-tour", "Experience", "cultural-tour", "activities", "cultural-tour", "Chimanimani", "Manicaland", 75, "/images/destinations/eastern-highlands.jpg"),
  item("Harare Airport Shuttle", "harare-airport-shuttle", "Transport", "airport-shuttles", "transport", "airport-shuttles", "Harare", "Harare Province", 18, "/images/slide1.jpg"),
  item("Eastern Highlands 4x4 Rental", "eastern-highlands-4x4-rental", "Transport", "car-rental", "transport", "car-rental", "Eastern Highlands", "Manicaland", 85, "/images/destinations/eastern-highlands.jpg"),
  item("Kariba Sunset Boat Cruise", "kariba-sunset-boat-cruise", "Transport", "boat-cruise", "transport", "boat-cruise", "Kariba", "Mashonaland West", 45, "/images/kariba.jpg"),
  item("The Boma Dinner and Drum Show", "the-boma-dinner-and-drum-show", "Dining", "local-cuisine", "dining", "local-cuisine", "Victoria Falls", "Matabeleland North", 65, "/images/victoria-falls.jpg"),
  item("Avondale Garden Cafe", "avondale-garden-cafe", "Dining", "cafe", "dining", "cafe", "Harare", "Harare Province", 14, "/images/jacaranda.JPG"),
  item("Victoria Falls Carnival Pass", "victoria-falls-carnival-pass", "Event", "festival", "events", "festival", "Victoria Falls", "Matabeleland North", 35, "/images/victoria-falls.jpg"),
  item("Harare Live Music Weekend", "harare-live-music-weekend", "Event", "music-concert", "events", "music-concert", "Harare", "Harare Province", 20, "/images/jacaranda.JPG"),
  item("Intwasa Arts Festival Ticket", "intwasa-arts-festival-ticket", "Event", "arts", "events", "arts", "Bulawayo", "Bulawayo Metropolitan", 12, "/images/bulawayo.jpg"),
];

export function getDemoPublicListings(): PublicListingRecord[] {
  return demoInputs.map((input, index) => {
    const destinationId = input.destinationName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return {
      id: `demo-${input.slug}`,
      companyId: `demo-company-${input.serviceGroup}`,
      title: input.title,
      slug: input.slug,
      category: input.category,
      listingType: input.listingType,
      shortDescription: `${input.title} is available in ${input.destinationName}.`,
      description: `${input.title} is demo inventory connected to ${input.destinationName} for testing destination-first browsing across Off2Zim.`,
      location: input.destinationName,
      pricingModel: input.serviceGroup === "stays" ? "per_night" : "per_person",
      basePrice: input.price,
      currency: "USD",
      instantBooking: true,
      bookingMode: "instant",
      status: "active",
      visibility: "public",
      capacity: input.serviceGroup === "events" ? 500 : input.serviceGroup === "transport" ? 4 : 8,
      pickupLeadTimeHours: input.serviceGroup === "transport" ? 3 : null,
      images: [input.image],
      tags: [input.serviceGroup, input.serviceSubtype, input.destinationName],
      amenities: ["Verified demo provider", "Destination linked", "Traveler friendly"],
      policies: { cancellation: "Flexible demo policy" },
      metadata: {
        demoSeed: true,
        serviceGroup: input.serviceGroup,
        serviceSubtype: input.serviceSubtype,
        destinationId,
        destinationName: input.destinationName,
        destinationLocation: input.destinationLocation,
      },
      destinationId,
      destinationName: input.destinationName,
      destinationLocation: input.destinationLocation,
      requiresDestination: ["stays", "dining", "activities"].includes(input.serviceGroup),
      hasDestinationAssignment: true,
      availability: [],
      bookingsCount: index % 4,
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      provider: {
        id: `demo-provider-${input.serviceGroup}`,
        companyName: demoCompanyName(input.serviceGroup),
        tradingName: null,
        location: input.destinationName,
        verificationTier: "verified_premium",
        hasVerifiedBadge: true,
      },
    };
  });
}

export function filterDemoPublicListings(filters: {
  search?: string | null;
  category?: string | null;
  listingType?: string | null;
  serviceGroup?: string | null;
  subtype?: string | null;
  destination?: string | null;
  location?: string | null;
}) {
  const search = normalize(filters.search);
  const destination = normalize(filters.destination);
  const location = normalize(filters.location);

  return getDemoPublicListings().filter((listing) => {
    const listingDestination = normalize(
      listing.destinationId || listing.destinationName || listing.location
    );
    const listingLocation = normalize(listing.location);
    const group = inferServiceGroup(listing);
    const subtype = inferServiceSubtype(listing);
    const haystack = normalize(
      [
        listing.title,
        listing.description,
        listing.shortDescription,
        listing.location,
        listing.category,
        listing.listingType,
        listing.tags.join(" "),
      ].join(" ")
    );

    return (
      (!filters.category || filters.category === "all" || listing.category === filters.category) &&
      (!filters.listingType || filters.listingType === "all" || listing.listingType === filters.listingType) &&
      (!filters.serviceGroup || filters.serviceGroup === "all" || group.id === filters.serviceGroup) &&
      (!filters.subtype || filters.subtype === "all" || subtype?.id === filters.subtype) &&
      (!destination || listingDestination.includes(destination) || destination.includes(listingDestination)) &&
      (!location || listingLocation.includes(location) || location.includes(listingLocation)) &&
      (!search || haystack.includes(search))
    );
  });
}

function item(
  title: string,
  slug: string,
  category: string,
  listingType: string,
  serviceGroup: string,
  serviceSubtype: string,
  destinationName: string,
  destinationLocation: string,
  price: number,
  image: string
): DemoInput {
  return {
    title,
    slug,
    category,
    listingType,
    serviceGroup,
    serviceSubtype,
    destinationName,
    destinationLocation,
    price,
    image,
  };
}

function demoCompanyName(serviceGroup: string) {
  if (serviceGroup === "stays") return "Zim Heritage Stays";
  if (serviceGroup === "activities") return "Zambezi Adventure Co.";
  if (serviceGroup === "transport") return "RouteLink Zimbabwe";
  if (serviceGroup === "dining") return "Taste Zimbabwe Collective";
  return "Zim Events Circuit";
}

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
