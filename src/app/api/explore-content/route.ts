import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

function serializePublicExploreContent(content: {
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
  sortOrder: number;
  metadata: string;
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
    sortOrder: content.sortOrder,
    metadata: safeJsonParse<Record<string, unknown>>(content.metadata, {}),
    destination: content.destination ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const destinationId = searchParams.get("destinationId");
    const filterKey = searchParams.get("filterKey");
    const filterValue = searchParams.get("filterValue");

    const content = await prisma.exploreContent.findMany({
      where: {
        status: "approved",
        visibility: "public",
        ...(type ? { type } : {}),
        ...(category ? { category } : {}),
        ...(destinationId ? { destinationId } : {}),
        ...(filterKey ? { filterKey } : {}),
        ...(filterValue ? { filterValue } : {}),
      },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, location: true },
        },
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 300,
    });

    return NextResponse.json({
      content: content.map(serializePublicExploreContent),
    });
  } catch (error) {
    console.error("Explore content route error:", error);
    return apiError("Unable to load explore content right now.", 500);
  }
}
