import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeGuide } from "@/app/api/guides/route";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const profile = await prisma.guideProfile.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!profile || !profile.isActive) {
      return apiError("Guide not found.", 404);
    }

    return NextResponse.json({ guide: serializeGuide(profile) });
  } catch (error) {
    console.error("Guide detail error:", error);
    return apiError("Unable to load guide.", 500);
  }
}
