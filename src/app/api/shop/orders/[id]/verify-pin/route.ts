import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const verifyPinSchema = z.object({
  pin: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, "PIN must be 6 digits"),
  orderItemId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    const payload = verifyPinSchema.parse(await request.json());

    // Verify the order exists
    const order = await prisma.shoppingOrder.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, status: true },
    });

    if (!order) return apiError("Order not found.", 404);

    // Resolve this user's provider company
    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!company) {
      return apiError("You must be a provider to verify pick-up PINs.", 403);
    }

    // Find the specific order item — must belong to this vendor company
    const orderItem = await prisma.shoppingOrderItem.findFirst({
      where: {
        id: payload.orderItemId,
        orderId: resolvedParams.id,
        deliveryMethod: "pickup",
        vendorCompanyId: company.id,
        status: { not: "collected" },
      },
      include: {
        product: {
          include: {
            listing: { select: { title: true } },
          },
        },
      },
    });

    if (!orderItem) {
      return apiError(
        "Order item not found or you are not authorised to verify it.",
        404,
      );
    }

    if (orderItem.pickupPin !== payload.pin) {
      return apiError("Incorrect PIN.", 400);
    }

    // Mark item as collected
    const updated = await prisma.shoppingOrderItem.update({
      where: { id: orderItem.id },
      data: { status: "collected" },
      select: { id: true, status: true },
    });

    // Check if all items in the order are now collected/fulfilled and update order status
    const remainingItems = await prisma.shoppingOrderItem.count({
      where: {
        orderId: resolvedParams.id,
        status: { notIn: ["collected", "delivered", "cancelled"] },
      },
    });

    if (remainingItems === 0) {
      await prisma.shoppingOrder.update({
        where: { id: resolvedParams.id },
        data: { status: "completed" },
      });
    }

    return NextResponse.json({
      success: true,
      itemId: updated.id,
      status: updated.status,
      productTitle: orderItem.product.listing.title,
      quantity: orderItem.quantity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid PIN data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("PIN verify error:", error);
    return apiError("Unable to verify PIN.", 500);
  }
}
