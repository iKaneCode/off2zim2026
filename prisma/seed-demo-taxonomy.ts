import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DemoListing = {
  title: string;
  slug: string;
  category: string;
  listingType: string;
  destinationId?: string;
  destinationName?: string;
  destinationLocation?: string;
  location: string;
  shortDescription: string;
  description: string;
  pricingModel: string;
  basePrice: number;
  capacity: number;
  serviceGroup: string;
  serviceSubtype: string;
  tags: string[];
  amenities: string[];
  image: string;
};

const companies = [
  {
    email: "demo-stays@off2zim.co.zw",
    companyName: "Zim Heritage Stays",
    category: "Accommodation",
    city: "Victoria Falls",
    services: ["Hotels", "Lodges", "BnBs", "Safari camps"],
  },
  {
    email: "demo-adventures@off2zim.co.zw",
    companyName: "Zambezi Adventure Co.",
    category: "Experience",
    city: "Victoria Falls",
    services: ["Rafting", "Helicopter rides", "Bungee jumping", "Zip line"],
  },
  {
    email: "demo-transport@off2zim.co.zw",
    companyName: "RouteLink Zimbabwe",
    category: "Transport",
    city: "Harare",
    services: ["Airport shuttles", "Car rental", "Bus bookings", "Taxi services"],
  },
  {
    email: "demo-dining@off2zim.co.zw",
    companyName: "Taste Zimbabwe Collective",
    category: "Dining",
    city: "Harare",
    services: ["Restaurants", "Cafes", "Fast food", "Local cuisine"],
  },
  {
    email: "demo-events@off2zim.co.zw",
    companyName: "Zim Events Circuit",
    category: "Event",
    city: "Bulawayo",
    services: ["Festivals", "Music concerts", "Arts", "Boma nights"],
  },
] as const;

const listings: DemoListing[] = [
  stay("Falls Boutique Hotel", "falls-boutique-hotel", "hotel", "Victoria Falls", "Matabeleland North", 180),
  stay("Hwange Elephant Lodge", "hwange-elephant-lodge", "lodge", "Hwange National Park", "Matabeleland North", 260),
  stay("Harare Garden BnB", "harare-garden-bnb", "bnb", "Harare", "Harare Province", 65),
  stay("Mana Pools Safari Camp", "mana-pools-safari-camp", "safari-camp", "Mana Pools", "Mashonaland West", 320),
  stay("Kariba Lakeside Caravan Park", "kariba-lakeside-caravan-park", "caravan-park", "Kariba", "Mashonaland West", 35),
  activity("Zambezi White Water Rafting", "zambezi-white-water-rafting", "rafting", "Victoria Falls", "Matabeleland North", 145),
  activity("Flight of Angels Helicopter Ride", "flight-of-angels-helicopter-ride", "helicopter-ride", "Victoria Falls", "Matabeleland North", 165),
  activity("Victoria Falls Gorge Zip Line", "victoria-falls-gorge-zip-line", "zip-line", "Victoria Falls", "Matabeleland North", 55),
  activity("Bridge Bungee Jump", "bridge-bungee-jump", "bungee-jumping", "Victoria Falls", "Matabeleland North", 120),
  activity("Chimanimani Cultural Hiking Tour", "chimanimani-cultural-hiking-tour", "cultural-tour", "Chimanimani", "Manicaland", 75),
  transport("Harare Airport Shuttle", "harare-airport-shuttle", "airport-shuttles", "Harare", "Harare Province", 18),
  transport("Victoria Falls Taxi Service", "victoria-falls-taxi-service", "taxi-services", "Victoria Falls", "Matabeleland North", 12),
  transport("Eastern Highlands 4x4 Rental", "eastern-highlands-4x4-rental", "car-rental", "Eastern Highlands", "Manicaland", 85),
  transport("Bulawayo to Hwange Bus", "bulawayo-to-hwange-bus", "bus-bookings", "Bulawayo", "Bulawayo Metropolitan", 25),
  transport("Kariba Sunset Boat Cruise", "kariba-sunset-boat-cruise", "boat-cruise", "Kariba", "Mashonaland West", 45),
  dining("The Boma Dinner and Drum Show", "the-boma-dinner-and-drum-show", "local-cuisine", "Victoria Falls", "Matabeleland North", 65),
  dining("Avondale Garden Cafe", "avondale-garden-cafe", "cafe", "Harare", "Harare Province", 14),
  dining("Bulawayo Grill House", "bulawayo-grill-house", "restaurant", "Bulawayo", "Bulawayo Metropolitan", 28),
  dining("Mutare Fast Food Stop", "mutare-fast-food-stop", "fast-food", "Mutare", "Manicaland", 9),
  event("Victoria Falls Carnival Pass", "victoria-falls-carnival-pass", "festival", "Victoria Falls", "Matabeleland North", 35),
  event("Harare Live Music Weekend", "harare-live-music-weekend", "music-concert", "Harare", "Harare Province", 20),
  event("Intwasa Arts Festival Ticket", "intwasa-arts-festival-ticket", "arts", "Bulawayo", "Bulawayo Metropolitan", 12),
  event("Boma Cultural Night", "boma-cultural-night", "boma", "Victoria Falls", "Matabeleland North", 55),
];

