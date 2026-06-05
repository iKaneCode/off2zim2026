import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServiceProviderDisplayId } from "@/lib/service-provider-id";
import { resolveListingDisplayIds } from "@/lib/provider-listing-display-id";
import type { AdminActivityLogRecord } from "@/types/platform";

export const dynamic = "force-dynamic";

function safeJsonParse(value: string | null | undefined) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatUserName(user: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.name ||
    user.email
  );
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
  },
  metadata: Record<string, unknown>,
  serviceProviderId: string,
  listingDisplayIds: Map<string, string>,
) {
  const explicitTargetId = readString(metadata.targetDisplayId);
  if (explicitTargetId) return explicitTargetId;

  if (log.targetType === "provider_company") return serviceProviderId;
  if (log.targetType === "user") return readString(metadata.email) || null;

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
    if (user.role !== "provider") {
      return apiError("Only providers can view provider activity.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: {
        id: true,
        createdAt: true,
        serviceProviderId: true,
        companyName: true,
      },
    });

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const { searchParams } = new URL(request.url);
    const requestedTake = Number(searchParams.get("take") || 80);
    const take = Number.isFinite(requestedTake)
      ? Math.min(Math.max(requestedTake, 1), 250)
      : 80;

    const logs = await prisma.adminAuditLog.findMany({
      where: {
        companyId: company.id,
        admin: { role: "provider" },
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
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    const metadataByLogId = new Map(
      logs.map((log) => [log.id, safeJsonParse(log.metadata)]),
    );
    const listingIds = new Set<string>();
    logs.forEach((log) => {
      const metadata = metadataByLogId.get(log.id) ?? {};
      const metadataListingId = readListingIdFromMetadata(metadata);
      if (metadataListingId) listingIds.add(metadataListingId);
      if (
        log.targetType === "provider_listing" &&
        !log.targetId.includes("/")
      ) {
        listingIds.add(log.targetId);
      }
    });
    const listingDisplayIds = await resolveListingDisplayIds([...listingIds]);
    const serviceProviderId = getServiceProviderDisplayId(company);

    const records: AdminActivityLogRecord[] = logs.map((log) => {
      const metadata = metadataByLogId.get(log.id) ?? {};

      return {
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        targetDisplayId: resolveTargetDisplayId(
          log,
          metadata,
          serviceProviderId,
          listingDisplayIds,
        ),
        summary: log.summary,
        metadata,
        createdAt: log.createdAt.toISOString(),
        actor: {
          id: log.admin.id,
          name: formatUserName(log.admin),
          email: log.admin.email,
          role: log.admin.role,
        },
        company: {
          id: company.id,
          serviceProviderId,
          companyName: company.companyName,
        },
      };
    });

    return NextResponse.json({ logs: records });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider activity log route error:", error);
    return apiError("Unable to load provider activity right now.", 500);
  }
}
