import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  assertProviderFeature,
  safeJsonParse,
  toJsonRecord,
  toOptionalDate,
} from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

const campaignSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(10).max(800),
  imageUrl: z.string().url().optional().nullable(),
  campaignType: z
    .enum(["announcement", "discount", "sale", "special", "event"])
    .default("announcement"),
  discountValue: z.coerce.number().positive().optional().nullable(),
  targetAudience: z.record(z.unknown()).default({}),
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
    deliveriesCount: campaign._count?.deliveries ?? 0,
  };
}

async function findProviderCompany(userId: string) {
  return prisma.providerCompany.findUnique({
    where: { ownerUserId: userId },
    select: { id: true, providerTier: true, tierStatus: true },
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can view notification campaigns.", 403);
    }

    const company = await findProviderCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const campaigns = await prisma.notificationCampaign.findMany({
      where: { companyId: company.id },
      include: { _count: { select: { deliveries: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ campaigns: campaigns.map(serializeCampaign) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider notifications route error:", error);
    return apiError("Unable to load notification campaigns right now.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can create notification campaigns.", 403);
    }

    const company = await findProviderCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    assertProviderFeature(company, "push_campaigns");
    const payload = campaignSchema.parse(await request.json());
    const scheduledAt = toOptionalDate(payload.scheduledAt);

    if (payload.scheduledAt && !scheduledAt) {
      return apiError("scheduledAt must be a valid date.", 422);
    }

    const campaign = await prisma.notificationCampaign.create({
      data: {
        companyId: company.id,
        createdById: user.id,
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || null,
        campaignType: payload.campaignType,
        discountValue: payload.discountValue ?? null,
        targetAudience: toJsonRecord(payload.targetAudience),
        scheduledAt,
        status: "pending_review",
      },
      include: { _count: { select: { deliveries: true } } },
    });

    return NextResponse.json(
      { campaign: serializeCampaign(campaign) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid campaign payload.",
        422,
      );
    }
    if (error instanceof Error && "status" in error) {
      return apiError(error.message, Number(error.status) || 403);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider notification create error:", error);
    return apiError("Unable to create notification campaign right now.", 500);
  }
}
