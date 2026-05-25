import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

function serializeAdminCampaign(campaign: {
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
  company: { id: string; companyName: string; providerTier: string };
  createdBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  reviewedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
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
    createdBy: campaign.createdBy,
    reviewedBy: campaign.reviewedBy ?? null,
    deliveriesCount: campaign._count?.deliveries ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError(
        "Only administrators can view notification campaigns.",
        403,
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");

    const campaigns = await prisma.notificationCampaign.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: {
          select: { id: true, companyName: true, providerTier: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { deliveries: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({
      campaigns: campaigns.map(serializeAdminCampaign),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin notifications route error:", error);
    return apiError("Unable to load notification campaigns right now.", 500);
  }
}
