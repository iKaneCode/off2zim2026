import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeCart } from "@/app/api/cart/route";

const patchSchema = z.object({
  quantity: z.number().int().positive().optional(),
  deliveryMethod: z.enum(["pickup", "shipping"]).optional(),
  pickupDate: z.string().datetime().optional().nullable(),
  shippingAddress: z
    .object({
      fullName: z.string(),
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      country: z.string().default("ZW"),
    })
    .optional()
    .nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    const payload = patchSchema.parse(await request.json());

    const item = await prisma.cartItem.findFirst({
      where: { id: resolvedParams.id, cart: { userId: user.id } },
      include: { product: { select: { offersShipping: true } } },
    });

    if (!item) return apiError("Cart item not found.", 404);

    if (payload.deliveryMethod === "shipping" && !item.product.offersShipping) {
      return apiError("This product does not offer shipping.", 400);
    }

    await prisma.cartItem.update({
      where: { id: resolvedParams.id },
      data: {
        ...(payload.quantity !== undefined
          ? { quantity: payload.quantity }
          : {}),
        ...(payload.deliveryMethod !== undefined
          ? { deliveryMethod: payload.deliveryMethod }
          : {}),
        ...(payload.pickupDate !== undefined
          ? {
              pickupDate: payload.pickupDate
                ? new Date(payload.pickupDate)
                : null,
            }
          : {}),
        ...(payload.shippingAddress !== undefined
          ? {
              shippingAddress: payload.shippingAddress
                ? JSON.stringify(payload.shippingAddress)
                : null,
            }
          : {}),
      },
    });

    const cart = await prisma.shoppingCart.findUniqueOrThrow({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                listing: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    basePrice: true,
                    currency: true,
                    images: true,
                    company: {
                      select: {
                        id: true,
                        companyName: true,
                        tradingName: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ cart: serializeCart(cart) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid update.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to update cart item.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();

    const item = await prisma.cartItem.findFirst({
      where: { id: resolvedParams.id, cart: { userId: user.id } },
    });

    if (!item) return apiError("Cart item not found.", 404);

    await prisma.cartItem.delete({ where: { id: resolvedParams.id } });

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
                    slug: true,
                    title: true,
                    basePrice: true,
                    currency: true,
                    images: true,
                    company: {
                      select: {
                        id: true,
                        companyName: true,
                        tradingName: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      cart: cart
        ? serializeCart(cart)
        : { id: null, items: [], subtotal: 0, shippingTotal: 0, total: 0 },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to remove cart item.", 500);
  }
}
