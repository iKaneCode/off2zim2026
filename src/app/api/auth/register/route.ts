import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { rateLimit, rateLimitResponse, AUTH_LIMIT } from "@/lib/rate-limit";
import {
  createSession,
  hashPassword,
  serializeUser,
  setSessionCookie,
} from "@/lib/auth";
import { createEmailVerificationToken } from "@/lib/auth-tokens";
import { sendEmailVerificationEmail } from "@/lib/auth-email";
import { createAuditLog } from "@/lib/audit-log";
import { generateNextServiceProviderId } from "@/lib/provider-company-ids";
import { mergeProviderProfileMeta } from "@/lib/provider-profile-meta";

export const dynamic = "force-dynamic";
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  role: z.enum(["explorer", "provider", "guide", "admin"]),
  explorerType: z.enum(["local", "foreign"]).optional(),
  companyName: z.string().optional(),
  tradingName: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  mainContactPerson: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  physicalAddress: z.string().optional(),
  providerTier: z.enum(["basic", "premium"]).optional(),
});

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, "register", AUTH_LIMIT);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const payload = registerSchema.parse(await request.json());

    if (payload.role === "guide" || payload.role === "admin") {
      return apiError(
        "This account type can only be granted by an Off2Zim administrator.",
        403,
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      return apiError("An account already exists for this email address.", 409);
    }

    const passwordHash = hashPassword(payload.password);
    const serviceProviderId =
      payload.role === "provider"
        ? await generateNextServiceProviderId()
        : undefined;

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: payload.email,
          passwordHash,
          firstName:
            payload.firstName ||
            (payload.role === "provider" ? "Business" : ""),
          lastName:
            payload.lastName || (payload.role === "provider" ? "Owner" : ""),
          name:
            `${payload.firstName} ${payload.lastName}`.trim() ||
            (payload.role === "provider" ? "Business Owner" : payload.email),
          role: payload.role,
          explorerType:
            payload.role === "explorer" ? payload.explorerType : null,
          verificationStatus:
            payload.role === "provider" ? "pending" : "basic_approved",
          explorerScore:
            payload.role === "explorer"
              ? JSON.stringify({
                  rating: 0,
                  completedBookings: 0,
                  cancelledBookings: 0,
                  reviewsReceived: 0,
                  lastUpdated: new Date().toISOString(),
                })
              : JSON.stringify({}),
          ownedCompanies:
            payload.role === "provider"
              ? {
                  create: {
                    serviceProviderId,
                    companyName: payload.companyName || payload.email,
                    tradingName: payload.tradingName || null,
                    businessRegistrationNumber:
                      payload.businessRegistrationNumber || "",
                    mainContactPerson:
                      payload.mainContactPerson ||
                      `${payload.firstName} ${payload.lastName}`.trim() ||
                      "",
                    businessPhone: payload.businessPhone || "",
                    businessEmail: payload.businessEmail || payload.email,
                    physicalAddress: payload.physicalAddress || "",
                    onboardingStatus: "draft",
                    verificationTier: "basic",
                    providerTier: "basic",
                    tierStatus: "active",
                    socialMediaLinks: JSON.stringify(
                      mergeProviderProfileMeta(
                        {},
                        {
                          premiumUpgradeStatus:
                            payload.providerTier === "premium"
                              ? "pending"
                              : "none",
                          premiumUpgradeRequestedAt:
                            payload.providerTier === "premium"
                              ? new Date().toISOString()
                              : null,
                          tierChangeRequestedTier:
                            payload.providerTier === "premium"
                              ? "premium"
                              : null,
                          galleryEnabled: false,
                        },
                      ),
                    ),
                  },
                }
              : undefined,
        },
        include: {
          ownedCompanies: {
            include: {
              documents: true,
              verificationReviews: {
                include: {
                  reviewedBy: true,
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
          },
        },
      });

      const company = createdUser.ownedCompanies[0];
      if (company) {
        await tx.providerCompanyMember.create({
          data: {
            companyId: company.id,
            userId: createdUser.id,
            role: "super_admin",
            status: "active",
            joinedAt: new Date(),
          },
        });

        if (payload.providerTier === "premium") {
          await tx.providerTierChangeRequest.create({
            data: {
              companyId: company.id,
              requestedById: createdUser.id,
              fromTier: "basic",
              toTier: "premium",
              status: "pending",
            },
          });
        }
      }

      return createdUser;
    });

    const session = await createSession(user.id);
    const verificationToken = await createEmailVerificationToken(user.id);
    const delivery = await sendEmailVerificationEmail(
      user.email,
      verificationToken.token,
    );
    const company = user.ownedCompanies[0];

    await createAuditLog({
      actorUserId: user.id,
      action: "user_signed_up",
      targetType: "user",
      targetId: user.id,
      companyId: company?.id,
      summary: `${user.email} signed up as ${user.role}`,
      metadata: {
        role: user.role,
        email: user.email,
        companyId: company?.id ?? null,
        serviceProviderId:
          (company as { serviceProviderId?: string | null } | undefined)
            ?.serviceProviderId ?? null,
        verificationEmailSent: delivery.delivered,
      },
    });

    return setSessionCookie(
      NextResponse.json({
        token: session.sessionToken,
        user: serializeUser(user),
        verificationSent: delivery.delivered,
        ...(delivery.delivered
          ? {}
          : { verificationUrl: delivery.fallbackUrl }),
      }),
      session.sessionToken,
      session.expires,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid registration data",
        422,
      );
    }

    console.error("Register route error:", error);
    return apiError("Unable to create account right now.", 500);
  }
}
