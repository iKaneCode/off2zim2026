import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { getMobileDestinations, getMobileStays } from "@/lib/mobile-backend";
import { serializePublicListing } from "@/lib/platform";
import {
  getDestinationById,
  isMatchingDestination,
  type ExplorerDestinationSummary,
} from "@/lib/destination-explorer";
import { inferServiceGroup } from "@/lib/taxonomy";
import { getDemoPublicListings } from "@/lib/demo-taxonomy-listings";

export const dynamic = "force-dynamic";

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const destinations =
      (await getMobileDestinations()) as ExplorerDestinationSummary[];
    const destination = getDestinationById(destinations, resolvedParams.id);

    if (!destination) {
      return apiError("Destination not found.", 404);
    }

    const [
      allStaysResult,
      listingsResult,
      restaurantsResult,
      guidesResult,
      forumQuestionsResult,
    ] = await Promise.allSettled([
      getMobileStays(),
      prisma.providerListing.findMany({
        where: {
          visibility: "public",
          status: { in: ["active", "approved"] },
          OR: [
            { metadata: { contains: `"destinationId":"${destination.id}"` } },
            {
              metadata: { contains: `"destinationName":"${destination.name}"` },
            },
            { location: { contains: destination.name, mode: "insensitive" } },
            ...(destination.location
              ? [
                  {
                    location: {
                      contains: destination.location,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
          ],
        },
        include: {
          availability: true,
          bookings: true,
          company: true,
          featuredEntries: {
            where: {
              isActive: true,
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
            select: { pathway: true },
            take: 1,
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 18,
      }),
      prisma.restaurant.findMany({
        where: {
          OR: [
            { destination: { slug: destination.id } },
            { location: { contains: destination.name, mode: "insensitive" } },
          ],
        },
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
        take: 12,
      }),
      prisma.guideProfile.findMany({
        where: {
          destinations: { contains: destination.name },
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        take: 8,
      }),
      prisma.forumQuestion.findMany({
        where: {
          destination: { slug: destination.id },
          isRemoved: false,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              name: true,
              image: true,
              role: true,
            },
          },
          _count: { select: { answers: { where: { isRemoved: false } } } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
    ]);
    const allStays = settledValue(allStaysResult, []);
    const listings = settledValue(listingsResult, []);
    const restaurants = settledValue(restaurantsResult, []);
    const guides = settledValue(guidesResult, []);
    const forumQuestions = settledValue(forumQuestionsResult, []);

    const stays = allStays.filter((stay) =>
      isMatchingDestination(
        stay.destinations?.name ?? stay.location,
        destination,
      ),
    );

    const publicListings =
      listings.length > 0
        ? listings.map(serializePublicListing)
        : getDemoPublicListings().filter((listing) =>
            isMatchingDestination(
              listing.destinationId ||
                listing.destinationName ||
                listing.location,
              destination,
            ),
          );
    const listingsByGroup = publicListings.reduce(
      (groups, listing) => {
        const group = inferServiceGroup(listing);
        groups[group.id].push(listing);
        return groups;
      },
      {
        stays: [],
        transport: [],
        dining: [],
        activities: [],
        events: [],
      } as Record<
        ReturnType<typeof inferServiceGroup>["id"],
        typeof publicListings
      >,
    );

    const activityListings = listingsByGroup.activities;
    const transportListings = listingsByGroup.transport;
    const eventListings = listingsByGroup.events;
    const diningListings = listingsByGroup.dining;

    const restaurantItems = restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      cuisine: restaurant.cuisine,
      location: restaurant.location,
      priceRange: restaurant.priceRange,
      rating: restaurant.rating,
      images: safeJsonParse<string[]>(restaurant.images, []),
    }));

    const guideItems = guides.map((guide) => ({
      id: guide.id,
      name:
        [guide.user.firstName, guide.user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        guide.user.name ||
        "Guide",
      bio: guide.bio,
      rating: guide.rating,
      reviewCount: guide.reviewCount,
      avatarUrl: guide.user.image,
      specialties: safeJsonParse<string[]>(guide.specialties, []),
      destinations: safeJsonParse<string[]>(guide.destinations, []),
      languages: safeJsonParse<string[]>(guide.languages, []),
    }));

    const questionItems = forumQuestions.map((question) => ({
      id: question.id,
      title: question.title,
      body: question.body,
      createdAt: question.createdAt.toISOString(),
      isPinned: question.isPinned,
      answerCount: question._count.answers,
      author: {
        id: question.author.id,
        name:
          [question.author.firstName, question.author.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          question.author.name ||
          "Explorer",
        avatarUrl: question.author.image,
        isGuide: question.author.role === "guide",
      },
    }));

    return NextResponse.json({
      destination,
      scoped: {
        stays,
        activities: activityListings,
        transport: transportListings,
        diningListings,
        events: eventListings,
        restaurants: restaurantItems,
        guides: guideItems,
        forumQuestions: questionItems,
      },
      counts: {
        stays: stays.length,
        activities: activityListings.length,
        transport: transportListings.length,
        diningListings: diningListings.length,
        events: eventListings.length,
        restaurants: restaurantItems.length,
        guides: guideItems.length,
        questions: questionItems.length,
      },
    });
  } catch (error) {
    console.error("Destination context route error:", error);
    return apiError("Unable to load destination context right now.", 500);
  }
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") {
    return result.value;
  }

  console.warn("Destination context source unavailable:", result.reason);
  return fallback;
}