async function main() {
  console.log("🌱 Seeding destination taxonomy demo listings...");

  const companyMap = new Map<string, string>();

  for (const company of companies) {
    const user = await prisma.user.upsert({
      where: { email: company.email },
      update: {
        role: "provider",
        verificationStatus: "approved",
        hasVerifiedBadge: true,
      },
      create: {
        email: company.email,
        name: company.companyName,
        role: "provider",
        verificationStatus: "approved",
        hasVerifiedBadge: true,
      },
    });

    const provider = await prisma.providerCompany.upsert({
      where: { ownerUserId: user.id },
      update: {
        companyName: company.companyName,
        businessCategory: company.category,
        onboardingStatus: "basic_approved",
        verificationTier: "verified_premium",
        isVerified: true,
        isFeaturedEligible: true,
        servicesOffered: JSON.stringify(company.services),
        serviceAreas: JSON.stringify(["Harare", "Victoria Falls", "Bulawayo", "Kariba", "Manicaland"]),
      },
      create: {
        ownerUserId: user.id,
        companyName: company.companyName,
        businessRegistrationNumber: `DEMO-${company.category.toUpperCase()}`,
        mainContactPerson: company.companyName,
        businessPhone: "+263 77 000 0000",
        businessEmail: company.email,
        physicalAddress: `${company.city}, Zimbabwe`,
        headquartersCity: company.city,
        businessCategory: company.category,
        businessDescription: `${company.companyName} provides demo ${company.category.toLowerCase()} inventory for Off2Zim destination-first browsing.`,
        servicesOffered: JSON.stringify(company.services),
        serviceAreas: JSON.stringify(["Harare", "Victoria Falls", "Bulawayo", "Kariba", "Manicaland"]),
        onboardingStatus: "basic_approved",
        verificationTier: "verified_premium",
        isVerified: true,
        isFeaturedEligible: true,
        basicApprovedAt: new Date(),
      },
    });

    companyMap.set(company.category, provider.id);
  }

  for (const listing of listings) {
    const companyId = companyMap.get(listing.category);

    if (!companyId) {
      throw new Error(`Missing demo company for ${listing.category}`);
    }

    await prisma.providerListing.upsert({
      where: { slug: listing.slug },
      update: buildListingData(companyId, listing),
      create: buildListingData(companyId, listing),
    });
  }

  console.log(`✅ Seeded ${listings.length} taxonomy demo listings.`);
}

function buildListingData(companyId: string, listing: DemoListing) {
  return {
    companyId,
    title: listing.title,
    slug: listing.slug,
    category: listing.category,
    listingType: listing.listingType,
    shortDescription: listing.shortDescription,
    description: listing.description,
    location: listing.location,
    pricingModel: listing.pricingModel,
    basePrice: listing.basePrice,
    currency: "USD",
    instantBooking: true,
    bookingMode: "instant",
    status: "active",
    visibility: "public",
    capacity: listing.capacity,
    pickupLeadTimeHours: listing.serviceGroup === "transport" ? 3 : null,
    images: JSON.stringify([listing.image]),
    tags: JSON.stringify(listing.tags),
    amenities: JSON.stringify(listing.amenities),
    policies: JSON.stringify({ cancellation: "Flexible demo policy" }),
    metadata: JSON.stringify({
      serviceGroup: listing.serviceGroup,
      serviceSubtype: listing.serviceSubtype,
      destinationId: listing.destinationId,
      destinationName: listing.destinationName,
      destinationLocation: listing.destinationLocation,
      demoSeed: true,
    }),
  };
}

