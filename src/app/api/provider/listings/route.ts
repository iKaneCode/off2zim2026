import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { serializeListing } from "@/lib/platform";
import {
  buildDestinationMetadata,
  getListingDestinationMetadata,
  listingRequiresDestination,
  resolveListingDestination,
} from "@/lib/listing-destination-rules";

export const dynamic = "force-dynamic";
const listingSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  listingType: z.string().min(1),
  shortDescription: z.string().optional().nullable(),
  description: z.string().min(1),
  location: z.string().min(1),
  pricingModel: z.string().default("per_service"),
  basePrice: z.coerce.number().optional().nullable(),
  currency: z.string().default("USD"),
  instantBooking: z.boolean().default(false),
  bookingMode: z.string().default("request"),
  status: z
    .enum(["draft", "pending_review", "active", "paused", "archived"])
    .default("draft"),
  visibility: z.enum(["private", "public"]).default("private"),
  capacity: z.coerce.number().int().optional().nullable(),
  pickupLeadTimeHours: z.coerce.number().int().optional().nullable(),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  policies: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
  availability: z
    .array(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        unitsAvailable: z.coerce.number().int().min(0).optional().nullable(),
        status: z.string().default("available"),
        notes: z.string().optional().nullable(),
      })
    )
    .default([]),
});

function validateAvailabilitySlots(
  availability: Array<{ startDate: string; endDate: string }>
) {
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function findCompany(userId: string) {
  return prisma.providerCompany.findUnique({
    where: { ownerUserId: userId },
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can view listing management.", 403);
    }

    const company = await findCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const listings = await prisma.providerListing.findMany({
      where: { companyId: company.id },
      include: {
        availability: true,
        bookings: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      listings: listings.map(serializeListing),
    });
  } catch (error) {
    return apiError("Unauthorized", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can create listings.", 403);
    }

    const company = await findCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const payload = listingSchema.parse(await request.json());
    const availabilityError = validateAvailabilitySlots(payload.availability);

    if (availabilityError) {
      return apiError(availabilityError, 422);
    }
    const submittedDestination = getListingDestinationMetadata(payload.metadata);
    const destination = resolveListingDestination(submittedDestination.destinationId);
    const requiresDestination = listingRequiresDestination(payload.category);

    if (requiresDestination && !destination) {
      return apiError(
        "Choose the destination this listing belongs to before saving.",
        422
      );
    }

    const destinationMetadata = buildDestinationMetadata(destination);
    const slugBase = slugify(payload.title) || "listing";

    let slug = slugBase;
    let suffix = 1;
    while (
      await prisma.providerListing.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      suffix += 1;
      slug = `${slugBase}-${suffix}`;
    }

    const listing = await prisma.providerListing.create({
      data: {
        companyId: company.id,
        title: payload.title,
        slug,
        category: payload.category,
        listingType: payload.listingType,
        shortDescription: payload.shortDescription || null,
        description: payload.description,
        location: destination?.name ?? payload.location,
        pricingModel: payload.pricingModel,
        basePrice: payload.basePrice ?? null,
        currency: payload.currency,
        instantBooking: payload.instantBooking,
        bookingMode: payload.bookingMode,
        status: payload.status,
        visibility: payload.visibility,
        capacity: payload.capacity ?? null,
        pickupLeadTimeHours: payload.pickupLeadTimeHours ?? null,
        images: JSON.stringify(payload.images),
        tags: JSON.stringify(payload.tags),
        amenities: JSON.stringify(payload.amenities),
        policies: JSON.stringify(payload.policies),
        metadata: JSON.stringify({
          ...payload.metadata,
          ...destinationMetadata,
        }),
        availability: {
          create: payload.availability.map((slot) => ({
            startDate: new Date(slot.startDate),
            endDate: new Date(slot.endDate),
            unitsAvailable: slot.unitsAvailable ?? null,
            status: slot.status,
            notes: slot.notes || null,
          })),
        },
      },
      include: {
        availability: true,
        bookings: true,
      },
    });

    return NextResponse.json({ listing: serializeListing(listing) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid listing payload", 422);
    }

    console.error("Provider listing create error:", error);
    return apiError("Unable to create listing right now.", 500);
  }
}
