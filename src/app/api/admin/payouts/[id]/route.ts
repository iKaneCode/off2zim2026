import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPayoutProcessed } from "@/lib/platform-email";

const processSchema = z.object({
  status: z.enum(["processing", "completed", "failed"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") return apiError("Admins only.", 403);

    const payload = processSchema.parse(await request.json());

    const payout = await prisma.payout.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, status: true },
    });

    if (!payout) return apiError("Payout not found.", 404);
    if (payout.status === "completed" || payout.status === "failed") {
      return apiError("This payout has already been finalised.", 409);
    }

    const updated = await prisma.payout.update({
      where: { id: resolvedParams.id },
      data: {
        status: payload.status,
        reference: payload.reference ?? null,
        notes: payload.notes ?? null,
        processedAt:
          payload.status === "completed" || payload.status === "failed"
            ? new Date()
            : null,
      },
      include: {
        company: {
          select: {
            companyName: true,
            tradingName: true,
            owner: { select: { email: true } },
          },
        },
      },
    });

    // Notify provider when payout is finalised
    if (payload.status === "completed" || payload.status === "failed") {
      const ownerEmail = updated.company.owner?.email;
      if (ownerEmail) {
        void sendPayoutProcessed({
          to: ownerEmail,
          providerName:
            updated.company.tradingName || updated.company.companyName,
          amount: updated.amount,
          currency: updated.currency,
          status: payload.status,
          reference: updated.reference ?? null,
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      payout: {
        id: updated.id,
        status: updated.status,
        reference: updated.reference,
        processedAt: updated.processedAt?.toISOString() ?? null,
        companyName: updated.company.tradingName || updated.company.companyName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to process payout.", 500);
  }
}
