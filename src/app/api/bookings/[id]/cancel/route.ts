import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateExplorerScore } from "@/lib/explorer-score";
import { releaseCommission } from "@/lib/commission";
import { sendBookingStatusUpdate } from "@/lib/platform-email";

export const dynamic = "force-dynamic";

/** Cancellable statuses — completed / already-cancelled bookings cannot be cancelled */
const CANCELLABLE_STATUSES = ["PENDING", "REQUESTED", "CONFIRMED"] as const;

/** Last-minute threshold: cancellations within this many hours of checkIn are penalised */
const LAST_MINUTE_HOURS = 24;

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireSessionUser();

    let reason: string | undefined;
    try {
      const parsed = cancelSchema.parse(await request.json());
      reason = parsed.reason;
    } catch {
      // body is optional — proceed without a reason
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        providerId: true,
        status: true,
        confirmationNumber: true,
        totalAmount: true,
        currency: true,
        checkIn: true,
        listing: { select: { title: true } },
        user: { select: { email: true, name: true } },
        provider: {
          select: {
            companyName: true,
            owner: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!booking) return apiError("Booking not found.", 404);

    // Auth: must be the explorer who owns it
    if (booking.userId !== user.id) {
      return apiError("You can only cancel your own bookings.", 403);
    }

    if (!(CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) {
      return apiError(
        `This booking cannot be cancelled (status: ${booking.status}).`,
        409
      );
    }

    // Detect last-minute cancellation (penalises explorer score)
    const isLastMinute =
      booking.checkIn != null &&
      new Date(booking.checkIn).getTime() - Date.now() <
        LAST_MINUTE_HOURS * 60 * 60 * 1000;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        metadata: JSON.stringify({
          cancelledBy: "explorer",
          cancelReason: reason ?? null,
          cancelledAt: new Date().toISOString(),
          isLastMinute,
        }),
      },
    });

    // Recalculate explorer score (last-minute cancellations incur penalty)
    void recalculateExplorerScore(user.id).catch(() => {});

    // Release any held commission back to provider net (booking cancelled — no fee)
    void releaseCommission("booking", booking.id).catch(() => {});

    const listingTitle = booking.listing?.title ?? "your booking";

    // Notify explorer
    void sendBookingStatusUpdate({
      to: booking.user.email,
      explorerName: booking.user.name ?? booking.user.email,
      confirmationNumber: booking.confirmationNumber,
      listingTitle,
      newStatus: "CANCELLED",
    }).catch(() => {});

    // Notify provider
    if (booking.provider?.owner?.email) {
      void sendBookingStatusUpdate({
        to: booking.provider.owner.email,
        explorerName: booking.provider.companyName,
        confirmationNumber: booking.confirmationNumber,
        listingTitle,
        newStatus: "CANCELLED",
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      confirmationNumber: booking.confirmationNumber,
      isLastMinute,
      message: isLastMinute
        ? "Booking cancelled. Note: this was a last-minute cancellation and may affect your Explorer Score."
        : "Booking cancelled successfully.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to cancel booking.", 500);
  }
}
