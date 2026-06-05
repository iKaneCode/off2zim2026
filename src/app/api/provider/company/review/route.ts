import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { serializeCompany } from "@/lib/platform";
import type { ProviderCompanyRecord } from "@/types/platform";

export const dynamic = "force-dynamic";

const REQUIRED_DOCUMENT_TYPES = [
  "certificate_of_incorporation",
  "contact_person_id",
  "tax_clearance",
];

function valueIsPresent(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function getSubmissionMissingFields(company: ProviderCompanyRecord) {
  const missing: string[] = [];

  if (!valueIsPresent(company.profileImageUrl)) missing.push("Profile picture");
  if (!valueIsPresent(company.tradingName || company.companyName)) {
    missing.push("Display name");
  }
  if (!valueIsPresent(company.businessPhone)) missing.push("Business phone");
  if (!valueIsPresent(company.businessEmail)) missing.push("Business email");
  if (!valueIsPresent(company.businessDescription)) missing.push("About us");
  if (company.serviceAreas.length === 0) missing.push("Operating locations");
  if (company.serviceCategories.length === 0) missing.push("Service");
  if (!valueIsPresent(company.mainContactPerson)) {
    missing.push("Contact person");
  }
  if (!valueIsPresent(company.contactPersonPhone)) {
    missing.push("Contact person phone");
  }
  if (!valueIsPresent(company.contactPersonIdType)) missing.push("ID type");
  if (!valueIsPresent(company.contactPersonIdNumber)) {
    missing.push("ID / passport number");
  }
  if (!valueIsPresent(company.legalCompanyName)) {
    missing.push("Company name as per certificate");
  }
  if (!valueIsPresent(company.incorporationDate)) {
    missing.push("Incorporation date");
  }
  if (!valueIsPresent(company.businessRegistrationNumber)) {
    missing.push("Company registration number");
  }
  if (!valueIsPresent(company.zimraBpNumber)) missing.push("ZIMRA BP number");
  if (!valueIsPresent(company.tinNumber)) missing.push("TIN number");
  if (!valueIsPresent(company.taxClearanceExpiresAt)) {
    missing.push("Tax clearance expiry");
  }

  for (const type of REQUIRED_DOCUMENT_TYPES) {
    const document = company.documents.find((item) => item.type === type);
    if (!document || document.status === "rejected") {
      missing.push(type.replace(/_/g, " "));
    }
  }

  return missing;
}

export async function POST() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can submit onboarding for review.", 403);
    }

    if (!user.emailVerified) {
      return apiError("Verify your email before submitting your profile.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
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

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const serializedCompany = serializeCompany(company);
    const missingFields = getSubmissionMissingFields(serializedCompany);

    if (missingFields.length > 0) {
      return apiError(
        `Complete these items before submitting for review: ${missingFields.join(", ")}.`,
        422,
      );
    }

    const updatedCompany = await prisma.providerCompany.update({
      where: { id: company.id },
      data: {
        onboardingStatus: "submitted",
        reviewSubmittedAt: new Date(),
        verificationReviews: {
          create: {
            reviewType: "basic_review",
            status: "pending",
            notes: "Submitted by provider for internal legitimacy review.",
          },
        },
      },
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

    return NextResponse.json({ company: serializeCompany(updatedCompany) });
  } catch (error) {
    console.error("Company review submission error:", error);
    return apiError("Unable to submit for review right now.", 500);
  }
}
