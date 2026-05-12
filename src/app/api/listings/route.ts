import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { serializePublicListing } from "@/lib/platform";
import { inferServiceGroup, inferServiceSubtype } from "@/lib/taxonomy";
import { filterDemoPublicListings } from "@/lib/demo-taxonomy-listings";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // ── Filters ───────────────────��────────────────────────────────────────���───
    const q            = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
    const category     = searchParams.get("category")?.trim();
    const listingType  = searchParams.get("listingType")?.trim();
    const serviceGroup = searchParams.get("serviceGroup")?.trim();
    const subtype      = searchParams.get("subtype")?.trim();
    const destination  = searchParams.get("destination")?.trim();
    const location     = searchParams.get("location")?.trim();
    const minPrice     = parseFloat(searchParams.get("minPrice") ?? "");
    const maxPrice     = parseFloat(searchParams.get("maxPrice") ?? "");
    const instantOnly  = searchParams.get("instant") === "true";
    const verifiedOnly = searchParams.get("verified") === "true";
    const featuredOnly = searchParams.get("featured") === "true";

    // ── Pagination ─────────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10)));
    const skip  = (page - 1) * limit;

    // ── Sort ───────────────────────────────────────────────────────────────────
    const sortParam = searchParams.get("sort") ?? "newest";
    const orderBy =
      sortParam === "price_asc"  ? [{ basePrice: "asc"  as const }] :
      sortParam === "price_desc" ? [{ basePrice: "desc" as const }] :
      sortParam === "oldest"     ? [{ createdAt: "asc"  as const }] :
                                   [{ createdAt: "desc" as const }];
    const andFilters = [
      ...(destination
        ? [
            {
              OR: [
                { metadata: { contains: `"destinationId":"${destination}"` } },
                { metadata: { contains: `"destinationName":"${destination}"` } },
                { location: { contains: destination, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      ...(q
        ? [
            {
              OR: [
                { title:       { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { location:    { contains: q, mode: "insensitive" as const } },
                { tags:        { contains: q, mode: "insensitive" as const } },
                { company: { companyName: { contains: q, mode: "insensitive" as const } } },
              ],
            },
          ]
        : []),
    ];

    // ── Base where clause ──────────────────────────────────────────────────────
    const where = {
      visibility: "public",
      status: { in: ["active", "approved"] },
      ...(category    && category    !== "all" ? { category }    : {}),
      ...(listingType && listingType !== "all" ? { listingType } : {}),
      ...(instantOnly ? { instantBooking: true } : {}),
      ...(verifiedOnly ? { company: { isVerified: true } } : {}),
      ...(featuredOnly
        ? {
            featuredEntries: {
              some: {
                isActive: true,
                startDate: { lte: new Date() },
                endDate:   { gte: new Date() },
              },
            },
          }
        : {}),
      ...(location
        ? { location: { contains: location, mode: "insensitive" as const } }
        : {}),
      ...(!isNaN(minPrice) || !isNaN(maxPrice)
        ? {
            basePrice: {
              ...(!isNaN(minPrice) ? { gte: minPrice } : {}),
              ...(!isNaN(maxPrice) ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
    };

    const [total, listings] = await prisma.$transaction([
      prisma.providerListing.count({ where }),
      prisma.providerListing.findMany({
        where,
        include: {
          availability: true,
          bookings: true,
          company: true,
          featuredEntries: {
            where: { isActive: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
            select: { pathway: true },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const serializedListings = listings
      .map(serializePublicListing)
      .filter((listing) => {
        if (!serviceGroup || serviceGroup === "all") return true;
        return inferServiceGroup(listing).id === serviceGroup;
      })
      .filter((listing) => {
        if (!subtype || subtype === "all") return true;
        return inferServiceSubtype(listing)?.id === subtype;
      });

    return NextResponse.json({
      listings: serializedListings,
      pagination: {
        total: serviceGroup || subtype ? serializedListings.length : total,
        page,
        limit,
        pages: Math.ceil((serviceGroup || subtype ? serializedListings.length : total) / limit),
        hasNext: skip + limit < (serviceGroup || subtype ? serializedListings.length : total),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Public listings route error:", error);
    const { searchParams } = new URL(request.url);
    const listings = filterDemoPublicListings({
      search: searchParams.get("q") || searchParams.get("search"),
      category: searchParams.get("category"),
      listingType: searchParams.get("listingType"),
      serviceGroup: searchParams.get("serviceGroup"),
      subtype: searchParams.get("subtype"),
      destination: searchParams.get("destination"),
      location: searchParams.get("location"),
    });

    if (listings.length > 0) {
      return NextResponse.json({
        listings,
        pagination: {
          total: listings.length,
          page: 1,
          limit: listings.length,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
        fallback: "demo",
      });
    }

    return apiError("Unable to load listings right now.", 500);
  }
}
