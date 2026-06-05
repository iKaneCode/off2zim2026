import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const switchSchema = z.object({
  orderItemId: z.string().min(1),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    country: z.string().default("ZW"),
  }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    const payload = switchSchema.parse(await request.json());

    // Verify the order belongs to the requesting user and is still in a switchable state
    const order = await prisma.shoppingOrder.findFirst({
      where: {
        id: resolvedParams.id,
        userId: user.id,
        status: { in: ["confirmed", "pending"] },
      },
      select: { id: true, status: true },
    });

    if (!order) {
      return apiError("Order not found or cannot be modified.", 404);
    }

    // Find the order item — must be a pickup item that hasn't been collected
    const orderItem = await prisma.shoppingOrderItem.findFirst({
      where: {
        id: payload.orderItemId,
        orderId: resolvedParams.id,
        deliveryMethod: "pickup",
        status: { notIn: ["collected", "cancelled"] },
      },
      select: {
        id: true,
        productId: true,
        status: true,
        product: {
          select: {
            offersShipping: true,
            shippingFee: true,
          },
        },
      },
    });

    if (!orderItem) {
      return apiError(
        "Order item not found or is not eligible for delivery switch.",
        404,
      );
    }

    if (!orderItem.product.offersShipping) {
      return apiError("This product does not offer shipping.", 400);
    }

    const shippingFee = orderItem.product.shippingFee ?? 0;

    // Update item delivery method, clear pickup-specific fields
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.shoppingOrderItem.update({
        where: { id: orderItem.id },
        data: {
          deliveryMethod: "shipping",
          shippingAddress: JSON.stringify(payload.shippingAddress),
          shippingFee,
          pickupDate: null,
          pickupPin: null,
        },
      });

      // Recalculate the order shipping total
      const allItems = await tx.shoppingOrderItem.findMany({
        where: { orderId: resolvedParams.id, status: { not: "cancelled" } },
        select: { shippingFee: true, unitPrice: true, quantity: true },
      });

      const shippingTotal = parseFloat(
        allItems.reduce((sum, i) => sum + i.shippingFee, 0).toFixed(2),
      );
      const subtotal = parseFloat(
        allItems
          .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
          .toFixed(2),
      );

      await tx.shoppingOrder.update({
        where: { id: resolvedParams.id },
        data: {
          shippingTotal,
          totalAmount: subtotal + shippingTotal,
        },
      });

      return item;
    });

    return NextResponse.json({
      success: true,
      itemId: updated.id,
      deliveryMethod: updated.deliveryMethod,
      shippingFee: updated.shippingFee,
      shippingAddress: payload.shippingAddress,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid request data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Switch to shipping error:", error);
    return apiError("Unable to switch delivery method.", 500);
  }
}
