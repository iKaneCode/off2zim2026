import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAdminListing } from "@/lib/platform";

export const dynamic = "force-dynamic";

const listingCreateSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  listingType: z.string().optional().default(""),
  location: z.string().optional().default(""),
  pricingModel: z.string().optional().default(""),
  serviceCategory: z.string().min(1).optional(),
  basePrice: z.number().nonnegative().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  amenities: z.array(z.string()).optional(),
  policies: z.record(z.unknown()).optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(title: string) {
  const slugBase = slugify(title) || "listing";
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

  return slug;
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ companyId: string }> | { companyId: string } },
) {
  try {
    const { companyId } = await Promise.resolve(params);
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can create provider listings.", 403);
    }

    const payload = listingCreateSchema.parse(await request.json());
    const company = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      select: { id: true, companyName: true },
    });

    if (!company) {
      return apiError("Service provider not found.", 404);
    }

    const listing = await prisma.providerListing.create({
      data: {
        companyId,
        title: payload.title,
        slug: await uniqueSlug(payload.title),
        category: payload.category,
        listingType: payload.listingType.trim(),
        shortDescription: null,
        description:
          "Complete this listing with descriptions, pricing, images, policies, and availability before publishing.",
        location: payload.location.trim(),
        pricingModel: payload.pricingModel.trim(),
        basePrice: payload.basePrice ?? null,
        currency: "USD",
        capacity: payload.capacity ?? null,
        status: "draft",
        visibility: "private",
        images: "[]",
        tags: "[]",
        amenities: JSON.stringify(payload.amenities ?? []),
        policies: JSON.stringify(payload.policies ?? {}),
        metadata: JSON.stringify({
          source: "admin_service_provider_detail",
          serviceCategory: payload.serviceCategory || null,
        }),
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
        companyId,
        action: "provider_listing_created",
        targetType: "provider_listing",
        targetId: listing.id,
        summary: `Listing created for ${company.companyName}`,
        metadata: JSON.stringify({
          title: payload.title,
          category: payload.category,
          location: payload.location,
        }),
      },
    });

    return NextResponse.json(
      { listing: serializeAdminListing(listing) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid listing payload.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin provider listing create error:", error);
    return apiError("Unable to create provider listing right now.", 500);
  }
}
