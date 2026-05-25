import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

function serializeAdminMedia(media: {
  id: string;
  companyId: string;
  listingId: string | null;
  uploadedById: string | null;
  reviewedById: string | null;
  mediaType: string;
  title: string | null;
  caption: string | null;
  altText: string | null;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sortOrder: number;
  visibility: string;
  status: string;
  rejectionReason: string | null;
  metadata: string;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company: { id: string; companyName: string; providerTier: string };
  listing?: { id: string; title: string; slug: string } | null;
  uploadedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  reviewedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}) {
  return {
    id: media.id,
    companyId: media.companyId,
    listingId: media.listingId,
    uploadedById: media.uploadedById,
    reviewedById: media.reviewedById,
    mediaType: media.mediaType,
    title: media.title,
    caption: media.caption,
    altText: media.altText,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    sortOrder: media.sortOrder,
    visibility: media.visibility,
    status: media.status,
    rejectionReason: media.rejectionReason,
    metadata: safeJsonParse<Record<string, unknown>>(media.metadata, {}),
    reviewedAt: media.reviewedAt?.toISOString() ?? null,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
    company: media.company,
    listing: media.listing ?? null,
    uploadedBy: media.uploadedBy ?? null,
    reviewedBy: media.reviewedBy ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view provider media.", 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");

    const media = await prisma.providerMedia.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: {
          select: { id: true, companyName: true, providerTier: true },
        },
        listing: { select: { id: true, title: true, slug: true } },
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ media: media.map(serializeAdminMedia) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin provider media route error:", error);
    return apiError("Unable to load provider media right now.", 500);
  }
}
