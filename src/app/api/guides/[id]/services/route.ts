import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — public list of services for a guide
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const profile = await prisma.guideProfile.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, isActive: true },
    });

    if (!profile || !profile.isActive) {
      return apiError("Guide not found.", 404);
    }

    const services = await prisma.guideService.findMany({
      where: { guideId: resolvedParams.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ services: services.map(serializeService) });
  } catch (error) {
    console.error("Guide services error:", error);
    return apiError("Unable to load services.", 500);
  }
}

const createServiceSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  serviceType: z.enum(["planning", "video_call", "in_person_tour"]),
  price: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  durationMin: z.number().int().positive(),
});

// POST — guide creates a new service offering (requires guide role)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();

    const profile = await prisma.guideProfile.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, userId: true },
    });

    if (!profile) return apiError("Guide not found.", 404);
    if (profile.userId !== user.id && user.role !== "admin") {
      return apiError("You can only manage your own guide services.", 403);
    }

    const payload = createServiceSchema.parse(await request.json());

    const service = await prisma.guideService.create({
      data: {
        guideId: profile.id,
        ...payload,
      },
    });

    return NextResponse.json(
      { service: serializeService(service) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid service data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Create guide service error:", error);
    return apiError("Unable to create service.", 500);
  }
}

function serializeService(service: {
  id: string;
  guideId: string;
  title: string;
  description: string;
  serviceType: string;
  price: number;
  currency: string;
  durationMin: number;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: service.id,
    guideId: service.guideId,
    title: service.title,
    description: service.description,
    serviceType: service.serviceType,
    price: service.price,
    currency: service.currency,
    durationMin: service.durationMin,
    isActive: service.isActive,
    createdAt: service.createdAt.toISOString(),
  };
}
