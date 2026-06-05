import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveListingDisplayId } from "@/lib/provider-listing-display-id";
import { normalizeReviewStatus, safeJsonParse } from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  status: z.enum(["pending_review", "approved", "rejected", "archived"]),
  visibility: z.enum(["private", "public"]).optional(),
  rejectionReason: z.string().max(500).optional().nullable(),
});

function serializeMedia(media: {
  id: string;
  companyId: string;
  listingId: string | null;
  mediaType: string;
  title: string | null;
  caption: string | null;
  altText: string | null;
  url: string;
  thumbnailUrl: string | null;
  visibility: string;
  status: string;
  rejectionReason: string | null;
  metadata: string;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company: { id: string; companyName: string };
  listing?: { id: string; title: string; slug: string } | null;
}) {
  return {
    id: media.id,
    companyId: media.companyId,
    listingId: media.listingId,
    mediaType: media.mediaType,
    title: media.title,
    caption: media.caption,
    altText: media.altText,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    visibility: media.visibility,
    status: media.status,
    rejectionReason: media.rejectionReason,
    metadata: safeJsonParse<Record<string, unknown>>(media.metadata, {}),
    reviewedAt: media.reviewedAt?.toISOString() ?? null,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
    company: media.company,
    listing: media.listing ?? null,
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
      return apiError("Only administrators can review provider media.", 403);
    }

    const payload = reviewSchema.parse(await request.json());
    if (payload.status === "rejected" && !payload.rejectionReason?.trim()) {
      return apiError("A rejection reason is required.", 422);
    }

    const current = await prisma.providerMedia.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, companyId: true, status: true },
    });

    if (!current) {
      return apiError("Provider media not found.", 404);
    }

    const reviewed = ["approved", "rejected"].includes(payload.status);
    const media = await prisma.providerMedia.update({
      where: { id: current.id },
      data: {
        status: normalizeReviewStatus(payload.status),
        visibility: payload.visibility,
        reviewedById: reviewed ? user.id : null,
        reviewedAt: reviewed ? new Date() : null,
        rejectionReason:
          payload.status === "rejected"
            ? payload.rejectionReason || null
            : null,
      },
      include: {
        company: { select: { id: true, companyName: true } },
        listing: { select: { id: true, title: true, slug: true } },
      },
    });
    const listingDisplayId = await resolveListingDisplayId(media.listingId);

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        companyId: current.companyId,
        action: "provider_media_reviewed",
        targetType: "provider_media",
        targetId: current.id,
        summary: `Provider media marked ${payload.status}`,
        metadata: JSON.stringify({
          previousStatus: current.status,
          targetDisplayId: listingDisplayId || null,
          listingDisplayId: listingDisplayId || null,
          listingId: media.listingId,
          internalListingId: media.listingId,
          nextStatus: payload.status,
          rejectionReason: payload.rejectionReason || null,
        }),
      },
    });

    return NextResponse.json({ media: serializeMedia(media) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid media review.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin provider media review error:", error);
    return apiError("Unable to review provider media right now.", 500);
  }
}
