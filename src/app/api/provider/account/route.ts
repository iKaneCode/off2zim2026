import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser, serializeUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const accountSchema = z.object({
  email: z.string().email().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError(
        "Only providers can update provider account details.",
        403,
      );
    }

    const payload = accountSchema.parse(await request.json());
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true },
    });

    if (!current) {
      return apiError("User not found.", 404);
    }

    if (payload.email && payload.email !== current.email) {
      const existing = await prisma.user.findUnique({
        where: { email: payload.email },
        select: { id: true },
      });

      if (existing && existing.id !== user.id) {
        return apiError("That email address is already in use.", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: payload.email
        ? {
            email: payload.email,
            emailVerified: null,
            verificationStatus: "pending",
          }
        : {},
      include: {
        ownedCompanies: {
          include: {
            documents: true,
            verificationReviews: {
              include: {
                reviewedBy: true,
              },
              orderBy: {
                createdAt: "desc",
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
          },
          take: 1,
        },
      },
    });
    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, serviceProviderId: true },
    });

    await createAuditLog({
      actorUserId: user.id,
      action: "provider_account_email_updated",
      targetType: "user",
      targetId: user.id,
      companyId: company?.id ?? null,
      summary: `${current.email} updated provider account email`,
      metadata: {
        previousEmail: current.email,
        nextEmail: updated.email,
        serviceProviderId: company?.serviceProviderId ?? null,
      },
    });

    return NextResponse.json({ user: serializeUser(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid account payload.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider account route error:", error);
    return apiError("Unable to update account right now.", 500);
  }
}
