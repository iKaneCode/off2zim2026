import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import {
  clearSessionCookie,
  deleteSession,
  requireSessionUser,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getAuthAuditRequestMetadata(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    ipAddress:
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent") || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { user, sessionToken } = await requireSessionUser();
    if (user.role === "admin" || user.role === "provider") {
      const company = user.ownedCompanies[0];
      const roleLabel = user.role === "admin" ? "Admin" : "Service provider";

      await prisma.$transaction([
        prisma.adminAuditLog.create({
          data: {
            adminUserId: user.id,
            action:
              user.role === "admin"
                ? "admin_logged_out"
                : "provider_logged_out",
            targetType: "user",
            targetId: user.id,
            companyId: company?.id ?? null,
            summary: `${roleLabel} ${user.email} logged out`,
            metadata: JSON.stringify({
              targetDisplayId: user.email,
              email: user.email,
              role: user.role,
              serviceProviderId: company?.serviceProviderId ?? null,
              companyId: company?.id ?? null,
              ...getAuthAuditRequestMetadata(request),
            }),
          },
        }),
        prisma.session.deleteMany({
          where: {
            sessionToken,
          },
        }),
      ]);
    } else {
      await deleteSession(sessionToken);
    }

    return clearSessionCookie(NextResponse.json({ ok: true }));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return clearSessionCookie(
        NextResponse.json({ ok: true, alreadySignedOut: true }),
      );
    }

    console.error("Logout route error:", error);
    return apiError("Unable to sign out right now.", 500);
  }
}
