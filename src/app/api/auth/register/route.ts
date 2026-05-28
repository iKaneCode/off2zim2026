import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { rateLimit, rateLimitResponse, AUTH_LIMIT } from "@/lib/rate-limit";
import { createSession, hashPassword, serializeUser } from "@/lib/auth";
import { createEmailVerificationToken } from "@/lib/auth-tokens";
import { sendEmailVerificationEmail } from "@/lib/auth-email";
import { generateNextServiceProviderId } from "@/lib/provider-company-ids";

export const dynamic = "force-dynamic";
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
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
  const rl = rateLimit(request, "register", AUTH_LIMIT);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const payload = registerSchema.parse(await request.json());

    if (payload.role === "guide" || payload.role === "admin") {
      return apiError(
        "This account type can only be granted by an Off2Zim administrator.",
        403,
      );
    }

    if (
      payload.role === "provider" &&
      (!payload.companyName ||
        !payload.businessRegistrationNumber ||
        !payload.mainContactPerson ||
        !payload.businessPhone ||
        !payload.businessEmail ||
        !payload.physicalAddress)
    ) {
      return apiError(
        "Provider registration requires the core company profile fields.",
        422,
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

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        role: payload.role,
        explorerType: payload.role === "explorer" ? payload.explorerType : null,
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
                  companyName: payload.companyName!,
                  tradingName: payload.tradingName,
                  businessRegistrationNumber:
                    payload.businessRegistrationNumber!,
                  mainContactPerson: payload.mainContactPerson!,
                  businessPhone: payload.businessPhone!,
                  businessEmail: payload.businessEmail!,
                  physicalAddress: payload.physicalAddress!,
                  onboardingStatus: "draft",
                  verificationTier: "basic",
                  providerTier: payload.providerTier || "basic",
                  tierStatus: "active",
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

    const session = await createSession(user.id);
    const verificationToken = await createEmailVerificationToken(user.id);
    const delivery = await sendEmailVerificationEmail(
      user.email,
      verificationToken.token,
    );

    return NextResponse.json({
      token: session.sessionToken,
      user: serializeUser(user),
      verificationSent: delivery.delivered,
      ...(delivery.delivered ? {} : { verificationUrl: delivery.fallbackUrl }),
    });
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
