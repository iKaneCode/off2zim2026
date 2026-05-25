import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeCompany } from "@/lib/platform";
import {
  mergeProviderProfileMeta,
  readProviderProfileMeta,
} from "@/lib/provider-profile-meta";
import { providerHasFeature } from "@/lib/provider-platform";
import { saveUploadedFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSocialLinks(value: string | null | undefined) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

function companyInclude() {
  return {
    documents: true,
    verificationReviews: {
      include: {
        reviewedBy: true,
      },
      orderBy: {
        createdAt: "desc" as const,
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
  };
}

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
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
    reviewedAt: media.reviewedAt?.toISOString() ?? null,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ companyId: string }> | { companyId: string } },
) {
  try {
    const { companyId } = await Promise.resolve(params);
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can upload provider media.", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const slot = String(formData.get("slot") || "");
    const listingId = String(formData.get("listingId") || "");

    if (slot !== "profile" && slot !== "cover" && slot !== "gallery") {
      return apiError("Media slot must be profile, cover, or gallery.", 422);
    }

    if (!(file instanceof File)) {
      return apiError("A media file is required.", 422);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        socialMediaLinks: true,
        providerTier: true,
        tierStatus: true,
      },
    });

    if (!company) {
      return apiError("Service provider not found.", 404);
    }

    if (
      slot === "gallery" &&
      !providerHasFeature(company, "gallery_management")
    ) {
      return apiError(
        "Basic service providers do not have gallery access.",
        403,
      );
    }

    let galleryListing: { id: string; title: string } | null = null;
    if (slot === "gallery") {
      if (!listingId) {
        return apiError(
          "Select the listing this gallery image belongs to.",
          422,
        );
      }

      galleryListing = await prisma.providerListing.findFirst({
        where: { id: listingId, companyId },
        select: { id: true, title: true },
      });

      if (!galleryListing) {
        return apiError("Listing not found for this service provider.", 404);
      }
    }

    const uploaded = await saveUploadedFile(
      "provider-content",
      file,
      `${companyId}-${slot}${galleryListing ? `-${galleryListing.id}` : ""}`,
    );

    if (slot === "gallery") {
      if (!galleryListing) {
        return apiError("Listing not found for this service provider.", 404);
      }

      const mediaCount = await prisma.providerMedia.count({
        where: { companyId, listingId: galleryListing.id },
      });
      const media = await prisma.providerMedia.create({
        data: {
          companyId,
          listingId: galleryListing.id,
          uploadedById: user.id,
          mediaType: "image",
          title: file.name || "Gallery image",
          url: uploaded.fileUrl,
          mimeType: uploaded.contentType,
          sizeBytes: uploaded.size,
          sortOrder: mediaCount,
          visibility: "private",
          status: "pending_review",
          metadata: JSON.stringify({
            source: "admin_service_provider_detail",
            listingId: galleryListing.id,
          }),
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminUserId: user.id,
          companyId,
          action: "provider_gallery_image_uploaded",
          targetType: "provider_media",
          targetId: media.id,
          summary: `Gallery image uploaded for ${galleryListing?.title}`,
          metadata: JSON.stringify({
            fileName: uploaded.fileName,
            size: uploaded.size,
            listingId: galleryListing.id,
          }),
        },
      });

      return NextResponse.json(
        { media: serializeMedia(media) },
        { status: 201 },
      );
    }

    const socialMediaLinks = parseSocialLinks(company.socialMediaLinks);
    const meta = readProviderProfileMeta(socialMediaLinks);

    const nextLinks = mergeProviderProfileMeta(socialMediaLinks, {
      ...meta,
      profileImageUrl:
        slot === "profile" ? uploaded.fileUrl : meta.profileImageUrl,
      coverImageUrl: slot === "cover" ? uploaded.fileUrl : meta.coverImageUrl,
    });

    await prisma.providerCompany.update({
      where: { id: company.id },
      data: {
        socialMediaLinks: JSON.stringify(nextLinks),
      },
    });

    const updatedCompany = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      include: companyInclude(),
    });

    if (!updatedCompany) {
      return apiError("Service provider not found.", 404);
    }

    return NextResponse.json({ provider: serializeCompany(updatedCompany) });
  } catch (error) {
    console.error("Admin provider media upload error:", error);
    return apiError("Unable to upload the provider media right now.", 500);
  }
}
