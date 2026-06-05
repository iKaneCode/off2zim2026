import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordCommission } from "@/lib/commission";
import { rateLimit, rateLimitResponse, PAYMENT_LIMIT } from "@/lib/rate-limit";
import crypto from "crypto";

const checkoutSchema = z.object({
  // Optional override of delivery method per item;
  // if not provided, whatever is already on the cart item is used.
  itemOverrides: z
    .array(
      z.object({
        cartItemId: z.string(),
        deliveryMethod: z.enum(["pickup", "shipping"]),
        pickupDate: z.string().datetime().optional(),
        shippingAddress: z
          .object({
            fullName: z.string(),
            line1: z.string(),
            line2: z.string().optional(),
            city: z.string(),
            country: z.string().default("ZW"),
          })
          .optional(),
      })
    )
    .optional(),
});

function generatePickupPin(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, "checkout", PAYMENT_LIMIT);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const { user } = await requireSessionUser();
    const payload = checkoutSchema.parse(await request.json());

    const cart = await prisma.shoppingCart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                listing: {
                  select: {
                    id: true,
                    basePrice: true,
                    currency: true,
                    category: true,
                    companyId: true,
                    company: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return apiError("Your cart is empty.", 400);
    }

    // Apply any delivery-method overrides
    const overrideMap = new Map(
      (payload.itemOverrides ?? []).map((o) => [o.cartItemId, o])
    );

    // Validate stock for all items first
    for (const item of cart.items) {
      if (item.product.stockQuantity < item.quantity) {
        return apiError(
          `"${item.product.listing.id}" only has ${item.product.stockQuantity} units left.`,
          400
        );
      }
      const override = overrideMap.get(item.id);
      const method = override?.deliveryMethod ?? item.deliveryMethod;
      if (method === "shipping" && !item.product.offersShipping) {
        return apiError("One or more items do not offer shipping.", 400);
      }
    }

    // Build order items
    let totalAmount = 0;
    let shippingTotal = 0;

    type OrderItemInput = {
      productId: string;
      vendorCompanyId: string;
      quantity: number;
      unitPrice: number;
      variantKey: string | null;
      deliveryMethod: string;
      pickupDate: Date | null;
      shippingAddress: string | null;
      shippingFee: number;
      pickupPin: string | null;
      category: string | null;
    };

    const orderItems: OrderItemInput[] = cart.items.map((item) => {
      const override = overrideMap.get(item.id);
      const method = override?.deliveryMethod ?? item.deliveryMethod;
      const shippingFee = method === "shipping" ? (item.product.shippingFee ?? 0) : 0;
      const unitPrice = item.product.listing.basePrice ?? 0;
      const lineTotal = unitPrice * item.quantity;
      const pickupPin = method === "pickup" ? generatePickupPin() : null;

      totalAmount += lineTotal;
      shippingTotal += shippingFee;

      const shippingAddr =
        method === "shipping"
          ? override?.shippingAddress
            ? JSON.stringify(override.shippingAddress)
            : item.shippingAddress
          : null;

      return {
        productId: item.productId,
        vendorCompanyId: item.product.listing.companyId,
        quantity: item.quantity,
        unitPrice,
        variantKey: item.variantKey,
        deliveryMethod: method,
        pickupDate:
          method === "pickup"
            ? override?.pickupDate
              ? new Date(override.pickupDate)
              : item.pickupDate
            : null,
        shippingAddress: shippingAddr ?? null,
        shippingFee,
        pickupPin,
        category: item.product.listing.category ?? null,
      };
    });

    totalAmount = parseFloat(totalAmount.toFixed(2));
    shippingTotal = parseFloat(shippingTotal.toFixed(2));

    // Create order + items in a transaction; decrement stock
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.shoppingOrder.create({
        data: {
          userId: user.id,
          status: "confirmed",
          totalAmount: totalAmount + shippingTotal,
          shippingTotal,
          currency: cart.items[0]?.product.listing.currency ?? "USD",
          items: {
            create: orderItems.map((oi) => ({
              productId: oi.productId,
              vendorCompanyId: oi.vendorCompanyId,
              quantity: oi.quantity,
              unitPrice: oi.unitPrice,
              variantKey: oi.variantKey,
              deliveryMethod: oi.deliveryMethod,
              pickupDate: oi.pickupDate,
              shippingAddress: oi.shippingAddress,
              shippingFee: oi.shippingFee,
              status: "confirmed",
              pickupPin: oi.pickupPin,
            })),
          },
        },
        include: { items: true },
      });

      // Decrement stock
      for (const oi of orderItems) {
        await tx.shoppingProduct.update({
          where: { id: oi.productId },
          data: { stockQuantity: { decrement: oi.quantity } },
        });
      }

      // Record platform commission per vendor-category bucket so rates are applied correctly.
      // Group order items by (vendorCompanyId + category) and record a commission row for each.
      type Bucket = { grossAmount: number; category: string | null; currency: string };
      const buckets = new Map<string, Bucket>();
      for (const oi of orderItems) {
        const category = oi.category ?? null;
        const key = `${oi.vendorCompanyId}::${category ?? ""}`;
        const existing = buckets.get(key);
        const lineTotal = oi.unitPrice * oi.quantity;
        if (existing) {
          existing.grossAmount = parseFloat((existing.grossAmount + lineTotal).toFixed(2));
        } else {
          buckets.set(key, { grossAmount: lineTotal, category, currency: newOrder.currency });
        }
      }
      for (const bucket of buckets.values()) {
        await recordCommission(tx, {
          transactionType: "shop_order",
          transactionId: newOrder.id,
          grossAmount: bucket.grossAmount,
          currency: bucket.currency,
          category: bucket.category,
        });
      }

      // Clear the cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        shippingTotal: order.shippingTotal,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          deliveryMethod: item.deliveryMethod,
          pickupDate: item.pickupDate?.toISOString() ?? null,
          shippingFee: item.shippingFee,
          status: item.status,
          // Only expose PIN to the buyer
          pickupPin: item.deliveryMethod === "pickup" ? item.pickupPin : null,
        })),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid checkout data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Checkout error:", error);
    return apiError("Unable to place order.", 500);
  }
}
