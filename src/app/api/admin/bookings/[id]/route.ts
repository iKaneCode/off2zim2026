import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAdminBooking } from "@/lib/platform";

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
    if (user.role !== "admin") {
      return apiError("Only administrators can update platform bookings.", 403);
    }

    const payload = updateSchema.parse(await request.json());

    const booking = await prisma.booking.findUnique({
      where: { id: resolvedParams.id },
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
        provider: true,
        disputes: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        companyId: updated.providerId,
        action: "booking_status_updated",
        targetType: "booking",
        targetId: updated.id,
        summary: `Booking moved to ${payload.status}`,
        metadata: JSON.stringify({
          confirmationNumber: updated.confirmationNumber,
          status: payload.status,
        }),
      },
    });

    return NextResponse.json({
      booking: serializeAdminBooking(updated),
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
    console.error("Admin booking update error:", error);
    return apiError("Unable to update booking right now.", 500);
  }
}
