import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  listingId: z.string().min(1),
  stockQuantity: z.number().int().min(0).default(0),
  offersShipping: z.boolean().default(false),
  shippingFee: z.coerce.number().min(0).optional().nullable(),
  pickupLeadTimeHours: z.number().int().min(0).default(24),
  deliveryEstimateDays: z.number().int().min(1).optional().nullable(),
  operatingHours: z.string().optional().nullable(),
  variants: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        priceAdjustment: z.coerce.number().default(0),
        stockQuantity: z.number().int().min(0).default(0),
      })
    )
    .optional()
    .nullable(),
});

async function findProviderCompany(userId: string) {
  return prisma.providerCompany.findUnique({
    where: { ownerUserId: userId },
    select: { id: true },
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findProviderCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    const products = await prisma.shoppingProduct.findMany({
      where: { listing: { companyId: company.id } },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            basePrice: true,
            currency: true,
            images: true,
            status: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        listingId: p.listingId,
        slug: p.listing.slug,
        title: p.listing.title,
        price: p.listing.basePrice,
        currency: p.listing.currency,
        images: safeJsonParse<string[]>(p.listing.images, []),
        status: p.listing.status,
        stockQuantity: p.stockQuantity,
        isActive: p.isActive,
        offersShipping: p.offersShipping,
        shippingFee: p.shippingFee,
        pickupLeadTimeHours: p.pickupLeadTimeHours,
        deliveryEstimateDays: p.deliveryEstimateDays,
        operatingHours: p.operatingHours,
        variants: safeJsonParse(p.variants, null),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to load products.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findProviderCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    const payload = createProductSchema.parse(await request.json());

    // Verify the listing belongs to this provider
    const listing = await prisma.providerListing.findFirst({
      where: { id: payload.listingId, companyId: company.id },
      select: { id: true },
    });

    if (!listing) return apiError("Listing not found.", 404);

    // Check no product already exists for this listing
    const existing = await prisma.shoppingProduct.findUnique({
      where: { listingId: payload.listingId },
      select: { id: true },
    });

    if (existing) {
      return apiError("A product already exists for this listing.", 409);
    }

    const product = await prisma.shoppingProduct.create({
      data: {
        listingId: payload.listingId,
        stockQuantity: payload.stockQuantity,
        offersShipping: payload.offersShipping,
        shippingFee: payload.shippingFee ?? null,
        pickupLeadTimeHours: payload.pickupLeadTimeHours,
        deliveryEstimateDays: payload.deliveryEstimateDays ?? null,
        operatingHours: payload.operatingHours ?? "{}",
        ...(payload.variants != null ? { variants: JSON.stringify(payload.variants) } : {}),
        isActive: true,
      },
    });

    return NextResponse.json({ productId: product.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid product data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Create product error:", error);
    return apiError("Unable to create product.", 500);
  }
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
