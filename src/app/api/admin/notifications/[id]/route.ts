import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  normalizeReviewStatus,
  safeJsonParse,
  toOptionalDate,
} from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  status: z.enum([
    "pending_review",
    "approved",
    "rejected",
    "scheduled",
    "sent",
    "archived",
  ]),
  reviewNotes: z.string().max(700).optional().nullable(),
  rejectionReason: z.string().max(700).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

function serializeCampaign(campaign: {
  id: string;
  companyId: string;
  createdById: string;
  reviewedById: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  campaignType: string;
  discountValue: number | null;
  targetAudience: string;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company: { id: string; companyName: string };
  _count?: { deliveries: number };
}) {
  return {
    id: campaign.id,
    companyId: campaign.companyId,
    createdById: campaign.createdById,
    reviewedById: campaign.reviewedById,
    title: campaign.title,
    body: campaign.body,
    imageUrl: campaign.imageUrl,
    campaignType: campaign.campaignType,
    discountValue: campaign.discountValue,
    targetAudience: safeJsonParse<Record<string, unknown>>(
      campaign.targetAudience,
      {},
    ),
    status: campaign.status,
    scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
    sentAt: campaign.sentAt?.toISOString() ?? null,
    reviewNotes: campaign.reviewNotes,
    rejectionReason: campaign.rejectionReason,
    reviewedAt: campaign.reviewedAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    company: campaign.company,
    deliveriesCount: campaign._count?.deliveries ?? 0,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError(
        "Only administrators can review notification campaigns.",
        403,
      );
    }

    const payload = reviewSchema.parse(await request.json());
    const scheduledAt = toOptionalDate(payload.scheduledAt);

    if (payload.scheduledAt && !scheduledAt) {
      return apiError("scheduledAt must be a valid date.", 422);
    }
    if (payload.status === "rejected" && !payload.rejectionReason?.trim()) {
      return apiError("A rejection reason is required.", 422);
    }
    if (payload.status === "scheduled" && !scheduledAt) {
      return apiError(
        "scheduledAt is required when scheduling a campaign.",
        422,
      );
    }

    const current = await prisma.notificationCampaign.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, companyId: true, status: true },
    });

    if (!current) {
      return apiError("Notification campaign not found.", 404);
    }

    const reviewed = ["approved", "rejected", "scheduled"].includes(
      payload.status,
    );
    const campaign = await prisma.notificationCampaign.update({
      where: { id: current.id },
      data: {
        status: normalizeReviewStatus(payload.status),
        reviewedById: reviewed ? user.id : undefined,
        reviewedAt: reviewed ? new Date() : undefined,
        reviewNotes: payload.reviewNotes ?? undefined,
        rejectionReason:
          payload.status === "rejected"
            ? payload.rejectionReason || null
            : null,
        scheduledAt: scheduledAt ?? undefined,
        sentAt: payload.status === "sent" ? new Date() : undefined,
      },
      include: {
        company: { select: { id: true, companyName: true } },
        _count: { select: { deliveries: true } },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        companyId: current.companyId,
        action: "notification_campaign_reviewed",
        targetType: "notification_campaign",
        targetId: current.id,
        summary: `Notification campaign marked ${payload.status}`,
        metadata: JSON.stringify({
          previousStatus: current.status,
          nextStatus: payload.status,
          scheduledAt: scheduledAt?.toISOString() ?? null,
          rejectionReason: payload.rejectionReason || null,
        }),
      },
    });

    return NextResponse.json({ campaign: serializeCampaign(campaign) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid campaign review.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin notification review error:", error);
    return apiError("Unable to review notification campaign right now.", 500);
  }
}
