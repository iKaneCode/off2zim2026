import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { serializeCompany } from "@/lib/platform";
import {
  mergeProviderProfileMeta,
  readProviderProfileMeta,
} from "@/lib/provider-profile-meta";
import { ensureServiceProviderIds } from "@/lib/provider-company-ids";
import { getServiceProviderDisplayId } from "@/lib/service-provider-id";

export const dynamic = "force-dynamic";
const companySchema = z.object({
  companyName: z.string().optional().nullable(),
  tradingName: z.string().optional().nullable(),
  legalCompanyName: z.string().optional().nullable(),
  incorporationDate: z.string().optional().nullable(),
  profileImageUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  businessRegistrationNumber: z.string().optional().nullable(),
  mainContactPerson: z.string().optional().nullable(),
  contactPersonPhone: z.string().optional().nullable(),
  contactPersonIdType: z.string().optional().nullable(),
  contactPersonIdNumber: z.string().optional().nullable(),
  businessPhone: z.string().optional().nullable(),
  businessEmail: z.string().email().optional().or(z.literal("")).nullable(),
  physicalAddress: z.string().optional().nullable(),
  headquartersCity: z.string().optional().nullable(),
  businessCategory: z.string().optional().nullable(),
  businessDescription: z.string().optional().nullable(),
  establishedYear: z.coerce.number().int().optional().nullable(),
  numberOfEmployees: z.string().optional().nullable(),
  operatingHours: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().or(z.literal("")).nullable(),
  socialMediaLinks: z.record(z.string()).default({}),
  servicesOffered: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  zimraBpNumber: z.string().optional().nullable(),
  tinNumber: z.string().optional().nullable(),
  taxClearanceExpiresAt: z.string().optional().nullable(),
  galleryEnabled: z.boolean().optional().nullable(),
  premiumUpgradeStatus: z
    .enum(["none", "pending"])
    .optional()
    .nullable(),
  premiumUpgradeRequestedAt: z.string().optional().nullable(),
  payoutSettings: z.record(z.unknown()).optional().nullable(),
  providerTier: z.enum(["basic", "premium"]).optional(),
  reviewSection: z
    .enum([
      "Profile",
      "Operating Time",
      "Contact Person",
      "Gallery",
      "Company Verification",
      "ZIMRA and Tax Clearance",
    ])
    .optional(),
  documents: z
    .array(
      z.object({
        type: z.string().min(1),
        fileName: z.string().min(1),
        fileUrl: z.string().optional().nullable(),
        status: z.string().optional(),
        notes: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
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

async function findProviderCompany(userId: string) {
  return prisma.providerCompany.findUnique({
    where: { ownerUserId: userId },
    include: {
      documents: true,
      verificationReviews: {
        include: {
          reviewedBy: true,
        },
        orderBy: {
          createdAt: "desc",
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
        },
      },
    },
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can access company onboarding.", 403);
    }

    const company = await findProviderCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const [companyWithId] = await ensureServiceProviderIds([company]);

    return NextResponse.json({ company: serializeCompany(companyWithId) });
  } catch (error) {
    return apiError("Unauthorized", 401);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can update company onboarding.", 403);
    }

    const rawPayload = await request.json();
    const submittedFields =
      rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
        ? Object.keys(rawPayload as Record<string, unknown>)
        : [];
    const payload = companySchema.parse(rawPayload);
    const requiresOff2ZimReview = Boolean(payload.reviewSection);
    const existing = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: {
        id: true,
        serviceProviderId: true,
        companyName: true,
        businessRegistrationNumber: true,
        mainContactPerson: true,
        businessPhone: true,
        businessEmail: true,
        physicalAddress: true,
        operatingHours: true,
        socialMediaLinks: true,
        providerTier: true,
      },
    });

    if (!existing) {
      return apiError("Provider company profile not found.", 404);
    }

    const existingSocialMediaLinks = safeJsonParse<Record<string, string>>(
      existing.socialMediaLinks,
      {},
    );
    const existingMeta = readProviderProfileMeta(existingSocialMediaLinks);
    const requestedTier =
      payload.providerTier && payload.providerTier !== existing.providerTier
        ? payload.providerTier
        : null;
    const tierChangeTarget =
      requestedTier ||
      (payload.premiumUpgradeStatus === "pending"
        ? existing.providerTier === "premium"
          ? "basic"
          : "premium"
        : null);
    const cancellingTierChange =
      payload.premiumUpgradeStatus === "none" && !tierChangeTarget;
    const samePendingTierChange =
      existingMeta.premiumUpgradeStatus === "pending" &&
      existingMeta.tierChangeRequestedTier === tierChangeTarget;
    const tierChangeRequestedAt = tierChangeTarget
      ? payload.premiumUpgradeRequestedAt ||
        (samePendingTierChange
          ? existingMeta.premiumUpgradeRequestedAt
          : new Date().toISOString())
      : cancellingTierChange
        ? null
        : existingMeta.premiumUpgradeRequestedAt;
    const nextTierChangeStatus = tierChangeTarget
      ? "pending"
      : cancellingTierChange
        ? "none"
        : existingMeta.premiumUpgradeStatus;
    const socialMediaLinks = mergeProviderProfileMeta(
      payload.socialMediaLinks,
      {
        ...existingMeta,
        legalCompanyName:
          payload.legalCompanyName ?? existingMeta.legalCompanyName,
        incorporationDate:
          payload.incorporationDate ?? existingMeta.incorporationDate,
        profileImageUrl:
          payload.profileImageUrl ?? existingMeta.profileImageUrl,
        coverImageUrl: payload.coverImageUrl ?? existingMeta.coverImageUrl,
        contactPersonPhone:
          payload.contactPersonPhone ?? existingMeta.contactPersonPhone,
        contactPersonIdType:
          payload.contactPersonIdType ?? existingMeta.contactPersonIdType,
        contactPersonIdNumber:
          payload.contactPersonIdNumber ?? existingMeta.contactPersonIdNumber,
        zimraBpNumber: payload.zimraBpNumber ?? existingMeta.zimraBpNumber,
        tinNumber: payload.tinNumber ?? existingMeta.tinNumber,
        taxClearanceExpiresAt:
          payload.taxClearanceExpiresAt ?? existingMeta.taxClearanceExpiresAt,
        galleryEnabled:
          payload.galleryEnabled === undefined
            ? existingMeta.galleryEnabled
            : payload.galleryEnabled,
        premiumUpgradeStatus:
          nextTierChangeStatus,
        premiumUpgradeRequestedAt:
          tierChangeRequestedAt,
        tierChangeRequestedTier: tierChangeTarget
          ? tierChangeTarget
          : cancellingTierChange
            ? null
            : existingMeta.tierChangeRequestedTier,
        pendingReviewSections: payload.reviewSection
          ? Array.from(
              new Set([
                ...(existingMeta.pendingReviewSections ?? []),
                payload.reviewSection,
              ]),
            )
          : existingMeta.pendingReviewSections,
        payoutSettings: payload.payoutSettings ?? existingMeta.payoutSettings,
      },
    );

    await prisma.providerCompany.update({
      where: { id: existing.id },
      data: {
        companyName: payload.companyName || existing.companyName,
        tradingName:
          payload.tradingName === undefined
            ? undefined
            : payload.tradingName || null,
        businessRegistrationNumber:
          payload.businessRegistrationNumber ??
          existing.businessRegistrationNumber,
        mainContactPerson:
          payload.mainContactPerson ?? existing.mainContactPerson,
        businessPhone: payload.businessPhone ?? existing.businessPhone,
        businessEmail: payload.businessEmail || existing.businessEmail,
        physicalAddress: payload.physicalAddress ?? existing.physicalAddress,
        headquartersCity:
          payload.headquartersCity === undefined
            ? undefined
            : payload.headquartersCity || null,
        businessCategory:
          payload.businessCategory === undefined
            ? undefined
            : payload.businessCategory || null,
        businessDescription:
          payload.businessDescription === undefined
            ? undefined
            : payload.businessDescription || null,
        establishedYear:
          payload.establishedYear === undefined
            ? undefined
            : (payload.establishedYear ?? null),
        numberOfEmployees:
          payload.numberOfEmployees === undefined
            ? undefined
            : payload.numberOfEmployees || null,
        operatingHours:
          payload.operatingHours === undefined
            ? undefined
            : payload.operatingHours || null,
        websiteUrl:
          payload.websiteUrl === undefined
            ? undefined
            : payload.websiteUrl || null,
        socialMediaLinks: JSON.stringify(socialMediaLinks),
        servicesOffered: payload.servicesOffered
          ? JSON.stringify(payload.servicesOffered)
          : undefined,
        serviceAreas: payload.serviceAreas
          ? JSON.stringify(payload.serviceAreas)
          : undefined,
        onboardingStatus: requiresOff2ZimReview ? "submitted" : undefined,
        reviewSubmittedAt: requiresOff2ZimReview ? new Date() : undefined,
      },
    });

    if (tierChangeTarget) {
      const pendingRequest = await prisma.providerTierChangeRequest.findFirst({
        where: {
          companyId: existing.id,
          status: "pending",
        },
        orderBy: {
          requestedAt: "desc",
        },
      });

      if (!pendingRequest || pendingRequest.toTier !== tierChangeTarget) {
        await prisma.$transaction([
          prisma.providerTierChangeRequest.updateMany({
            where: {
              companyId: existing.id,
              status: "pending",
            },
            data: {
              status: "cancelled",
              reviewedAt: new Date(),
            },
          }),
          prisma.providerTierChangeRequest.create({
            data: {
              companyId: existing.id,
              requestedById: user.id,
              fromTier: existing.providerTier,
              toTier: tierChangeTarget,
              status: "pending",
              requestedAt: new Date(tierChangeRequestedAt || Date.now()),
            },
          }),
        ]);
      }
    } else if (cancellingTierChange) {
      await prisma.providerTierChangeRequest.updateMany({
        where: {
          companyId: existing.id,
          status: "pending",
        },
        data: {
          status: "cancelled",
          reviewedAt: new Date(),
        },
      });
    }

    if (payload.documents) {
      await prisma.providerDocument.deleteMany({
        where: { companyId: existing.id },
      });

      if (payload.documents.length > 0) {
        await prisma.providerDocument.createMany({
          data: payload.documents.map((document) => ({
            companyId: existing.id,
            type: document.type,
            fileName: document.fileName,
            fileUrl: document.fileUrl,
            status: document.status || "uploaded",
            notes: document.notes || null,
          })),
        });
      }
    }

    const serviceProviderId = getServiceProviderDisplayId(existing);
    if (
      payload.profileImageUrl !== undefined &&
      payload.profileImageUrl !== existingMeta.profileImageUrl
    ) {
      await createAuditLog({
        actorUserId: user.id,
        action: "provider_profile_image_updated",
        targetType: "provider_company",
        targetId: existing.id,
        companyId: existing.id,
        summary: `${user.email} updated profile image for ${serviceProviderId}`,
        metadata: {
          targetDisplayId: serviceProviderId,
          serviceProviderId,
          previousUrl: existingMeta.profileImageUrl ?? null,
          nextUrl: payload.profileImageUrl ?? null,
        },
      });
    }

    if (
      payload.coverImageUrl !== undefined &&
      payload.coverImageUrl !== existingMeta.coverImageUrl
    ) {
      await createAuditLog({
        actorUserId: user.id,
        action: "provider_cover_image_updated",
        targetType: "provider_company",
        targetId: existing.id,
        companyId: existing.id,
        summary: `${user.email} updated cover image for ${serviceProviderId}`,
        metadata: {
          targetDisplayId: serviceProviderId,
          serviceProviderId,
          previousUrl: existingMeta.coverImageUrl ?? null,
          nextUrl: payload.coverImageUrl ?? null,
        },
      });
    }

    if (
      payload.operatingHours !== undefined &&
      normalizeOperatingHoursForAudit(existing.operatingHours) !==
        normalizeOperatingHoursForAudit(payload.operatingHours)
    ) {
      await createAuditLog({
        actorUserId: user.id,
        action: getOperatingTimeAuditAction(
          existing.operatingHours,
          payload.operatingHours,
        ),
        targetType: "provider_company",
        targetId: existing.id,
        companyId: existing.id,
        summary: `${user.email} changed operating time for ${serviceProviderId}`,
        metadata: {
          targetDisplayId: serviceProviderId,
          serviceProviderId,
          previousOperatingHours:
            normalizeOperatingHoursForAudit(existing.operatingHours) ??
            "not set",
          nextOperatingHours:
            normalizeOperatingHoursForAudit(payload.operatingHours) ??
            "not set",
        },
      });
    }

    if (
      payload.galleryEnabled !== undefined &&
      payload.galleryEnabled !== existingMeta.galleryEnabled
    ) {
      await createAuditLog({
        actorUserId: user.id,
        action: payload.galleryEnabled
          ? "provider_gallery_enabled"
          : "provider_gallery_disabled",
        targetType: "provider_company",
        targetId: existing.id,
        companyId: existing.id,
        summary: `${user.email} ${
          payload.galleryEnabled ? "enabled" : "disabled"
        } listing gallery for ${serviceProviderId}`,
        metadata: {
          targetDisplayId: serviceProviderId,
          serviceProviderId,
          previousValue: existingMeta.galleryEnabled ?? null,
          nextValue: payload.galleryEnabled,
        },
      });
    }

    if (
      (tierChangeTarget || cancellingTierChange) &&
      (tierChangeTarget !== existingMeta.tierChangeRequestedTier ||
        nextTierChangeStatus !== existingMeta.premiumUpgradeStatus)
    ) {
      await createAuditLog({
        actorUserId: user.id,
        action:
          tierChangeTarget
            ? "provider_tier_change_requested"
            : "provider_tier_change_cancelled",
        targetType: "provider_company",
        targetId: existing.id,
        companyId: existing.id,
        summary:
          tierChangeTarget
            ? `${user.email} requested a ${tierChangeTarget} tier change for ${serviceProviderId}`
            : `${user.email} cancelled a tier change request for ${serviceProviderId}`,
        metadata: {
          targetDisplayId: serviceProviderId,
          serviceProviderId,
          previousStatus: existingMeta.premiumUpgradeStatus ?? "none",
          nextStatus: nextTierChangeStatus ?? "none",
          fromTier: existing.providerTier,
          toTier: tierChangeTarget,
          requestedAt: tierChangeRequestedAt,
        },
      });
    }

    if (
      payload.payoutSettings !== undefined &&
      JSON.stringify(payload.payoutSettings ?? null) !==
        JSON.stringify(existingMeta.payoutSettings ?? null)
    ) {
      await createAuditLog({
        actorUserId: user.id,
        action: "provider_payout_method_updated",
        targetType: "provider_company",
        targetId: existing.id,
        companyId: existing.id,
        summary: `${user.email} updated payout settings for ${serviceProviderId}`,
        metadata: {
          targetDisplayId: serviceProviderId,
          serviceProviderId,
          payoutMethod:
            typeof payload.payoutSettings?.method === "string"
              ? payload.payoutSettings.method
              : null,
        },
      });
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "provider_profile_updated",
      targetType: "provider_company",
      targetId: existing.id,
      companyId: existing.id,
      summary: `${user.email} updated provider profile details`,
      metadata: {
        targetDisplayId: serviceProviderId,
        serviceProviderId,
        updatedFields: submittedFields.filter(
          (field) => field !== "reviewSection",
        ),
        reviewSection: payload.reviewSection ?? null,
        documentsUpdated: submittedFields.includes("documents"),
      },
    });

    const company = await findProviderCompany(user.id);
    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const [companyWithId] = await ensureServiceProviderIds([company]);

    return NextResponse.json({ company: serializeCompany(companyWithId) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid company payload",
        422,
      );
    }

    console.error("Company route error:", error);
    return apiError("Unable to update the company profile right now.", 500);
  }
}
