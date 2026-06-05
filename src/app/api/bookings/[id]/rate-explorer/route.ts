import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateExplorerScore } from "@/lib/explorer-score";
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
  const rl = await rateLimit(request, "rate-explorer", RATING_LIMIT);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider")
      return apiError("Only providers can rate explorers.", 403);

    const payload = rateSchema.parse(await request.json());

    // Find booking belonging to this provider's company
    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    if (!company) return apiError("Provider company not found.", 404);

    const booking = await prisma.booking.findFirst({
      where: { id: resolvedParams.id, providerId: company.id },
      select: {
        id: true,
        userId: true,
        status: true,
        isProviderRated: true,
        isExplorerRated: true,
        ratingsRevealedAt: true,
        explorerRating: true,
        providerRating: true,
      },
    });

    if (!booking) return apiError("Booking not found.", 404);
    if (booking.status !== "COMPLETED") {
      return apiError("You can only rate a completed booking.", 400);
    }
    if (booking.isProviderRated) {
      return apiError("You have already rated this explorer.", 409);
    }

    const now = new Date();
    const bothRated = booking.isExplorerRated;
    const revealAt = bothRated
      ? now
      : new Date(now.getTime() + BLIND_REVEAL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.booking.update({
      where: { id: resolvedParams.id },
      data: {
        providerRating: payload.rating,
        providerRatingNote: payload.note ?? null,
        isProviderRated: true,
        ratingsRevealedAt: bothRated
          ? now
          : (booking.ratingsRevealedAt ?? revealAt),
      },
    });

    // Fire-and-forget: provider rating feeds directly into Explorer Score
    void recalculateExplorerScore(booking.userId).catch((err) =>
      console.error("Explorer score recalc after provider rating failed:", err),
    );

    return NextResponse.json({
      success: true,
      revealed: bothRated,
      revealAt: bothRated ? now.toISOString() : revealAt.toISOString(),
      message: bothRated
        ? "Rating submitted. Both ratings are now visible."
        : `Rating submitted. Ratings will be revealed in ${BLIND_REVEAL_DAYS} days or once the explorer rates.`,
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
