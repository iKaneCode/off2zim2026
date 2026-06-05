import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { serializeCompany } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import {
  mergeProviderProfileMeta,
  readProviderProfileMeta,
} from "@/lib/provider-profile-meta";

export const dynamic = "force-dynamic";

const sectionReviewSchema = z.object({
  section: z.enum([
    "Profile",
    "Operating Time",
    "Contact Person",
    "Gallery",
    "Company Verification",
    "ZIMRA and Tax Clearance",
  ]),
  decision: z.enum(["accepted", "rejected"]),
  notes: z.string().optional().nullable(),
});

const DOCUMENT_TYPES_BY_SECTION: Partial<Record<string, string[]>> = {
  "Contact Person": ["contact_person_id"],
  "Company Verification": ["certificate_of_incorporation"],
  "ZIMRA and Tax Clearance": ["tax_clearance"],
};

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can review provider sections.", 403);
    }

    const payload = sectionReviewSchema.parse(await request.json());
    const company = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        onboardingStatus: true,
        socialMediaLinks: true,
      },
    });

    if (!company) {
      return apiError("Service provider not found.", 404);
    }

    const links = safeJsonParse<Record<string, string>>(
      company.socialMediaLinks,
      {},
    );
    const meta = readProviderProfileMeta(links);
    const nextPendingSections = (meta.pendingReviewSections ?? []).filter(
      (section) => section !== payload.section,
    );
    const documentTypes = DOCUMENT_TYPES_BY_SECTION[payload.section] ?? [];
    const reviewedAt = new Date();

    await prisma.$transaction(async (tx) => {
      if (documentTypes.length > 0) {
        await tx.providerDocument.updateMany({
          where: {
            companyId: company.id,
            type: { in: documentTypes },
            status: {
              in: [
                "uploaded",
                "pending",
                "pending_review",
                "changes_requested",
              ],
            },
          },
          data: {
            status: payload.decision === "accepted" ? "approved" : "rejected",
            notes: payload.notes || undefined,
            reviewedAt,
          },
        });
      }

      await tx.providerCompany.update({
        where: { id: company.id },
        data: {
          onboardingStatus:
            payload.decision === "rejected"
              ? "changes_requested"
              : nextPendingSections.length === 0 &&
                  company.onboardingStatus === "submitted"
                ? "basic_approved"
                : company.onboardingStatus,
          socialMediaLinks: JSON.stringify(
            mergeProviderProfileMeta(links, {
              ...meta,
              pendingReviewSections: nextPendingSections,
            }),
          ),
          verificationReviews: {
            create: {
              reviewedById: user.id,
              reviewType: "section_review",
              status:
                payload.decision === "accepted"
                  ? "approved"
                  : "changes_requested",
              notes:
                payload.notes ||
                `${payload.section} ${payload.decision} by Off2Zim.`,
              reviewedAt,
            },
          },
          auditLogs: {
            create: {
              adminUserId: user.id,
              action: "provider_section_reviewed",
              targetType: "provider_company",
              targetId: company.id,
              summary: `${payload.section} ${payload.decision}`,
              metadata: JSON.stringify({
                section: payload.section,
                decision: payload.decision,
                notes: payload.notes || null,
              }),
            },
          },
        },
      });
    });

    const updatedCompany = await prisma.providerCompany.findUnique({
      where: { id: company.id },
      include: companyInclude(),
    });

    if (!updatedCompany) {
      return apiError("Service provider not found.", 404);
    }

    return NextResponse.json({ provider: serializeCompany(updatedCompany) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid section review.",
        422,
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin provider section review error:", error);
    return apiError("Unable to review this provider section right now.", 500);
  }
}
