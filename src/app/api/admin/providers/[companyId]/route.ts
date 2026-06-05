import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { serializeCompany } from "@/lib/platform";
import {
  ensureServiceProviderIds,
  getProviderCompanyIdentifierWhere,
} from "@/lib/provider-company-ids";
import {
  mergeProviderProfileMeta,
  readProviderProfileMeta,
} from "@/lib/provider-profile-meta";
import { getServiceProviderDisplayId } from "@/lib/service-provider-id";

export const dynamic = "force-dynamic";

const companyUpdateSchema = z.object({
  companyName: z.string().min(1),
  tradingName: z.string().optional().nullable(),
  legalCompanyName: z.string().optional().nullable(),
  incorporationDate: z.string().optional().nullable(),
  businessRegistrationNumber: z.string().min(1),
  mainContactPerson: z.string().min(1),
  contactPersonPhone: z.string().optional().nullable(),
  contactPersonIdType: z.enum(["id", "passport"]).optional().nullable(),
  contactPersonIdNumber: z.string().optional().nullable(),
  businessPhone: z.string().min(1),
  businessEmail: z.string().email(),
  physicalAddress: z.string().min(1),
  headquartersCity: z.string().optional().nullable(),
  businessCategory: z.string().optional().nullable(),
  businessDescription: z.string().optional().nullable(),
  establishedYear: z.coerce.number().int().optional().nullable(),
  numberOfEmployees: z.string().optional().nullable(),
  operatingHours: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().or(z.literal("")).nullable(),
  socialMediaLinks: z.record(z.string()).default({}),
  servicesOffered: z.array(z.string()).default([]),
  serviceAreas: z.array(z.string()).default([]),
  zimraBpNumber: z.string().optional().nullable(),
  tinNumber: z.string().optional().nullable(),
  taxClearanceExpiresAt: z.string().optional().nullable(),
  documents: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string().min(1),
        status: z.string().optional(),
        notes: z.string().optional().nullable(),
      }),
    )
    .default([]),
});

function parseSocialLinks(value: string | null | undefined) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

function normalizeOperatingHoursForAudit(value: string | null | undefined) {
  const normalized = value?.trim() || "";
  return normalized || null;
}

function isOperatingTimeEnabled(value: string | null | undefined) {
  const normalized = normalizeOperatingHoursForAudit(value);
  if (!normalized || normalized.toLowerCase() === "closed") return false;

  try {
    const parsed = JSON.parse(normalized) as { enabled?: unknown };
    if (typeof parsed.enabled === "boolean") return parsed.enabled;
  } catch {
    // Legacy human-readable operating hours are active when present.
  }

  return true;
}

function getOperatingTimeAuditAction(
  previous: string | null | undefined,
  next: string | null | undefined,
) {
  const previousEnabled = isOperatingTimeEnabled(previous);
  const nextEnabled = isOperatingTimeEnabled(next);

  if (!previousEnabled && nextEnabled) return "provider_operating_time_enabled";
  if (previousEnabled && !nextEnabled)
    return "provider_operating_time_disabled";
  return "provider_operating_time_updated";
}

