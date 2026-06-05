import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse, RATING_LIMIT } from "@/lib/rate-limit";

const BLIND_REVEAL_DAYS = 7;

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const rl = await rateLimit(request, "rate-provider", RATING_LIMIT);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const { user } = await requireSessionUser();
    const payload = rateSchema.parse(await request.json());

    // Booking must belong to this explorer and be completed
    const booking = await prisma.booking.findFirst({
      where: { id: resolvedParams.id, userId: user.id },
      select: {
        id: true,
        status: true,
        isExplorerRated: true,
        isProviderRated: true,
        ratingsRevealedAt: true,
        explorerRating: true,
        providerRating: true,
      },
    });

    if (!booking) return apiError("Booking not found.", 404);
    if (booking.status !== "COMPLETED") {
      return apiError("You can only rate a completed booking.", 400);
    }
    if (booking.isExplorerRated) {
      return apiError("You have already rated this booking.", 409);
    }

    const now = new Date();
    const bothRated = booking.isProviderRated; // if provider already rated, this completes both sides
    const revealAt = bothRated
      ? now // reveal immediately when both have rated
      : new Date(now.getTime() + BLIND_REVEAL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.booking.update({
      where: { id: resolvedParams.id },
      data: {
        explorerRating: payload.rating,
        explorerRatingNote: payload.note ?? null,
        isExplorerRated: true,
        // Reveal now if both have rated; otherwise set future reveal window
        ratingsRevealedAt: bothRated
          ? now
          : (booking.ratingsRevealedAt ?? revealAt),
      },
    });

    // Fire-and-forget — the explorer rated the provider, which feeds into
    // review aggregation (not explorer score; explorer score is provider→explorer)
    void prisma.booking.findFirst({ where: { id: resolvedParams.id } });

    return NextResponse.json({
      success: true,
      revealed: bothRated,
      revealAt: bothRated ? now.toISOString() : revealAt.toISOString(),
      message: bothRated
        ? "Rating submitted. Both ratings are now visible."
        : `Rating submitted. Ratings will be revealed in ${BLIND_REVEAL_DAYS} days or once the provider rates.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid rating data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to submit rating.", 500);
  }
}
