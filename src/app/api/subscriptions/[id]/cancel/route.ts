import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    if (!company) return apiError("Provider company not found.", 404);

    const sub = await prisma.subscription.findFirst({
      where: { id: resolvedParams.id, companyId: company.id, status: "active" },
    });

    if (!sub) return apiError("Active subscription not found.", 404);

    // If cancelling Verified Badge, also cancel Featured Placement
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
        },
      });

      if (sub.planType === "verified_badge") {
        // Cancel any active featured placement sub too
        await tx.subscription.updateMany({
          where: {
            companyId: company.id,
            planType: "featured_placement",
            status: "active",
          },
          data: { status: "cancelled", cancelledAt: new Date() },
        });

        // Remove flags — they stay valid until period end but flag is cleared now
        // (In production: keep flags until currentPeriodEnd, then a cron job clears them)
        await tx.providerCompany.update({
          where: { id: company.id },
          data: {
            isVerified: false,
            isFeaturedEligible: false,
            verificationTier: "basic",
            verifiedBadgeExpiresAt: null,
          },
        });
      } else if (sub.planType === "featured_placement") {
        await tx.providerCompany.update({
          where: { id: company.id },
          data: { isFeaturedEligible: false },
        });
      } else if (sub.planType === "premium_provider") {
        await tx.providerPlan.updateMany({
          where: {
            companyId: company.id,
            tier: "premium",
            status: "active",
          },
          data: {
            status: "cancelled",
            endsAt: new Date(),
          },
        });

        await tx.providerCompany.update({
          where: { id: company.id },
          data: {
            providerTier: "basic",
            tierStatus: "active",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      cancelledPlanType: sub.planType,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to cancel subscription.", 500);
  }
}
