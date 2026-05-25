import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tokenSchema = z.object({
  token: z.string().min(12).max(500),
  platform: z.enum(["ios", "android", "web"]),
  appVariant: z
    .enum(["tourist", "provider_android", "provider_web", "admin_web"])
    .default("tourist"),
  deviceCountry: z.string().max(80).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  locale: z.string().max(40).optional().nullable(),
});

function serializeToken(token: {
  id: string;
  userId: string;
  token: string;
  platform: string;
  appVariant: string;
  deviceCountry: string | null;
  city: string | null;
  locale: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: token.id,
    userId: token.userId,
    platform: token.platform,
    appVariant: token.appVariant,
    deviceCountry: token.deviceCountry,
    city: token.city,
    locale: token.locale,
    lastSeenAt: token.lastSeenAt.toISOString(),
    createdAt: token.createdAt.toISOString(),
    updatedAt: token.updatedAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    const payload = tokenSchema.parse(await request.json());

    const pushToken = await prisma.pushToken.upsert({
      where: { token: payload.token },
      create: {
        userId: user.id,
        token: payload.token,
        platform: payload.platform,
        appVariant: payload.appVariant,
        deviceCountry: payload.deviceCountry || null,
        city: payload.city || null,
        locale: payload.locale || null,
        lastSeenAt: new Date(),
      },
      update: {
        userId: user.id,
        platform: payload.platform,
        appVariant: payload.appVariant,
        deviceCountry: payload.deviceCountry || null,
        city: payload.city || null,
        locale: payload.locale || null,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ pushToken: serializeToken(pushToken) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid push token.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Push token route error:", error);
    return apiError("Unable to register push token right now.", 500);
  }
}
