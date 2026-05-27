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
  title: z.string().min(1).optional(),
  shortDescription: z.string().optional().nullable(),
  location: z.string().min(1).optional(),
  listingType: z.string().min(1).optional(),
  pricingModel: z.string().min(1).optional(),
  basePrice: z.number().nonnegative().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  status: z
    .enum(["draft", "pending_review", "active", "paused", "archived"])
    .optional(),
  visibility: z.enum(["private", "public"]).optional(),
  category: z.string().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  policies: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(params);
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
    const destination = resolveListingDestination(
      submittedDestination.destinationId,
    );
    const nextCategory = payload.category ?? listing.category;

    if (listingRequiresDestination(nextCategory) && !destination) {
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
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(params);
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

    if (listing.bookings.length > 0) {
      await prisma.providerListing.update({
        where: { id: listing.id },
        data: {
          status: "archived",
          visibility: "private",
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminUserId: user.id,
          companyId: listing.companyId,
          action: "provider_listing_archived",
          targetType: "provider_listing",
          targetId: listing.id,
          summary:
            "Listing archived from admin console because it has bookings",
          metadata: JSON.stringify({ bookingsCount: listing.bookings.length }),
        },
      });

      return NextResponse.json({ archived: true, deleted: false });
    }

    await prisma.providerListing.delete({
      where: { id: listing.id },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        companyId: listing.companyId,
        action: "provider_listing_deleted",
        targetType: "provider_listing",
        targetId: listing.id,
        summary: "Listing deleted from admin console",
        metadata: JSON.stringify({ title: listing.title }),
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
