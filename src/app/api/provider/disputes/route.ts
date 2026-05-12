import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeDispute } from "@/lib/platform";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can view provider disputes.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const disputes = await prisma.dispute.findMany({
      where: {
        companyId: company.id,
      },
      include: {
        booking: {
          include: {
            listing: true,
            provider: true,
            payments: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        openedBy: true,
        assignedAdmin: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      disputes: disputes.map(serializeDispute),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider disputes route error:", error);
    return apiError("Unable to load disputes right now.", 500);
  }
}
