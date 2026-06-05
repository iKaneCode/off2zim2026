import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeCompany } from "@/lib/platform";
import {
  ensureServiceProviderIds,
  getProviderCompanyIdentifierWhere,
} from "@/lib/provider-company-ids";
import type { ProviderCompanyRecord } from "@/types/platform";

export const dynamic = "force-dynamic";

const activationSchema = z.object({
  active: z.boolean(),
});

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError(
        "Only administrators can activate service providers.",
        403,
      );
    }

    const payload = activationSchema.parse(await request.json());
    const company = await prisma.providerCompany.findFirst({
      where: getProviderCompanyIdentifierWhere(companyId),
      include: companyInclude(),
    });

    if (!company) {
      return apiError("Service provider not found.", 404);
    }

    const [companyWithId] = await ensureServiceProviderIds([company]);
    const serializedCompany = serializeCompany(companyWithId);

    if (payload.active) {
      const missing = getActivationMissingRequirements(serializedCompany);

      if (missing.length > 0) {
        return apiError(
          `Complete ${missing.length} missing requirement${
            missing.length === 1 ? "" : "s"
          } before activating this service provider.`,
          422,
        );
      }
    }

    const updatedCompany = await prisma.providerCompany.update({
      where: { id: companyWithId.id },
      data: {
        tierStatus: payload.active ? "active" : "paused",
        onboardingStatus: payload.active
          ? "basic_approved"
          : companyWithId.onboardingStatus,
        basicApprovedAt: payload.active
          ? (companyWithId.basicApprovedAt ?? new Date())
          : companyWithId.basicApprovedAt,
        auditLogs: {
          create: {
            adminUserId: user.id,
            action: payload.active
              ? "provider_activated"
              : "provider_deactivated",
            targetType: "provider_company",
            targetId: companyWithId.id,
            summary: payload.active
              ? "Service provider activated."
              : "Service provider deactivated.",
            metadata: JSON.stringify({
              previousTierStatus: companyWithId.tierStatus,
              nextTierStatus: payload.active ? "active" : "paused",
            }),
          },
        },
      },
      include: companyInclude(),
    });

    await prisma.user.updateMany({
      where: { id: updatedCompany.ownerUserId },
      data: {
        verificationStatus: payload.active
          ? updatedCompany.providerTier === "premium"
            ? "verified_premium"
            : "basic_approved"
          : "pending",
        hasVerifiedBadge:
          payload.active && updatedCompany.providerTier === "premium",
      },
    });

    return NextResponse.json({ provider: serializeCompany(updatedCompany) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid activation payload.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin provider activation error:", error);
    return apiError(
      "Unable to update service provider activation right now.",
      500,
    );
  }
}

function getActivationMissingRequirements(provider: ProviderCompanyRecord) {
  const missing: string[] = [];
  const requiredDocuments = [
    "certificate_of_incorporation",
    "contact_person_id",
    "tax_clearance",
  ];

  if (!provider.profileImageUrl) missing.push("Profile picture is missing.");
  if (!provider.tradingName?.trim()) missing.push("Display name is missing.");
  if (!provider.businessPhone?.trim())
    missing.push("Business phone is missing.");
  if (!provider.businessEmail?.trim())
    missing.push("Business email is missing.");
  if (!provider.businessDescription?.trim()) {
    missing.push("About us is missing.");
  }
  if (provider.serviceAreas.length === 0) {
    missing.push("Operating location is missing.");
  }
  if (provider.serviceCategories.length === 0) {
    missing.push("Service category is missing.");
  }
  if (!provider.mainContactPerson?.trim()) {
    missing.push("Contact person is missing.");
  }
  if (!provider.contactPersonPhone?.trim()) {
    missing.push("Contact phone is missing.");
  }
  if (!provider.contactPersonIdType?.trim()) {
    missing.push("ID type is missing.");
  }
  if (!provider.contactPersonIdNumber?.trim()) {
    missing.push("ID / passport number is missing.");
  }
  if (!provider.legalCompanyName?.trim()) {
    missing.push("Registered company name is missing.");
  }
  if (!provider.incorporationDate?.trim()) {
    missing.push("Date incorporated is missing.");
  }
  if (!provider.businessRegistrationNumber?.trim()) {
    missing.push("Company registration number is missing.");
  }
  if (!provider.zimraBpNumber?.trim()) {
    missing.push("ZIMRA BP number is missing.");
  }
  if (!provider.tinNumber?.trim()) {
    missing.push("TIN number is missing.");
  }
  if (!provider.taxClearanceExpiresAt?.trim()) {
    missing.push("Tax clearance expiry date is missing.");
  }

  requiredDocuments.forEach((type) => {
    const approved = provider.documents.some(
      (document) => document.type === type && document.status === "approved",
    );
    if (!approved) {
      missing.push(`${type.replace(/_/g, " ")} is not approved.`);
    }
  });

  if ((provider.pendingReviewSections?.length ?? 0) > 0) {
    missing.push("Submitted profile sections are still awaiting review.");
  }
  if ((provider.listingStats?.total ?? 0) === 0) {
    missing.push("At least one listing is required.");
  } else if ((provider.listingStats?.active ?? 0) === 0) {
    missing.push("At least one listing must be approved.");
  }

  return missing;
}
