import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AnalyticsRow = {
  eventType: string;
  appSurface: string;
  country: string | null;
  city: string | null;
  region: string | null;
  device: string | null;
  platform: string | null;
  userId: string | null;
  createdAt: Date;
};

function topBy<T extends string>(
  rows: AnalyticsRow[],
  selector: (row: AnalyticsRow) => T | null | undefined,
  fallback: T,
  limit = 12,
) {
  const counts = new Map<T, number>();

  for (const row of rows) {
    const key = selector(row) || fallback;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view analytics.", 403);
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Math.max(Number(searchParams.get("days") || 30) || 30, 1),
      365,
    );
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: {
        eventType: true,
        appSurface: true,
        country: true,
        city: true,
        region: true,
        device: true,
        platform: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const knownUsers = new Set(
      rows.flatMap((row) => (row.userId ? [row.userId] : [])),
    );

    return NextResponse.json({
      analytics: {
        periodDays: days,
        since: since.toISOString(),
        sampledEvents: rows.length,
        identifiedUsers: knownUsers.size,
        byCountry: topBy(rows, (row) => row.country, "Unknown"),
        byCity: topBy(rows, (row) => row.city, "Unknown"),
        byRegion: topBy(rows, (row) => row.region, "Unknown"),
        bySurface: topBy(rows, (row) => row.appSurface, "unknown"),
        byEventType: topBy(rows, (row) => row.eventType, "unknown"),
        byPlatform: topBy(rows, (row) => row.platform, "unknown"),
        recent: rows.slice(0, 50).map((row) => ({
          eventType: row.eventType,
          appSurface: row.appSurface,
          country: row.country,
          city: row.city,
          region: row.region,
          device: row.device,
          platform: row.platform,
          userId: row.userId,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin analytics overview route error:", error);
    return apiError("Unable to load analytics overview right now.", 500);
  }
}
