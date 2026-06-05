import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { serializeCompany } from "@/lib/platform";

export const dynamic = "force-dynamic";
const reviewSchema = z.object({
  status: z.enum(["basic_approved", "changes_requested", "verified_premium"]),
  notes: z.string().min(1),
  internalSummary: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can review providers.", 403);
    }

    const payload = reviewSchema.parse(await request.json());

    const company = await prisma.providerCompany.findUnique({
      where: { id: resolvedParams.companyId },
      select: { id: true },
    });

    if (!company) {
      return apiError("Provider company not found.", 404);
    }

    const updatedCompany = await prisma.providerCompany.update({
      where: { id: company.id },
      data: {
        onboardingStatus:
          payload.status === "changes_requested"
            ? "changes_requested"
            : "basic_approved",
        verificationTier:
          payload.status === "verified_premium" ? "verified_premium" : "basic",
        basicApprovedAt:
          payload.status === "changes_requested" ? null : new Date(),
        verifiedBadgeExpiresAt:
          payload.status === "verified_premium"
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : null,
        verificationReviews: {
          create: {
            reviewedById: user.id,
            reviewType:
              payload.status === "verified_premium"
                ? "verified_partner_review"
                : "basic_review",
            status:
              payload.status === "changes_requested"
                ? "changes_requested"
                : "approved",
            notes: payload.notes,
            internalSummary: payload.internalSummary || null,
            reviewedAt: new Date(),
          },
        },
        auditLogs: {
          create: {
            adminUserId: user.id,
            action: "provider_review_updated",
            targetType: "provider_company",
            targetId: company.id,
            summary: payload.notes,
            metadata: JSON.stringify({
              status: payload.status,
              internalSummary: payload.internalSummary || null,
            }),
          },
        },
      },
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
    });

    await prisma.user.updateMany({
      where: {
        id: updatedCompany.ownerUserId,
      },
      data: {
        verificationStatus:
          payload.status === "changes_requested"
            ? "pending"
            : payload.status === "verified_premium"
              ? "verified_premium"
              : "basic_approved",
        hasVerifiedBadge: payload.status === "verified_premium",
      },
    });

    return NextResponse.json({ company: serializeCompany(updatedCompany) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid review payload",
        422,
      );
    }

    console.error("Admin provider review error:", error);
    return apiError("Unable to save the provider review right now.", 500);
  }
}
