import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { serializeCompany } from "@/lib/platform";
import { ensureServiceProviderIds } from "@/lib/provider-company-ids";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view provider onboarding.", 403);
    }

    const companies = await prisma.providerCompany.findMany({
      include: {
        documents: true,
        verificationReviews: {
          include: {
            reviewedBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        listings: {
          include: {
            bookings: true,
          },
        },
        bookings: {
          include: {
            disputes: true,
            user: true,
            listing: true,
          },
        },
      },
      orderBy: [
        {
          reviewSubmittedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const companiesWithIds = await ensureServiceProviderIds(companies);

    return NextResponse.json({
      providers: companiesWithIds.map(serializeCompany),
    });
  } catch (error) {
    return apiError("Unauthorized", 401);
  }
}
