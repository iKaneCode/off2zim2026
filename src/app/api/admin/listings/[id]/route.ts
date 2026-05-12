import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAdminListing } from "@/lib/platform";
import {
  buildDestinationMetadata,
  getListingDestinationMetadata,
  listingRequiresDestination,
  resolveListingDestination,
} from "@/lib/listing-destination-rules";

const updateListingSchema = z.object({
  status: z
    .enum(["draft", "pending_review", "active", "paused", "archived"])
    .optional(),
  visibility: z.enum(["private", "public"]).optional(),
  category: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can update platform listings.", 403);
    }

    const payload = updateListingSchema.parse(await request.json());

    const listing = await prisma.providerListing.findUnique({
      where: { id: params.id },
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
    const destination = resolveListingDestination(submittedDestination.destinationId);
    const nextCategory = payload.category ?? listing.category;

    if (listingRequiresDestination(nextCategory) && !destination) {
      return apiError(
        "Assign a destination before publishing this destination-scoped listing.",
        422
      );
    }

    const destinationMetadata = buildDestinationMetadata(destination);

    const updated = await prisma.providerListing.update({
      where: { id: listing.id },
      data: {
        status: payload.status,
        visibility: payload.visibility,
        category: payload.category,
        location: destination?.name ?? undefined,
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
          nextStatus: payload.status ?? listing.status,
          previousVisibility: listing.visibility,
          nextVisibility: payload.visibility ?? listing.visibility,
          previousCategory: listing.category,
          nextCategory: payload.category ?? listing.category,
          previousDestinationId:
            getListingDestinationMetadata(existingMetadata).destinationId ?? null,
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
      return apiError(error.issues[0]?.message || "Invalid listing update", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin listing update error:", error);
    return apiError("Unable to update listing right now.", 500);
  }
}
