import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  stockQuantity: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  offersShipping: z.boolean().optional(),
  shippingFee: z.coerce.number().min(0).optional().nullable(),
  pickupLeadTimeHours: z.number().int().min(0).optional(),
  deliveryEstimateDays: z.number().int().min(1).optional().nullable(),
  operatingHours: z.string().optional().nullable(),
  variants: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        priceAdjustment: z.coerce.number().default(0),
        stockQuantity: z.number().int().min(0).default(0),
      }),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findProviderCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    const payload = updateSchema.parse(await request.json());

    // Verify product belongs to this provider's company
    const product = await prisma.shoppingProduct.findFirst({
      where: {
        id: resolvedParams.id,
        listing: { companyId: company.id },
      },
      select: { id: true },
    });

    if (!product) return apiError("Product not found.", 404);

    const updated = await prisma.shoppingProduct.update({
      where: { id: resolvedParams.id },
      data: {
        ...(payload.stockQuantity !== undefined
          ? { stockQuantity: payload.stockQuantity }
          : {}),
        ...(payload.isActive !== undefined
          ? { isActive: payload.isActive }
          : {}),
        ...(payload.offersShipping !== undefined
          ? { offersShipping: payload.offersShipping }
          : {}),
        ...(payload.shippingFee !== undefined
          ? { shippingFee: payload.shippingFee }
          : {}),
        ...(payload.pickupLeadTimeHours !== undefined
          ? { pickupLeadTimeHours: payload.pickupLeadTimeHours }
          : {}),
        ...(payload.deliveryEstimateDays !== undefined
          ? { deliveryEstimateDays: payload.deliveryEstimateDays }
          : {}),
        ...(payload.operatingHours !== undefined
          ? { operatingHours: payload.operatingHours ?? "{}" }
          : {}),
        ...(payload.variants !== undefined
          ? {
              variants:
                payload.variants != null
                  ? JSON.stringify(payload.variants)
                  : undefined,
            }
          : {}),
      },
      select: {
        id: true,
        stockQuantity: true,
        isActive: true,
        offersShipping: true,
        shippingFee: true,
        pickupLeadTimeHours: true,
        deliveryEstimateDays: true,
        operatingHours: true,
        variants: true,
      },
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid product data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to update product.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findProviderCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    const product = await prisma.shoppingProduct.findFirst({
      where: {
        id: resolvedParams.id,
        listing: { companyId: company.id },
      },
      select: { id: true },
    });

    if (!product) return apiError("Product not found.", 404);

    // Soft-delete: deactivate rather than destroy (preserves order history)
    await prisma.shoppingProduct.update({
      where: { id: resolvedParams.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to delete product.", 500);
  }
}
