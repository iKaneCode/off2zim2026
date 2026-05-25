import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getProviderTierFeatures, toJsonRecord } from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

const tierSchema = z.object({
  providerTier: z.enum(["basic", "premium"]),
  tierStatus: z
    .enum(["active", "trialing", "paused", "past_due", "cancelled"])
    .default("active"),
  billingCycle: z.enum(["monthly", "annual"]).optional().nullable(),
  externalRef: z.string().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { companyId: string } },
) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can update provider tiers.", 403);
    }

    const payload = tierSchema.parse(await request.json());
    const company = await prisma.providerCompany.findUnique({
      where: { id: params.companyId },
      select: {
        id: true,
        companyName: true,
        providerTier: true,
        tierStatus: true,
      },
    });

    if (!company) {
      return apiError("Provider company not found.", 404);
    }

    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;
    if (payload.endsAt && Number.isNaN(endsAt?.getTime())) {
      return apiError("endsAt must be a valid date.", 422);
    }

    const updatedCompany = await prisma.$transaction(async (tx) => {
      const updated = await tx.providerCompany.update({
        where: { id: company.id },
        data: {
          providerTier: payload.providerTier,
          tierStatus: payload.tierStatus,
        },
      });

      if (payload.providerTier === "premium") {
        await tx.providerPlan.create({
          data: {
            companyId: company.id,
            tier: "premium",
            status: payload.tierStatus,
            billingCycle: payload.billingCycle || null,
            externalRef: payload.externalRef || null,
            startsAt: new Date(),
            endsAt,
            features: toJsonRecord({
              galleryManagement: true,
              pushCampaigns: true,
              advancedAnalytics: true,
              premiumAndroidApp: true,
            }),
          },
        });
      } else {
        await tx.providerPlan.updateMany({
          where: {
            companyId: company.id,
            tier: "premium",
            status: { in: ["active", "trialing", "past_due", "paused"] },
          },
          data: {
            status: "cancelled",
            endsAt: new Date(),
          },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: user.id,
          companyId: company.id,
          action: "provider_tier_updated",
          targetType: "provider_company",
          targetId: company.id,
          summary: `${company.companyName} moved to ${payload.providerTier}`,
          metadata: JSON.stringify({
            previousTier: company.providerTier,
            previousTierStatus: company.tierStatus,
            nextTier: payload.providerTier,
            nextTierStatus: payload.tierStatus,
          }),
        },
      });

      return updated;
    });

    return NextResponse.json({
      company: {
        id: updatedCompany.id,
        providerTier: updatedCompany.providerTier,
        tierStatus: updatedCompany.tierStatus,
        tierFeatures: getProviderTierFeatures(updatedCompany),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid tier update.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin provider tier update error:", error);
    return apiError("Unable to update provider tier right now.", 500);
  }
}
