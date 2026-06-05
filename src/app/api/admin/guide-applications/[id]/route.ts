import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeApplication } from "@/app/api/admin/guide-applications/route";

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected", "more_info"]),
  reviewNotes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError(
        "Only administrators can review guide applications.",
        403,
      );
    }

    const payload = reviewSchema.parse(await request.json());

    const application = await prisma.guideApplication.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        userId: true,
        bio: true,
        expertise: true,
        destinations: true,
      },
    });

    if (!application) return apiError("Application not found.", 404);

    const updated = await prisma.guideApplication.update({
      where: { id: resolvedParams.id },
      data: {
        status: payload.status,
        reviewNotes: payload.reviewNotes ?? null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      include: {
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Sync user.guideApplicationStatus and create GuideProfile on approval
    await prisma.user.update({
      where: { id: application.userId },
      data: { guideApplicationStatus: payload.status },
    });

    if (payload.status === "approved") {
      await prisma.guideProfile.upsert({
        where: { userId: application.userId },
        create: {
          userId: application.userId,
          bio: application.bio,
          specialties: application.expertise ?? "[]",
          destinations: application.destinations ?? "[]",
          languages: "[]",
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      await prisma.user.update({
        where: { id: application.userId },
        data: { role: "guide" },
      });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: user.id,
        action: "guide_application_reviewed",
        targetType: "guide_application",
        targetId: resolvedParams.id,
        summary: `Guide application ${payload.status}`,
        metadata: JSON.stringify({
          status: payload.status,
          reviewNotes: payload.reviewNotes,
        }),
      },
    });

    return NextResponse.json({ application: serializeApplication(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid review data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Guide application review error:", error);
    return apiError("Unable to review application.", 500);
  }
}