function companyInclude() {
  return {
    documents: true,
    verificationReviews: {
      include: {
        reviewedBy: true,
      },
      orderBy: {
        createdAt: "desc" as const,
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
        user: true,
        listing: true,
      },
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view service providers.", 403);
    }

    const company = await prisma.providerCompany.findFirst({
      where: getProviderCompanyIdentifierWhere(companyId),
      include: companyInclude(),
    });

    if (!company) {
      return apiError("Service provider not found.", 404);
    }

    const [companyWithId] = await ensureServiceProviderIds([company]);

    return NextResponse.json({ provider: serializeCompany(companyWithId) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin service provider detail error:", error);
    return apiError("Unable to load the service provider right now.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can update service providers.", 403);
    }

    const rawPayload = await request.json();
    const submittedFields =
      rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
        ? Object.keys(rawPayload as Record<string, unknown>)
        : [];
    const payload = companyUpdateSchema.parse(rawPayload);
    const existing = await prisma.providerCompany.findFirst({
      where: getProviderCompanyIdentifierWhere(companyId),
      include: companyInclude(),
    });

    if (!existing) {
      return apiError("Service provider not found.", 404);
    }

    const [existingWithId] = await ensureServiceProviderIds([existing]);
    const existingSocialLinks = parseSocialLinks(
      existingWithId.socialMediaLinks,
    );
    const existingProfileMeta = readProviderProfileMeta(existingSocialLinks);
    const socialMediaLinks = mergeProviderProfileMeta(
      payload.socialMediaLinks,
      {
        ...existingProfileMeta,
        legalCompanyName: payload.legalCompanyName,
        incorporationDate:
          payload.incorporationDate ?? existingProfileMeta.incorporationDate,
        contactPersonPhone: payload.contactPersonPhone,
        contactPersonIdType: payload.contactPersonIdType,
        contactPersonIdNumber: payload.contactPersonIdNumber,
        zimraBpNumber: payload.zimraBpNumber,
        tinNumber: payload.tinNumber,
        taxClearanceExpiresAt: payload.taxClearanceExpiresAt,
      },
    );

    await prisma.providerCompany.update({
      where: { id: existing.id },
      data: {
        companyName: payload.companyName,
        tradingName: payload.tradingName || null,
        businessRegistrationNumber: payload.businessRegistrationNumber,
        mainContactPerson: payload.mainContactPerson,
        businessPhone: payload.businessPhone,
        businessEmail: payload.businessEmail,
        physicalAddress: payload.physicalAddress,
        headquartersCity: payload.headquartersCity || null,
        businessCategory: payload.businessCategory || null,
        businessDescription: payload.businessDescription || null,
        establishedYear: payload.establishedYear ?? null,
        numberOfEmployees: payload.numberOfEmployees || null,
        operatingHours: payload.operatingHours || null,
        ...(payload.websiteUrl !== undefined
          ? { websiteUrl: payload.websiteUrl || null }
          : {}),
        socialMediaLinks: JSON.stringify(socialMediaLinks),
        servicesOffered: JSON.stringify(payload.servicesOffered),
        serviceAreas: JSON.stringify(payload.serviceAreas),
      },
    });

    await Promise.all(
      payload.documents
        .filter((document) => document.id)
        .map((document) =>
          prisma.providerDocument.update({
            where: { id: document.id },
            data: {
              status: document.status || "uploaded",
              notes: document.notes || null,
              reviewedAt:
                document.status === "approved" || document.status === "rejected"
                  ? new Date()
                  : null,
            },
          }),
        ),
    );
    const serviceProviderId = getServiceProviderDisplayId(existingWithId);

    if (
      payload.operatingHours !== undefined &&
      normalizeOperatingHoursForAudit(existingWithId.operatingHours) !==
        normalizeOperatingHoursForAudit(payload.operatingHours)
    ) {
      await createAuditLog({
        actorUserId: user.id,
        action: getOperatingTimeAuditAction(
          existingWithId.operatingHours,
          payload.operatingHours,
        ),
        targetType: "provider_company",
        targetId: existingWithId.id,
        companyId: existingWithId.id,
        summary: `${user.email} changed operating time for ${serviceProviderId}`,
        metadata: {
          targetDisplayId: serviceProviderId,
          serviceProviderId,
          previousOperatingHours:
            normalizeOperatingHoursForAudit(existingWithId.operatingHours) ??
            "not set",
          nextOperatingHours:
            normalizeOperatingHoursForAudit(payload.operatingHours) ??
            "not set",
        },
      });
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "provider_profile_updated",
      targetType: "provider_company",
      targetId: existingWithId.id,
      companyId: existingWithId.id,
      summary: `${user.email} updated service provider profile`,
      metadata: {
        targetDisplayId: serviceProviderId,
        serviceProviderId,
        updatedFields: submittedFields,
        documentsUpdated: submittedFields.includes("documents"),
      },
    });

    const company = await prisma.providerCompany.findUnique({
      where: { id: existing.id },
      include: companyInclude(),
    });

    if (!company) {
      return apiError("Service provider not found.", 404);
    }

    return NextResponse.json({ provider: serializeCompany(company) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid service provider payload.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin service provider update error:", error);
    return apiError("Unable to update the service provider right now.", 500);
  }
}
