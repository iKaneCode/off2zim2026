import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/app/api/shop/products/route";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const resolvedParams = await params;
  try {
    const product = await prisma.shoppingProduct.findFirst({
      where: {
        isActive: true,
        listing: { slug: resolvedParams.slug, status: "active" },
      },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            description: true,
            category: true,
            location: true,
            basePrice: true,
            currency: true,
            images: true,
            tags: true,
            policies: true,
            company: {
              select: {
                id: true,
                companyName: true,
                tradingName: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return apiError("Product not found.", 404);
    }

    return NextResponse.json({ product: serializeProduct(product) });
  } catch (error) {
    console.error("Shop product detail error:", error);
    return apiError("Unable to load product.", 500);
  }
}
