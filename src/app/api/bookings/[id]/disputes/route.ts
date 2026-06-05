import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeDispute } from "@/lib/platform";

export const dynamic = "force-dynamic";

const createDisputeSchema = z.object({
  reason: z.string().min(3),
  details: z.string().min(10),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    const payload = createDisputeSchema.parse(await request.json());

    const booking = await prisma.booking.findFirst({
      where: {
        confirmationNumber: resolvedParams.id,
        OR: [
          { userId: user.id },
          ...(user.role === "provider"
            ? [
                {
                  provider: {
                    is: {
                      ownerUserId: user.id,
                    },
                  },
                },
              ]
            : []),
        ],
      },
      include: {
        disputes: true,
      },
    });

    if (!booking) {
      return apiError("Booking not found.", 404);
    }

    const dispute = await prisma.dispute.create({
      data: {
        bookingId: booking.id,
        companyId: booking.providerId,
        openedByUserId: user.id,
        reason: payload.reason,
        details: payload.details,
        status: "open",
      },
      include: {
        booking: {
          include: {
            listing: true,
            provider: true,
            payments: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        openedBy: true,
        assignedAdmin: true,
      },
    });

    return NextResponse.json({
      dispute: serializeDispute(dispute),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid dispute request",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Create dispute error:", error);
    return apiError("Unable to create dispute right now.", 500);
  }
}