function stay(slugTitle: string, slug: string, subtype: string, destinationName: string, province: string, price: number): DemoListing {
  return {
    title: slugTitle,
    slug,
    category: "Accommodation",
    listingType: subtype,
    destinationId: destinationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    destinationName,
    destinationLocation: province,
    location: destinationName,
    shortDescription: `${slugTitle} is a destination-linked ${subtype.replace(/-/g, " ")} for travelers staying in ${destinationName}.`,
    description: `${slugTitle} gives explorers a clear accommodation option inside ${destinationName}, with simple pricing and destination context for trip planning.`,
    pricingModel: "per_night",
    basePrice: price,
    capacity: 2,
    serviceGroup: "stays",
    serviceSubtype: subtype,
    tags: ["destination stay", subtype, destinationName],
    amenities: ["WiFi", "Secure parking", "Breakfast"],
    image: "/images/palm-river-hotel-604329-original.jpg",
  };
}

function activity(title: string, slug: string, subtype: string, destinationName: string, province: string, price: number): DemoListing {
  return {
    title,
    slug,
    category: "Experience",
    listingType: subtype,
    destinationId: destinationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    destinationName,
    destinationLocation: province,
    location: destinationName,
    shortDescription: `${title} is available in ${destinationName} for travelers comparing destination-specific things to do.`,
    description: `${title} is a bookable activity connected to ${destinationName}. It can be discovered from the destination page, activity filters, or trip planner.`,
    pricingModel: "per_person",
    basePrice: price,
    capacity: 8,
    serviceGroup: "activities",
    serviceSubtype: subtype,
    tags: ["activity", subtype, destinationName],
    amenities: ["Guide", "Safety briefing", "Local operator"],
    image: subtype === "rafting" ? "/images/rafting.jpg" : "/images/victoria-falls.jpg",
  };
}

function transport(title: string, slug: string, subtype: string, destinationName: string, province: string, price: number): DemoListing {
  return {
    title,
    slug,
    category: "Transport",
    listingType: subtype,
    destinationId: destinationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    destinationName,
    destinationLocation: province,
    location: destinationName,
    shortDescription: `${title} helps travelers move through ${destinationName} or connect it to the wider Zimbabwe route.`,
    description: `${title} is transport inventory that can be browsed globally or from a destination hub when it is relevant to that place.`,
    pricingModel: subtype === "car-rental" ? "per_day" : "per_service",
    basePrice: price,
    capacity: subtype === "bus-bookings" ? 45 : 4,
    serviceGroup: "transport",
    serviceSubtype: subtype,
    tags: ["transport", subtype, destinationName],
    amenities: ["Verified operator", "Route support", "Pickup coordination"],
    image: "/images/slide1.jpg",
  };
}

function dining(title: string, slug: string, subtype: string, destinationName: string, province: string, price: number): DemoListing {
  return {
    title,
    slug,
    category: "Dining",
    listingType: subtype,
    destinationId: destinationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    destinationName,
    destinationLocation: province,
    location: destinationName,
    shortDescription: `${title} gives travelers a dining option inside ${destinationName}.`,
    description: `${title} is dining inventory linked to ${destinationName}, making food discovery destination-first rather than generic.`,
    pricingModel: "per_person",
    basePrice: price,
    capacity: 30,
    serviceGroup: "dining",
    serviceSubtype: subtype,
    tags: ["dining", subtype, destinationName],
    amenities: ["Reservations", "Group friendly", "Local recommendations"],
    image: "/images/victoria-falls.jpg",
  };
}

function event(title: string, slug: string, subtype: string, destinationName: string, province: string, price: number): DemoListing {
  return {
    title,
    slug,
    category: "Event",
    listingType: subtype,
    destinationId: destinationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    destinationName,
    destinationLocation: province,
    location: destinationName,
    shortDescription: `${title} is an event travelers can build into a ${destinationName} itinerary.`,
    description: `${title} is event inventory connected to ${destinationName}, available from global events and destination-specific discovery.`,
    pricingModel: "per_person",
    basePrice: price,
    capacity: 500,
    serviceGroup: "events",
    serviceSubtype: subtype,
    tags: ["event", subtype, destinationName],
    amenities: ["Ticketed entry", "Destination event", "Traveler friendly"],
    image: "/images/bulawayo.jpg",
  };
}

main()
  .catch((error) => {
    console.error("❌ Unable to seed taxonomy demo listings:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
