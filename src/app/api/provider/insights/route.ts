import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServiceProviderDisplayId } from "@/lib/service-provider-id";
import { resolveListingDisplayIds } from "@/lib/provider-listing-display-id";

export const dynamic = "force-dynamic";

type AnalyticsRow = {
  eventType: string;
  country: string | null;
  city: string | null;
  device: string | null;
  platform: string | null;
  userId: string | null;
  metadata: string;
  createdAt: Date;
};

function safeJsonParse(value: string | null | undefined) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function topBy<T extends string>(
  rows: AnalyticsRow[],
  selector: (row: AnalyticsRow) => T | null | undefined,
  fallback: T,
  limit = 10,
) {
  const counts = new Map<T, number>();

  for (const row of rows) {
    const key = selector(row) || fallback;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can view provider insights.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, createdAt: true, serviceProviderId: true },
    });

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Math.max(Number(searchParams.get("days") || 30) || 30, 1),
      365,
    );
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [rows, listings] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        select: {
          eventType: true,
          country: true,
          city: true,
          device: true,
          platform: true,
          userId: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.providerListing.findMany({
        where: { companyId: company.id },
        select: {
          id: true,
          title: true,
          slug: true,
          bookings: {
            select: { id: true },
          },
        },
      }),
    ]);

    const listingDisplayIds = await resolveListingDisplayIds(
      listings.map((listing) => listing.id),
    );
    const serviceProviderId = getServiceProviderDisplayId(company);
    const byListingId = new Map(
      listings.map((listing) => [listing.id, listing]),
    );
    const bySlug = new Map(
      listings.map((listing) => [listing.slug.toLowerCase(), listing]),
    );
    const byDisplayId = new Map(
      listings.map((listing) => [
        (listingDisplayIds.get(listing.id) || "").toLowerCase(),
        listing,
      ]),
    );
    const matchedRows: Array<{
      row: AnalyticsRow;
      listing: (typeof listings)[number] | null;
    }> = [];

    rows.forEach((row) => {
      const metadata = safeJsonParse(row.metadata);
      const listingId =
        readString(metadata.listingId) ||
        readString(metadata.internalListingId) ||
        readString(metadata.providerListingId);
      const listingDisplayId =
        readString(metadata.listingDisplayId) ||
        readString(metadata.displayListingId) ||
        readString(metadata.publicListingId);
      const slug =
        readString(metadata.slug) ||
        readString(metadata.listingSlug) ||
        readString(metadata.marketplaceSlug);
      const companyId =
        readString(metadata.companyId) ||
        readString(metadata.providerCompanyId) ||
        readString(metadata.providerId);
      const metadataServiceProviderId = readString(metadata.serviceProviderId);
      const listing =
        byListingId.get(listingId) ||
        byDisplayId.get(listingDisplayId.toLowerCase()) ||
        bySlug.get(slug.toLowerCase()) ||
        null;

      if (
        listing ||
        companyId === company.id ||
        metadataServiceProviderId === serviceProviderId
      ) {
        matchedRows.push({ row, listing });
      }
    });

    const viewsByListing = new Map<string, number>();
    matchedRows.forEach(({ listing }) => {
      if (!listing) return;
      viewsByListing.set(listing.id, (viewsByListing.get(listing.id) || 0) + 1);
    });
    const knownUsers = new Set(
      matchedRows.flatMap(({ row }) => (row.userId ? [row.userId] : [])),
    );

    return NextResponse.json({
      insights: {
        periodDays: days,
        sampledEvents: rows.length,
        matchedEvents: matchedRows.length,
        uniqueUsers: knownUsers.size,
        topListings: listings
          .map((listing) => {
            const views = viewsByListing.get(listing.id) || 0;
            const bookings = listing.bookings.length;

            return {
              id: listing.id,
              displayId: listingDisplayIds.get(listing.id) || listing.id,
              title: listing.title,
              views,
              bookings,
              conversionRate:
                views > 0 ? Math.round((bookings / views) * 100) : 0,
            };
          })
          .sort((a, b) => b.views - a.views || b.bookings - a.bookings)
          .slice(0, 8),
        byCountry: topBy(
          matchedRows.map(({ row }) => row),
          (row) => row.country,
          "Unknown",
        ),
        byCity: topBy(
          matchedRows.map(({ row }) => row),
          (row) => row.city,
          "Unknown",
        ),
        byPlatform: topBy(
          matchedRows.map(({ row }) => row),
          (row) => row.platform,
          "Unknown",
        ),
        byDevice: topBy(
          matchedRows.map(({ row }) => row),
          (row) => row.device,
          "Unknown",
        ),
        byEventType: topBy(
          matchedRows.map(({ row }) => row),
          (row) => row.eventType,
          "unknown",
        ),
        recent: matchedRows.slice(0, 50).map(({ row, listing }) => ({
          eventType: row.eventType,
          listingTitle: listing?.title ?? null,
          country: row.country,
          city: row.city,
          platform: row.platform,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider insights route error:", error);
    return apiError("Unable to load provider insights right now.", 500);
  }
}
