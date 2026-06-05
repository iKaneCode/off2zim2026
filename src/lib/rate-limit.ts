import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitOptions {
  limit: number;
  windowSec: number;
}

type RateLimitRow = {
  count: number;
  resetAt: Date;
};

function getRequestIdentity(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function rateLimit(
  request: NextRequest,
  prefix: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const key = `${prefix}:${getRequestIdentity(request)}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowSec * 1000);
  const rows = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "rate_limit_buckets" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_buckets"."resetAt" <= ${now} THEN 1
        ELSE "rate_limit_buckets"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "rate_limit_buckets"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "rate_limit_buckets"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;
  const row = rows[0] || { count: 1, resetAt };
  const resetAtMs = row.resetAt.getTime();

  if (Math.random() < 0.01) {
    void prisma.rateLimitBucket
      .deleteMany({
        where: {
          resetAt: {
            lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      })
      .catch(() => {
        // Expired bucket cleanup must not interrupt the request.
      });
  }

  if (row.count > opts.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: resetAtMs,
      retryAfter: Math.max(1, Math.ceil((resetAtMs - now.getTime()) / 1000)),
    };
  }

  return {
    success: true,
    remaining: Math.max(0, opts.limit - row.count),
    resetAt: resetAtMs,
  };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = result.retryAfter ?? 60;
  const response = apiError("Too many requests. Please slow down.", 429);
  response.headers.set("Retry-After", String(retryAfter));
  response.headers.set("X-RateLimit-Remaining", "0");
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(result.resetAt / 1000)),
  );
  return response;
}

export const AUTH_LIMIT: RateLimitOptions = { limit: 10, windowSec: 60 };
export const PAYMENT_LIMIT: RateLimitOptions = { limit: 20, windowSec: 60 };
export const RATING_LIMIT: RateLimitOptions = { limit: 5, windowSec: 60 };
export const GENERAL_LIMIT: RateLimitOptions = { limit: 120, windowSec: 60 };
