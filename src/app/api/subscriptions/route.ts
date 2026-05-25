import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Subscription pricing (USD)
export const SUBSCRIPTION_PLANS = {
  premium_provider: { monthly: 79, annual: 799 },
  verified_badge: { monthly: 29, annual: 299 },
  featured_placement: { monthly: 49, annual: 499 },
} as const;

const subscribeSchema = z.object({
  planType: z.enum([
    "premium_provider",
    "verified_badge",
    "featured_placement",
  ]),
  billingCycle: z.enum(["monthly", "annual"]),
  // In production, this would be a Stripe payment method ID or Paynow reference
  paymentReference: z.string().optional(),
});

async function findCompany(userId: string) {
  return prisma.providerCompany.findUnique({
    where: { ownerUserId: userId },
    select: {
      id: true,
      isVerified: true,
      isFeaturedEligible: true,
      onboardingStatus: true,
      providerTier: true,
      tierStatus: true,
    },
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    const subscriptions = await prisma.subscription.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        planType: s.planType,
        billingCycle: s.billingCycle,
        status: s.status,
        currentPeriodStart: s.currentPeriodStart.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        cancelledAt: s.cancelledAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      plans: SUBSCRIPTION_PLANS,
      company: {
        isVerified: company.isVerified,
        isFeaturedEligible: company.isFeaturedEligible,
        providerTier: company.providerTier,
        tierStatus: company.tierStatus,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to load subscriptions.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    // Provider must have basic approval to subscribe
    if (
      company.onboardingStatus !== "basic_approved" &&
      company.onboardingStatus !== "verified"
    ) {
      return apiError(
        "Your company profile must be approved before subscribing.",
        403,
      );
    }

    const payload = subscribeSchema.parse(await request.json());

    // Featured placement requires an active Verified Badge subscription
    if (payload.planType === "featured_placement") {
      const hasVerified = await prisma.subscription.findFirst({
        where: {
          companyId: company.id,
          planType: "verified_badge",
          status: "active",
          currentPeriodEnd: { gte: new Date() },
        },
      });
      if (!hasVerified) {
        return apiError(
          "A Verified Badge subscription is required before subscribing to Featured Placement.",
          403,
        );
      }
    }

    // Check for existing active subscription of same type
    const existing = await prisma.subscription.findFirst({
      where: {
        companyId: company.id,
        planType: payload.planType,
        status: "active",
        currentPeriodEnd: { gte: new Date() },
      },
    });

    if (existing) {
      return apiError(
        `You already have an active ${payload.planType.replace("_", " ")} subscription.`,
        409,
      );
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (payload.billingCycle === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          companyId: company.id,
          planType: payload.planType,
          billingCycle: payload.billingCycle,
          status: "active",
          externalRef: payload.paymentReference ?? null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // Update company flags based on plan type
      if (payload.planType === "premium_provider") {
        await tx.providerCompany.update({
          where: { id: company.id },
          data: {
            providerTier: "premium",
            tierStatus: "active",
          },
        });

        await tx.providerPlan.create({
          data: {
            companyId: company.id,
            tier: "premium",
            status: "active",
            billingCycle: payload.billingCycle,
            externalRef: payload.paymentReference ?? null,
            startsAt: now,
            endsAt: periodEnd,
            features: JSON.stringify({
              galleryManagement: true,
              pushCampaigns: true,
              advancedAnalytics: true,
              premiumAndroidApp: true,
            }),
          },
        });
      } else if (payload.planType === "verified_badge") {
        await tx.providerCompany.update({
          where: { id: company.id },
          data: {
            isVerified: true,
            verificationTier: "verified",
            verifiedBadgeExpiresAt: periodEnd,
          },
        });
      } else if (payload.planType === "featured_placement") {
        await tx.providerCompany.update({
          where: { id: company.id },
          data: { isFeaturedEligible: true },
        });
      }

      return sub;
    });

    return NextResponse.json(
      {
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          billingCycle: subscription.billingCycle,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message ?? "Invalid subscription data.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Subscribe error:", error);
    return apiError("Unable to create subscription.", 500);
  }
}
