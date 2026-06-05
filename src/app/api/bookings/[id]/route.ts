import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeExplorerBooking } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();

    const booking = await prisma.booking.findFirst({
      where: {
        confirmationNumber: resolvedParams.id,
        userId: user.id,
      },
      include: {
        listing: true,
        provider: true,
        disputes: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!booking) {
      return apiError("Booking not found.", 404);
    }

    return NextResponse.json({
      booking: serializeExplorerBooking(booking),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }

    console.error("Booking detail route error:", error);
    return apiError("Unable to load booking right now.", 500);
  }
}
