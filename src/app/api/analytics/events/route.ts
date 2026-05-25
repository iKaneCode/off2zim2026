import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserBySessionToken } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { toJsonRecord } from "@/lib/provider-platform";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  sessionId: z.string().max(120).optional().nullable(),
  eventType: z.string().min(1).max(80),
  appSurface: z
    .enum([
      "tourist_app",
      "provider_web",
      "provider_android",
      "admin_web",
      "public_web",
    ])
    .default("tourist_app"),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  device: z.string().max(120).optional().nullable(),
  platform: z.string().max(80).optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace("Bearer ", "").trim();
}

function decodeHeader(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = eventSchema.parse(await request.json());
    const token = getBearerToken(request);
    const user = token ? await getUserBySessionToken(token) : null;

    const country =
      payload.country ||
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      null;
    const city =
      payload.city ||
      decodeHeader(request.headers.get("x-vercel-ip-city")) ||
      decodeHeader(request.headers.get("cf-ipcity")) ||
      null;
    const region =
      payload.region ||
      decodeHeader(request.headers.get("x-vercel-ip-country-region")) ||
      null;

    const event = await prisma.analyticsEvent.create({
      data: {
        userId: user?.id ?? null,
        sessionId: payload.sessionId || null,
        eventType: payload.eventType,
        appSurface: payload.appSurface,
        country,
        city,
        region,
        device: payload.device || null,
        platform: payload.platform || null,
        metadata: toJsonRecord(payload.metadata),
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { eventId: event.id, createdAt: event.createdAt.toISOString() },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid analytics event.",
        422,
      );
    }
    console.error("Analytics event route error:", error);
    return apiError("Unable to record analytics event right now.", 500);
  }
}
