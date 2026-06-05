import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCommission, recordCommission } from "@/lib/commission";

const bookSchema = z.object({
  serviceId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();

    const profile = await prisma.guideProfile.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, userId: true, isActive: true },
    });

    if (!profile || !profile.isActive) {
      return apiError("Guide not found.", 404);
    }
    if (profile.userId === user.id) {
      return apiError("You cannot book your own guide services.", 400);
    }

    const payload = bookSchema.parse(await request.json());

    const service = await prisma.guideService.findFirst({
      where: { id: payload.serviceId, guideId: profile.id, isActive: true },
    });

    if (!service) {
      return apiError("Service not found or no longer available.", 404);
    }

    const { commissionAmount, netAmount } = calculateCommission(
      service.price,
      "guide_booking",
    );

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.guideBooking.create({
        data: {
          serviceId: service.id,
          explorerId: user.id,
          scheduledAt: new Date(payload.scheduledAt),
          status: "pending",
          totalAmount: service.price,
          commissionAmount,
          netAmount,
          currency: service.currency,
          notes: payload.notes,
        },
        include: {
          service: {
            select: { title: true, serviceType: true, durationMin: true },
          },
        },
      });

      // Record platform commission
      await recordCommission(tx, {
        transactionType: "guide_booking",
        transactionId: created.id,
        grossAmount: service.price,
        currency: service.currency,
      });

      return created;
    });

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          serviceId: booking.serviceId,
          serviceTitle: booking.service.title,
          serviceType: booking.service.serviceType,
          durationMin: booking.service.durationMin,
          scheduledAt: booking.scheduledAt.toISOString(),
          status: booking.status,
          totalAmount: booking.totalAmount,
          commissionAmount: booking.commissionAmount,
          netAmount: booking.netAmount,
          currency: booking.currency,
          notes: booking.notes,
          createdAt: booking.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid booking data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Guide booking error:", error);
    return apiError("Unable to book guide service.", 500);
  }
}
