import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAdminListing } from "@/lib/platform";
import { resolveListingDisplayId } from "@/lib/provider-listing-display-id";
import {
  buildDestinationMetadata,
  getListingDestinationMetadata,
  listingRequiresDestination,
  resolveListingDestination,
  resolveListingDestinationByName,
} from "@/lib/listing-destination-rules";

const updateListingSchema = z.object({
  title: z.string().min(1).optional(),
  shortDescription: z.string().optional().nullable(),
  location: z.string().min(1).optional(),
  listingType: z.string().min(1).optional(),
  pricingModel: z.string().min(1).optional(),
  basePrice: z.number().nonnegative().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  bookingMode: z.string().min(1).optional(),
  instantBooking: z.boolean().optional(),
  status: z
    .enum([
      "draft",
      "pending_review",
      "active",
      "paused",
      "archived",
      "rejected",
    ])
    .optional(),
  visibility: z.enum(["private", "public"]).optional(),
  category: z.string().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  policies: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can update platform listings.", 403);
    }

    const payload = updateListingSchema.parse(await request.json());

    const listing = await prisma.providerListing.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        status: true,
        visibility: true,
        category: true,
        location: true,
        metadata: true,
      },
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    const existingMetadata = (() => {
      try {
        return listing.metadata
          ? (JSON.parse(listing.metadata) as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    })();
    const nextMetadata = { ...existingMetadata, ...(payload.metadata ?? {}) };
    const submittedDestination = getListingDestinationMetadata(nextMetadata);
    const destination =
      resolveListingDestination(submittedDestination.destinationId) ||
      [
        submittedDestination.destinationName,
        submittedDestination.destinationLocation,
        payload.location,
        listing.location,
      ].reduce(
        (matchedDestination, candidate) =>
          matchedDestination || resolveListingDestinationByName(candidate),
        null as ReturnType<typeof resolveListingDestinationByName>,
      );
    const nextCategory = payload.category ?? listing.category;
    const nextStatus = payload.status ?? listing.status;
    const nextVisibility = payload.visibility ?? listing.visibility;
    const isPublishing =
      ["active", "approved"].includes(nextStatus) ||
      nextVisibility === "public";

    if (
      isPublishing &&
      listingRequiresDestination(nextCategory) &&
      !destination
    ) {
      return apiError(
        "Assign a destination before publishing this destination-scoped listing.",
        422,
      );
    }

    const destinationMetadata = buildDestinationMetadata(destination);

    const updated = await prisma.providerListing.update({
      where: { id: listing.id },
      data: {
        title: payload.title,
        shortDescription: payload.shortDescription,
        listingType: payload.listingType,
        pricingModel: payload.pricingModel,
        basePrice: payload.basePrice,
        capacity: payload.capacity,
        bookingMode: payload.bookingMode,
        instantBooking: payload.instantBooking,
        status: payload.status,
        visibility: payload.visibility,
        category: payload.category,
        location: destination?.name ?? payload.location,
        amenities:
          payload.amenities !== undefined
            ? JSON.stringify(payload.amenities)
            : undefined,
        policies:
          payload.policies !== undefined
            ? JSON.stringify(payload.policies)
            : undefined,
        metadata:
          payload.metadata || destination
            ? JSON.stringify({
                ...nextMetadata,
                ...destinationMetadata,
              })
            : undefined,
      },
      include: {
        company: true,
        availability: true,
        bookings: {
          include: {
            disputes: true,
          },
        },
      },
    });

    const listingDisplayId = await resolveListingDisplayId(updated.id);
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        companyId: listing.companyId,
        action: "listing_updated",
        targetType: "provider_listing",
        targetId: updated.id,
        summary: `Listing updated from admin console`,
        metadata: JSON.stringify({
          previousStatus: listing.status,
          targetDisplayId: listingDisplayId,
          listingDisplayId,
          internalListingId: updated.id,
          nextStatus: payload.status ?? listing.status,
          previousVisibility: listing.visibility,
          nextVisibility: payload.visibility ?? listing.visibility,
          previousCategory: listing.category,
          nextCategory: payload.category ?? listing.category,
          previousDestinationId:
            getListingDestinationMetadata(existingMetadata).destinationId ??
            null,
          nextDestinationId:
            destination?.id ??
            getListingDestinationMetadata(existingMetadata).destinationId ??
            null,
        }),
      },
    });

    return NextResponse.json({
      listing: serializeAdminListing(updated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid listing update",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin listing update error:", error);
    return apiError("Unable to update listing right now.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can delete platform listings.", 403);
    }

    const listing = await prisma.providerListing.findUnique({
      where: { id },
      include: {
        bookings: {
          select: { id: true },
        },
      },
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    const listingDisplayId = await resolveListingDisplayId(listing.id);
    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { listingId: listing.id },
        data: { listingId: null },
      }),
      prisma.providerListing.delete({
        where: { id: listing.id },
      }),
    ]);

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        companyId: listing.companyId,
        action: "provider_listing_deleted",
        targetType: "provider_listing",
        targetId: listing.id,
        summary: "Listing deleted from admin console",
        metadata: JSON.stringify({
          targetDisplayId: listingDisplayId,
          listingDisplayId,
          internalListingId: listing.id,
          title: listing.title,
          detachedBookingsCount: listing.bookings.length,
        }),
      },
    });

    return NextResponse.json({ archived: false, deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin listing delete error:", error);
    return apiError("Unable to delete listing right now.", 500);
  }
}
