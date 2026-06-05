import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import {
  buildMobileProfile,
  parseUserPreferences,
  serializeUserPreferences,
} from "@/lib/mobile-backend";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  full_name: z.string().optional(),
  business_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().optional(),
  user_type: z.string().optional(),
  title: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  id_type: z.string().nullable().optional(),
  identity_number: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

async function getProfileForUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      phone: true,
      nationality: true,
      image: true,
      role: true,
      explorerScore: true,
      preferences: true,
    },
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    const dbUser = await getProfileForUser(user.id);

    if (!dbUser) {
      return apiError("User not found.", 404);
    }

    return NextResponse.json({ profile: buildMobileProfile(dbUser) });
  } catch {
    return apiError("Unauthorized", 401);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    const rawPayload = await request.json();
    const submittedFields =
      rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
        ? Object.keys(rawPayload as Record<string, unknown>)
        : [];
    const payload = profileSchema.parse(rawPayload);
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, preferences: true },
    });

    if (!current) {
      return apiError("User not found.", 404);
    }

    const preferences = parseUserPreferences(current.preferences);
    const mobileProfile = {
      ...(typeof preferences.mobileProfile === "object" &&
      preferences.mobileProfile
        ? preferences.mobileProfile
        : {}),
      ...Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined),
      ),
    };

    const names =
      typeof payload.full_name === "string"
        ? payload.full_name.trim().split(/\s+/).filter(Boolean)
        : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: payload.email,
        phone: payload.phone ?? undefined,
        nationality: payload.nationality ?? undefined,
        image: payload.avatar_url ?? undefined,
        firstName: names ? names[0] || null : undefined,
        lastName: names ? names.slice(1).join(" ") || null : undefined,
        name: payload.full_name ?? undefined,
        preferences: serializeUserPreferences({
          ...preferences,
          mobileProfile,
        }),
      },
    });

    const updated = await getProfileForUser(user.id);
    if (!updated) {
      return apiError("User not found.", 404);
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "user_profile_updated",
      targetType: "user",
      targetId: user.id,
      summary: `${user.email} updated their profile`,
      metadata: {
        updatedFields: submittedFields,
      },
    });

    return NextResponse.json({ profile: buildMobileProfile(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid profile payload",
        422,
      );
    }

    console.error("Profile route error:", error);
    return apiError("Unable to update profile right now.", 500);
  }
}

export async function DELETE() {
  try {
    const { user } = await requireSessionUser();

    await prisma.$transaction(async (tx) => {
      const company = await tx.providerCompany.findUnique({
        where: { ownerUserId: user.id },
        select: { id: true },
      });

      if (company) {
        await tx.booking.deleteMany({
          where: { providerId: company.id },
        });
        await tx.providerCompany.delete({
          where: { id: company.id },
        });
      }

      await tx.payment.deleteMany({ where: { userId: user.id } });
      await tx.review.deleteMany({ where: { userId: user.id } });
      await tx.booking.deleteMany({ where: { userId: user.id } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.account.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Profile delete route error:", error);
    return apiError("Unable to delete account right now.", 500);
  }
}
