import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AdminUserRecord } from "@/types/platform";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  role: z.enum(["explorer", "provider", "admin", "guide"]).optional(),
  verificationStatus: z
    .enum(["pending", "verified", "rejected", "suspended"])
    .optional(),
  hasVerifiedBadge: z.boolean().optional(),
});

type UserWithCounts = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  role: string;
  verificationStatus: string;
  hasVerifiedBadge: boolean;
  emailVerified: Date | null;
  phone: string | null;
  nationality: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    bookings: number;
    ownedCompanies: number;
    openedDisputes: number;
  };
};

function serializeUser(user: UserWithCounts): AdminUserRecord {
  return {
    id: user.id,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.name ||
      user.email,
    email: user.email,
    role: user.role,
    verificationStatus: user.verificationStatus,
    hasVerifiedBadge: user.hasVerifiedBadge,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    phone: user.phone,
    nationality: user.nationality,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    bookingCount: user._count.bookings,
    providerCompanyCount: user._count.ownedCompanies,
    disputeCount: user._count.openedDisputes,
  };
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view users.", 403);
    }

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 250,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        hasVerifiedBadge: true,
        emailVerified: true,
        phone: true,
        nationality: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
            ownedCompanies: true,
            openedDisputes: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map(serializeUser),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin users route error:", error);
    return apiError("Unable to load users right now.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user: adminUser } = await requireSessionUser();
    if (adminUser.role !== "admin") {
      return apiError("Only administrators can update users.", 403);
    }

    const payload = updateUserSchema.extend({ id: z.string().min(1) }).parse(
      await request.json()
    );

    if (payload.id === adminUser.id && payload.role && payload.role !== "admin") {
      return apiError("You cannot remove your own admin access.", 409);
    }

    const updated = await prisma.user.update({
      where: { id: payload.id },
      data: {
        role: payload.role,
        verificationStatus: payload.verificationStatus,
        hasVerifiedBadge: payload.hasVerifiedBadge,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        hasVerifiedBadge: true,
        emailVerified: true,
        phone: true,
        nationality: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
            ownedCompanies: true,
            openedDisputes: true,
          },
        },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminUser.id,
        action: "user_updated",
        targetType: "user",
        targetId: updated.id,
        summary: `User ${updated.email} updated`,
        metadata: JSON.stringify({
          role: payload.role ?? null,
          verificationStatus: payload.verificationStatus ?? null,
          hasVerifiedBadge: payload.hasVerifiedBadge ?? null,
        }),
      },
    });

    return NextResponse.json({
      user: serializeUser(updated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid user update", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin user update error:", error);
    return apiError("Unable to update user right now.", 500);
  }
}
