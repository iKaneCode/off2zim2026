import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveListingDisplayId } from "@/lib/provider-listing-display-id";
import {
  assertProviderFeature,
  safeJsonParse,
  toJsonRecord,
} from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

const mediaSchema = z.object({
  listingId: z.string().min(1).optional().nullable(),
  mediaType: z.enum(["image", "video", "document"]).default("image"),
  title: z.string().max(120).optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  altText: z.string().max(180).optional().nullable(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  sizeBytes: z.coerce.number().int().positive().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  visibility: z.enum(["private", "public"]).default("private"),
  metadata: z.record(z.unknown()).default({}),
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
    listing: media.listing ?? null,
  };
}

async function findProviderCompany(userId: string) {
  return prisma.providerCompany.findUnique({
    where: { ownerUserId: userId },
    select: {
      id: true,
      serviceProviderId: true,
      onboardingStatus: true,
      providerTier: true,
      tierStatus: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can view media.", 403);
    }

    const company = await findProviderCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const listingId = searchParams.get("listingId");

    const media = await prisma.providerMedia.findMany({
      where: {
        companyId: company.id,
        ...(status ? { status } : {}),
        ...(listingId ? { listingId } : {}),
      },
      include: {
        listing: { select: { id: true, title: true, slug: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ media: media.map(serializeMedia) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider media route error:", error);
    return apiError("Unable to load provider media right now.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can upload media.", 403);
    }

    const company = await findProviderCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    if (company.onboardingStatus !== "basic_approved") {
      return apiError(
        "Your company profile must be approved before uploading gallery media.",
        403,
      );
    }

    assertProviderFeature(company, "profile_content");
    const payload = mediaSchema.parse(await request.json());

    if (payload.mediaType === "image" || payload.mediaType === "video") {
      assertProviderFeature(company, "gallery_management");
    }

    if (!payload.listingId) {
      return apiError("Select the listing this media belongs to.", 422);
    }

    const listing = await prisma.providerListing.findFirst({
      where: { id: payload.listingId, companyId: company.id },
      select: { id: true },
    });

    if (!listing) {
      return apiError("Listing not found for this provider.", 404);
    }

    const listingDisplayId = await resolveListingDisplayId(listing.id);
    const media = await prisma.providerMedia.create({
      data: {
        companyId: company.id,
        listingId: payload.listingId || null,
        uploadedById: user.id,
        mediaType: payload.mediaType,
        title: payload.title || null,
        caption: payload.caption || null,
        altText: payload.altText || null,
        url: payload.url,
        thumbnailUrl: payload.thumbnailUrl || null,
        mimeType: payload.mimeType || null,
        sizeBytes: payload.sizeBytes ?? null,
        sortOrder: payload.sortOrder,
        visibility: payload.visibility,
        status: "pending_review",
        metadata: toJsonRecord({
          ...payload.metadata,
          listingDisplayId,
        }),
      },
      include: {
        listing: { select: { id: true, title: true, slug: true } },
      },
    });

    await createAuditLog({
      actorUserId: user.id,
      action: "provider_media_uploaded",
      targetType: "provider_media",
      targetId: media.id,
      companyId: company.id,
      summary: `${user.email} uploaded ${media.mediaType} media for review`,
      metadata: {
        listingId: media.listingId,
        targetDisplayId: listingDisplayId,
        listingDisplayId,
        internalListingId: media.listingId,
        listingTitle: media.listing?.title ?? null,
        mediaType: media.mediaType,
        title: media.title,
        status: media.status,
      },
    });

    return NextResponse.json({ media: serializeMedia(media) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid media payload.",
        422,
      );
    }
    if (error instanceof Error && "status" in error) {
      return apiError(error.message, Number(error.status) || 403);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider media create error:", error);
    return apiError("Unable to save provider media right now.", 500);
  }
}
