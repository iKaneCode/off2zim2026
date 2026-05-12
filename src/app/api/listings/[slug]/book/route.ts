import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import {
  sendBookingConfirmation,
  sendProviderNewBookingAlert,
} from "@/lib/platform-email";

export const dynamic = "force-dynamic";
const bookingRequestSchema = z.object({
  guests: z.coerce.number().int().positive().default(1),
  availabilityId: z.string().optional().nullable(),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  specialRequests: z.string().optional().nullable(),
});

function confirmationNumber() {
  return `OFF2ZIM-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { user } = await requireSessionUser();
    const payload = bookingRequestSchema.parse(await request.json());

    const listing = await prisma.providerListing.findUnique({
      where: { slug: params.slug },
      include: {
        company: true,
        availability: true,
      },
    });

    if (
      !listing ||
      listing.visibility !== "public" ||
      !["active", "approved"].includes(listing.status)
    ) {
      return apiError("Listing not found.", 404);
    }

    const selectedSlot = payload.availabilityId
      ? listing.availability.find((slot) => slot.id === payload.availabilityId)
      : null;

    if (listing.instantBooking && !selectedSlot) {
      return apiError("Choose an available slot before booking instantly.", 422);
    }

    if (selectedSlot) {
      if (selectedSlot.status !== "available") {
        return apiError("This slot is not available anymore.", 422);
      }

      if (
        selectedSlot.unitsAvailable !== null &&
        selectedSlot.unitsAvailable < payload.guests
      ) {
        return apiError("This slot does not have enough remaining capacity.", 422);
      }
    }

    const checkIn =
      selectedSlot?.startDate ?? (payload.checkIn ? new Date(payload.checkIn) : null);
    const checkOut =
      selectedSlot?.endDate ?? (payload.checkOut ? new Date(payload.checkOut) : null);

    const booking = await prisma.$transaction(async (tx) => {
      if (selectedSlot && listing.instantBooking && selectedSlot.unitsAvailable !== null) {
        const nextUnits = selectedSlot.unitsAvailable - payload.guests;
        const updatedSlot = await tx.listingAvailability.updateMany({
          where: {
            id: selectedSlot.id,
            listingId: listing.id,
            status: "available",
            unitsAvailable: { gte: payload.guests },
          },
          data: {
            unitsAvailable: { decrement: payload.guests },
          },
        });

        if (updatedSlot.count === 0) {
          throw new Error("SLOT_CAPACITY_UNAVAILABLE");
        }

        if (nextUnits <= 0) {
          await tx.listingAvailability.update({
            where: { id: selectedSlot.id },
            data: { status: "sold_out" },
          });
        }
      }

      return tx.booking.create({
        data: {
          userId: user.id,
          providerId: listing.companyId,
          listingId: listing.id,
          bookingType: listing.listingType.toUpperCase(),
          status: listing.instantBooking ? "CONFIRMED" : "REQUESTED",
          totalAmount: listing.basePrice || 0,
          currency: listing.currency,
          confirmationNumber: confirmationNumber(),
          checkIn,
          checkOut,
          guests: payload.guests,
          specialRequests: payload.specialRequests || null,
          metadata: JSON.stringify({
            listingTitle: listing.title,
            bookingMode: listing.bookingMode,
            providerCompanyId: listing.companyId,
            availabilityId: selectedSlot?.id ?? null,
            availabilityStatus: selectedSlot?.status ?? null,
          }),
        },
      });
    });

    // Fire-and-forget emails
    void sendBookingConfirmation({
      to: user.email,
      explorerName: user.name ?? user.email,
      confirmationNumber: booking.confirmationNumber,
      listingTitle: listing.title,
      providerName: listing.company.companyName,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      checkIn: checkIn?.toISOString() ?? null,
    }).catch(() => {});

    void (async () => {
      const providerOwner = await prisma.user.findUnique({
        where: { id: listing.company.ownerUserId },
        select: { email: true, name: true },
      });
      if (providerOwner?.email) {
        void sendProviderNewBookingAlert({
          to: providerOwner.email,
          providerName: listing.company.companyName,
          confirmationNumber: booking.confirmationNumber,
          listingTitle: listing.title,
          explorerName: user.name ?? user.email,
          guests: payload.guests,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          checkIn: checkIn?.toISOString() ?? null,
        }).catch(() => {});
      }
    })();

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        confirmationNumber: booking.confirmationNumber,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid booking request", 422);
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Please sign in to place a booking request.", 401);
    }

    if (error instanceof Error && error.message === "SLOT_CAPACITY_UNAVAILABLE") {
      return apiError("This slot no longer has enough remaining capacity.", 422);
    }

    console.error("Public booking request error:", error);
    return apiError("Unable to create booking right now.", 500);
  }
}
