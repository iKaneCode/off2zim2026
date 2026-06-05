import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  normalizeReviewStatus,
  safeJsonParse,
  toJsonRecord,
} from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  type: z
    .enum(["gallery", "map_point", "filter", "story", "banner"])
    .optional(),
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  destinationId: z.string().min(1).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  filterKey: z.string().max(80).optional().nullable(),
  filterValue: z.string().max(120).optional().nullable(),
  status: z
    .enum(["draft", "pending_review", "approved", "rejected", "archived"])
    .optional(),
  visibility: z.enum(["private", "public"]).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

function serializeExploreContent(content: {
  id: string;
  type: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  destinationId: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  filterKey: string | null;
  filterValue: string | null;
  status: string;
  visibility: string;
  sortOrder: number;
  metadata: string;
  createdById: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  destination?: {
    id: string;
    name: string;
    slug: string;
    location: string;
  } | null;
}) {
  return {
    id: content.id,
    type: content.type,
    title: content.title,
    description: content.description,
    imageUrl: content.imageUrl,
    destinationId: content.destinationId,
    latitude: content.latitude,
    longitude: content.longitude,
    category: content.category,
    filterKey: content.filterKey,
    filterValue: content.filterValue,
    status: content.status,
    visibility: content.visibility,
    sortOrder: content.sortOrder,
    metadata: safeJsonParse<Record<string, unknown>>(content.metadata, {}),
    createdById: content.createdById,
    reviewedById: content.reviewedById,
    reviewedAt: content.reviewedAt?.toISOString() ?? null,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
    destination: content.destination ?? null,
  };
}

async function destinationExists(destinationId: string | null | undefined) {
  if (destinationId === undefined || destinationId === null) {
    return true;
  }

  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true },
  });

  return !!destination;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can update explore content.", 403);
    }

    const payload = updateSchema.parse(await request.json());
    const current = await prisma.exploreContent.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, status: true, metadata: true },
    });

    if (!current) {
      return apiError("Explore content not found.", 404);
    }

    if (!(await destinationExists(payload.destinationId))) {
      return apiError("Destination not found.", 404);
    }

    const reviewed =
      payload.status !== undefined &&
      ["approved", "rejected"].includes(payload.status);
    const content = await prisma.exploreContent.update({
      where: { id: current.id },
      data: {
        type: payload.type,
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl,
        destinationId: payload.destinationId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        category: payload.category,
        filterKey: payload.filterKey,
        filterValue: payload.filterValue,
        status: payload.status
          ? normalizeReviewStatus(payload.status, current.status as never)
          : undefined,
        visibility: payload.visibility,
        sortOrder: payload.sortOrder,
        metadata: payload.metadata ? toJsonRecord(payload.metadata) : undefined,
        reviewedById: reviewed ? user.id : undefined,
        reviewedAt: reviewed ? new Date() : undefined,
      },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, location: true },
        },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        action: "explore_content_updated",
        targetType: "explore_content",
        targetId: content.id,
        summary: `Explore content updated: ${content.title}`,
        metadata: JSON.stringify({
          previousStatus: current.status,
          nextStatus: content.status,
          visibility: content.visibility,
          destinationId: content.destinationId,
        }),
      },
    });

    return NextResponse.json({ content: serializeExploreContent(content) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid explore content update.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin explore content update error:", error);
    return apiError("Unable to update explore content right now.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can archive explore content.", 403);
    }

    const current = await prisma.exploreContent.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, title: true, status: true },
    });

    if (!current) {
      return apiError("Explore content not found.", 404);
    }

    const content = await prisma.exploreContent.update({
      where: { id: current.id },
      data: {
        status: "archived",
        visibility: "private",
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, location: true },
        },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        action: "explore_content_archived",
        targetType: "explore_content",
        targetId: content.id,
        summary: `Explore content archived: ${current.title}`,
        metadata: JSON.stringify({ previousStatus: current.status }),
      },
    });

    return NextResponse.json({ content: serializeExploreContent(content) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin explore content delete error:", error);
    return apiError("Unable to archive explore content right now.", 500);
  }
}
