import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();

    // Fetch the booking — accessible by either the explorer or the provider
    const booking = await prisma.booking.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        userId: true,
        providerId: true,
        status: true,
        isExplorerRated: true,
        isProviderRated: true,
        ratingsRevealedAt: true,
        explorerRating: true,
        explorerRatingNote: true,
        providerRating: true,
        providerRatingNote: true,
      },
    });

    if (!booking) return apiError("Booking not found.", 404);

    // Authorisation: must be the explorer or the provider's owner
    const isExplorer = booking.userId === user.id;
    let isProvider = false;
    if (booking.providerId) {
      const company = await prisma.providerCompany.findUnique({
        where: { id: booking.providerId },
        select: { ownerUserId: true },
      });
      isProvider = company?.ownerUserId === user.id;
    }
    if (!isExplorer && !isProvider) {
      return apiError("You are not authorised to view these ratings.", 403);
    }

    // Determine reveal status
    const now = new Date();
    const revealed =
      (booking.isExplorerRated && booking.isProviderRated) ||
      (booking.ratingsRevealedAt != null && booking.ratingsRevealedAt <= now);

    // Build the response — hide actual scores until revealed (blind system)
    const explorerRated = {
      submitted: booking.isExplorerRated,
      // Only show to provider once revealed; explorer sees own submission immediately
      rating: revealed || isExplorer ? booking.explorerRating : null,
      note: revealed || isExplorer ? booking.explorerRatingNote : null,
    };

    const providerRated = {
      submitted: booking.isProviderRated,
      // Only show to explorer once revealed; provider sees own submission immediately
      rating: revealed || isProvider ? booking.providerRating : null,
      note: revealed || isProvider ? booking.providerRatingNote : null,
    };

    return NextResponse.json({
      bookingId: booking.id,
      status: booking.status,
      revealed,
      revealAt: booking.ratingsRevealedAt?.toISOString() ?? null,
      explorerRated, // explorer → provider rating
      providerRated, // provider → explorer rating
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to load ratings.", 500);
  }
}
