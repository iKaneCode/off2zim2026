import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureServiceProviderIds } from "@/lib/provider-company-ids";
import { resolveListingDisplayIds } from "@/lib/provider-listing-display-id";
import type { AdminActivityLogRecord } from "@/types/platform";

export const dynamic = "force-dynamic";

function safeJsonParse(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatActorName(actor: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  return (
    [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() ||
    actor.name ||
    actor.email
  );
}

function serializeActivityLog(
  log: {
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
    metadata: string | null;
    createdAt: Date;
    admin: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      name: string | null;
      email: string;
      role: string;
    };
    company: {
      id: string;
      createdAt?: Date;
      serviceProviderId: string | null;
      companyName: string;
    } | null;
  },
  metadata: Record<string, unknown>,
  targetDisplayId: string | null,
): AdminActivityLogRecord {
  return {
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    targetDisplayId,
    summary: log.summary,
    metadata,
    createdAt: log.createdAt.toISOString(),
    actor: {
      id: log.admin.id,
      name: formatActorName(log.admin),
      email: log.admin.email,
      role: log.admin.role,
    },
    company: log.company
      ? {
          id: log.company.id,
          serviceProviderId: log.company.serviceProviderId,
          companyName: log.company.companyName,
        }
      : null,
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readListingIdFromMetadata(metadata: Record<string, unknown>) {
  return (
    readString(metadata.listingId) ||
    readString(metadata.internalListingId) ||
    readString(metadata.providerListingId)
  );
}

function readListingDisplayIdFromMetadata(metadata: Record<string, unknown>) {
  return (
    readString(metadata.listingDisplayId) ||
    readString(metadata.displayListingId) ||
    readString(metadata.publicListingId)
  );
}

function resolveTargetDisplayId(
  log: {
    targetType: string;
    targetId: string;
    company: {
      serviceProviderId: string | null;
    } | null;
  },
  metadata: Record<string, unknown>,
  listingDisplayIds: Map<string, string>,
  userDisplayIds: Map<string, string>,
) {
  const explicitTargetId = readString(metadata.targetDisplayId);
  if (explicitTargetId) return explicitTargetId;

  if (log.targetType === "user") {
    return (
      readString(metadata.email) || userDisplayIds.get(log.targetId) || null
    );
  }

  if (log.targetType === "provider_company") {
    return log.company?.serviceProviderId || null;
  }

  if (log.targetType === "provider_listing") {
    return (
      readListingDisplayIdFromMetadata(metadata) ||
      listingDisplayIds.get(log.targetId) ||
      null
    );
  }

  if (log.targetType === "provider_media") {
    const listingId = readListingIdFromMetadata(metadata);
    return (
      readListingDisplayIdFromMetadata(metadata) ||
      (listingId ? listingDisplayIds.get(listingId) : "") ||
      null
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view activity logs.", 403);
    }

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType") || undefined;
    const actorUserId = searchParams.get("actorUserId") || undefined;
    const requestedTake = Number(searchParams.get("take") || 150);
    const take = Number.isFinite(requestedTake)
      ? Math.min(Math.max(requestedTake, 1), 500)
      : 150;

    const logs = await prisma.adminAuditLog.findMany({
      where: {
        ...(targetType ? { targetType } : {}),
        ...(actorUserId ? { adminUserId: actorUserId } : {}),
      },
      include: {
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            role: true,
          },
        },
        company: {
          select: {
            id: true,
            createdAt: true,
            serviceProviderId: true,
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    const metadataByLogId = new Map(
      logs.map((log) => [log.id, safeJsonParse(log.metadata)]),
    );
    const ensuredCompanies = await ensureServiceProviderIds([
      ...new Map(
        logs
          .map((log) => log.company)
          .filter(
            (
              company,
            ): company is NonNullable<(typeof logs)[number]["company"]> =>
              Boolean(company),
          )
          .map((company) => [company.id, company]),
      ).values(),
    ]);
    const serviceProviderIdsByCompanyId = new Map(
      ensuredCompanies.map((company) => [
        company.id,
        company.serviceProviderId,
      ]),
    );
    const listingIds = new Set<string>();
    const userIds = new Set<string>();
    logs.forEach((log) => {
      const metadata = metadataByLogId.get(log.id) ?? {};
      const metadataListingId = readListingIdFromMetadata(metadata);
      if (metadataListingId) {
        listingIds.add(metadataListingId);
      }
      if (
        log.targetType === "provider_listing" &&
        !log.targetId.includes("/")
      ) {
        listingIds.add(log.targetId);
      }
      if (log.targetType === "user" && !log.targetId.includes("@")) {
        userIds.add(log.targetId);
      }
    });
    const [listingDisplayIds, targetUsers] = await Promise.all([
      resolveListingDisplayIds([...listingIds]),
      prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, email: true },
      }),
    ]);
    const userDisplayIds = new Map(
      targetUsers.map((targetUser) => [targetUser.id, targetUser.email]),
    );

    return NextResponse.json({
      logs: logs.map((log) => {
        const metadata = metadataByLogId.get(log.id) ?? {};
        const logWithCompany = log.company
          ? {
              ...log,
              company: {
                ...log.company,
                serviceProviderId:
                  serviceProviderIdsByCompanyId.get(log.company.id) ??
                  log.company.serviceProviderId,
              },
            }
          : log;
        return serializeActivityLog(
          logWithCompany,
          metadata,
          resolveTargetDisplayId(
            logWithCompany,
            metadata,
            listingDisplayIds,
            userDisplayIds,
          ),
        );
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin activity log route error:", error);
    return apiError("Unable to load activity logs right now.", 500);
  }
}

export async function DELETE() {
  return apiError("Activity logs are append-only and cannot be deleted.", 405);
}
