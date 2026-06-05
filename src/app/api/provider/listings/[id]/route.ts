import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { serializeListing } from "@/lib/platform";
import { resolveListingDisplayId } from "@/lib/provider-listing-display-id";
import {
  buildDestinationMetadata,
  getListingDestinationMetadata,
  listingRequiresDestination,
  resolveListingDestination,
} from "@/lib/listing-destination-rules";

export const dynamic = "force-dynamic";
const updateListingSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  listingType: z.string().min(1).optional(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  pricingModel: z.string().optional(),
  basePrice: z.coerce.number().optional().nullable(),
  currency: z.string().optional(),
  instantBooking: z.boolean().optional(),
  bookingMode: z.string().optional(),
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
  capacity: z.coerce.number().int().optional().nullable(),
  pickupLeadTimeHours: z.coerce.number().int().optional().nullable(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  policies: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  availability: z
    .array(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        unitsAvailable: z.coerce.number().int().min(0).optional().nullable(),
        status: z.string().default("available"),
        notes: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

function validateAvailabilitySlots(
  availability: Array<{ startDate: string; endDate: string }> | undefined,
) {
  if (!availability) {
    return null;
  }

  for (const slot of availability) {
    const start = new Date(slot.startDate);
    const end = new Date(slot.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Availability slots must use valid start and end dates.";
    }

    if (end <= start) {
      return "Availability slot end dates must be after start dates.";
    }
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can edit listings.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, onboardingStatus: true },
    });

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    if (company.onboardingStatus !== "basic_approved") {
      return apiError(
        "Your company profile must be approved before editing listings.",
        403,
      );
    }

    const listing = await prisma.providerListing.findFirst({
      where: {
        id: resolvedParams.id,
        companyId: company.id,
      },
      select: { id: true, category: true, metadata: true, location: true },
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    const rawPayload = await request.json();
    const submittedFields =
      rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
        ? Object.keys(rawPayload as Record<string, unknown>)
        : [];
    const payload = updateListingSchema.parse(rawPayload);
    const availabilityError = validateAvailabilitySlots(payload.availability);

    if (availabilityError) {
      return apiError(availabilityError, 422);
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
    const nextMetadata = {
      ...existingMetadata,
      ...(payload.metadata ?? {}),
    };
    const submittedDestination = getListingDestinationMetadata(nextMetadata);
    const destination = resolveListingDestination(
      submittedDestination.destinationId,
    );
    const nextCategory = payload.category ?? listing.category;
    const requiresDestination = listingRequiresDestination(nextCategory);
    const nextStatus = payload.status ?? "pending_review";
    const nextVisibility = payload.visibility ?? "private";
    const isPublishing =
      ["active", "approved"].includes(nextStatus) ||
      nextVisibility === "public";

    if (isPublishing && requiresDestination && !destination) {
      return apiError(
        "Choose the destination this listing belongs to before publishing or saving.",
        422,
      );
    }

    const destinationMetadata = buildDestinationMetadata(destination);

    await prisma.providerListing.update({
      where: { id: listing.id },
      data: {
        title: payload.title,
        category: payload.category,
        listingType: payload.listingType,
        shortDescription: payload.shortDescription,
        description: payload.description,
        location: destination?.name ?? payload.location,
        pricingModel: payload.pricingModel,
        basePrice: payload.basePrice,
        currency: payload.currency,
        instantBooking: payload.instantBooking,
        bookingMode: payload.bookingMode,
        status: payload.status,
        visibility: payload.visibility,
        capacity: payload.capacity,
        pickupLeadTimeHours: payload.pickupLeadTimeHours,
        images: payload.images ? JSON.stringify(payload.images) : undefined,
        tags: payload.tags ? JSON.stringify(payload.tags) : undefined,
        amenities: payload.amenities
          ? JSON.stringify(payload.amenities)
          : undefined,
        policies: payload.policies
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
    });

    if (payload.availability) {
      await prisma.listingAvailability.deleteMany({
        where: { listingId: listing.id },
      });

      if (payload.availability.length > 0) {
        await prisma.listingAvailability.createMany({
          data: payload.availability.map((slot) => ({
            listingId: listing.id,
            startDate: new Date(slot.startDate),
            endDate: new Date(slot.endDate),
            unitsAvailable: slot.unitsAvailable ?? null,
            status: slot.status,
            notes: slot.notes || null,
          })),
        });
      }
    }

    const updatedListing = await prisma.providerListing.findUnique({
      where: { id: listing.id },
      include: {
        availability: true,
        bookings: true,
      },
    });

    if (!updatedListing) {
      return apiError("Listing not found.", 404);
    }

    const listingDisplayId = await resolveListingDisplayId(updatedListing.id);
    await createAuditLog({
      actorUserId: user.id,
      action: "provider_listing_updated",
      targetType: "provider_listing",
      targetId: updatedListing.id,
      companyId: company.id,
      summary: `${user.email} updated listing ${updatedListing.title}`,
      metadata: {
        targetDisplayId: listingDisplayId,
        listingDisplayId,
        internalListingId: updatedListing.id,
        updatedFields: submittedFields,
        title: updatedListing.title,
        category: updatedListing.category,
        status: updatedListing.status,
        visibility: updatedListing.visibility,
      },
    });

    return NextResponse.json({ listing: serializeListing(updatedListing) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid listing payload",
        422,
      );
    }

    console.error("Provider listing update error:", error);
    return apiError("Unable to update listing right now.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can delete listings.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const listing = await prisma.providerListing.findFirst({
      where: {
        id: resolvedParams.id,
        companyId: company.id,
      },
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

    await createAuditLog({
      actorUserId: user.id,
      action: "provider_listing_deleted",
      targetType: "provider_listing",
      targetId: listing.id,
      companyId: company.id,
      summary: `${user.email} deleted listing ${listing.title}`,
      metadata: {
        targetDisplayId: listingDisplayId,
        listingDisplayId,
        internalListingId: listing.id,
        title: listing.title,
        detachedBookingsCount: listing.bookings.length,
      },
    });

    return NextResponse.json({ archived: false, deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider listing delete error:", error);
    return apiError("Unable to delete listing right now.", 500);
  }
}
