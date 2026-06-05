import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeCompany } from "@/lib/platform";
import { toJsonRecord } from "@/lib/provider-platform";
import {
  mergeProviderProfileMeta,
  readProviderProfileMeta,
} from "@/lib/provider-profile-meta";

export const dynamic = "force-dynamic";

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

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
  {
    params,
  }: {
    params: Promise<{ companyId: string }>;
  },
) {
  try {
    const { companyId } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can update provider tiers.", 403);
    }

    const payload = tierSchema.parse(await request.json());
    const company = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        companyName: true,
        providerTier: true,
        tierStatus: true,
        socialMediaLinks: true,
      },
    });

    if (!company) {
      return apiError("Provider company not found.", 404);
    }

    const pendingRequest = await prisma.providerTierChangeRequest.findFirst({
      where: {
        companyId: company.id,
        status: "pending",
      },
      orderBy: {
        requestedAt: "desc",
      },
    });
    const requestApproved =
      pendingRequest?.toTier === payload.providerTier ? true : false;
    const requestRejected =
      Boolean(pendingRequest) &&
      pendingRequest?.fromTier === payload.providerTier;
    const nextTier = requestRejected
      ? company.providerTier
      : payload.providerTier;
    const tierChanged = nextTier !== company.providerTier;

    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;
    if (payload.endsAt && Number.isNaN(endsAt?.getTime())) {
      return apiError("endsAt must be a valid date.", 422);
    }

    await prisma.$transaction(async (tx) => {
      const existingLinks = safeJsonParse<Record<string, string>>(
        company.socialMediaLinks,
        {},
      );
      const existingMeta = readProviderProfileMeta(existingLinks);
      const updated = await tx.providerCompany.update({
        where: { id: company.id },
        data: {
          providerTier: nextTier,
          tierStatus: payload.tierStatus,
          socialMediaLinks: JSON.stringify(
            mergeProviderProfileMeta(existingLinks, {
              ...existingMeta,
              premiumUpgradeStatus: "none",
              premiumUpgradeRequestedAt: null,
              tierChangeRequestedTier: null,
              galleryEnabled:
                nextTier === "premium"
                  ? (existingMeta.galleryEnabled ?? true)
                  : false,
            }),
          ),
        },
      });

      if (pendingRequest) {
        await tx.providerTierChangeRequest.update({
          where: { id: pendingRequest.id },
          data: {
            reviewedById: user.id,
            status: requestApproved ? "approved" : "rejected",
            reviewedAt: new Date(),
          },
        });
      }

      if (tierChanged && nextTier === "premium") {
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
      } else if (tierChanged) {
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
          action: pendingRequest
            ? requestApproved
              ? "provider_tier_change_approved"
              : "provider_tier_change_rejected"
            : "provider_tier_updated",
          targetType: "provider_company",
          targetId: company.id,
          summary: pendingRequest
            ? `${company.companyName} tier change to ${pendingRequest.toTier} ${
                requestApproved ? "approved" : "rejected"
              }`
            : `${company.companyName} moved to ${nextTier}`,
          metadata: JSON.stringify({
            previousTier: company.providerTier,
            previousTierStatus: company.tierStatus,
            nextTier,
            nextTierStatus: payload.tierStatus,
            tierChangeRequestId: pendingRequest?.id ?? null,
            requestedTier: pendingRequest?.toTier ?? null,
            requestDecision: pendingRequest
              ? requestApproved
                ? "approved"
                : "rejected"
              : null,
          }),
        },
      });

      return updated;
    });

    const updatedCompany = await prisma.providerCompany.findUnique({
      where: { id: company.id },
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
          },
        },
      },
    });

    if (!updatedCompany) {
      return apiError("Provider company not found.", 404);
    }

    return NextResponse.json({
      company: serializeCompany(updatedCompany),
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
