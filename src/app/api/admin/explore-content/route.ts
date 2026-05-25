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

const exploreContentSchema = z.object({
  type: z.enum(["gallery", "map_point", "filter", "story", "banner"]),
  title: z.string().min(1).max(160),
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
    .default("approved"),
  visibility: z.enum(["private", "public"]).default("public"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).default({}),
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
  createdBy?: {
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
    createdBy: content.createdBy ?? null,
    reviewedBy: content.reviewedBy ?? null,
  };
}

async function assertDestinationExists(
  destinationId: string | null | undefined,
) {
  if (!destinationId) {
    return true;
  }

  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true },
  });

  return !!destination;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view explore content.", 403);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const destinationId = searchParams.get("destinationId");

    const content = await prisma.exploreContent.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
        ...(destinationId ? { destinationId } : {}),
      },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, location: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 300,
    });

    return NextResponse.json({ content: content.map(serializeExploreContent) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin explore content route error:", error);
    return apiError("Unable to load explore content right now.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can create explore content.", 403);
    }

    const payload = exploreContentSchema.parse(await request.json());
    const destinationExists = await assertDestinationExists(
      payload.destinationId,
    );
    if (!destinationExists) {
      return apiError("Destination not found.", 404);
    }

    const reviewed = ["approved", "rejected"].includes(payload.status);
    const content = await prisma.exploreContent.create({
      data: {
        type: payload.type,
        title: payload.title,
        description: payload.description || null,
        imageUrl: payload.imageUrl || null,
        destinationId: payload.destinationId || null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        category: payload.category || null,
        filterKey: payload.filterKey || null,
        filterValue: payload.filterValue || null,
        status: normalizeReviewStatus(payload.status),
        visibility: payload.visibility,
        sortOrder: payload.sortOrder,
        metadata: toJsonRecord(payload.metadata),
        createdById: user.id,
        reviewedById: reviewed ? user.id : null,
        reviewedAt: reviewed ? new Date() : null,
      },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, location: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        action: "explore_content_created",
        targetType: "explore_content",
        targetId: content.id,
        summary: `Explore content created: ${content.title}`,
        metadata: JSON.stringify({
          type: content.type,
          status: content.status,
          visibility: content.visibility,
          destinationId: content.destinationId,
        }),
      },
    });

    return NextResponse.json(
      { content: serializeExploreContent(content) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid explore content payload.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin explore content create error:", error);
    return apiError("Unable to create explore content right now.", 500);
  }
}
