import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/platform";
import { recalculateExplorerScore } from "@/lib/explorer-score";
import { sendBookingStatusUpdate } from "@/lib/platform-email";

export const dynamic = "force-dynamic";
const updateSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
  ]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can update booking statuses.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const payload = updateSchema.parse(await request.json());

    const booking = await prisma.booking.findFirst({
      where: {
        id: resolvedParams.id,
        providerId: company.id,
      },
      select: { id: true },
    });

    if (!booking) {
      return apiError("Booking not found.", 404);
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: payload.status,
      },
      include: {
        user: true,
        listing: true,
        disputes: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // Recalculate explorer score on completion or cancellation
    if (payload.status === "COMPLETED" || payload.status === "CANCELLED") {
      recalculateExplorerScore(updated.userId).catch(() => {});
    }

    // Notify explorer of status change for key transitions
    if (["CONFIRMED", "COMPLETED", "CANCELLED"].includes(payload.status)) {
      void sendBookingStatusUpdate({
        to: updated.user.email,
        explorerName: updated.user.name ?? updated.user.email,
        confirmationNumber: updated.confirmationNumber,
        listingTitle: updated.listing?.title ?? "your booking",
        newStatus: payload.status,
      }).catch(() => {});
    }

    return NextResponse.json({
      order: serializeOrder(updated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid booking update",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider booking update error:", error);
    return apiError("Unable to update booking right now.", 500);
  }
}
