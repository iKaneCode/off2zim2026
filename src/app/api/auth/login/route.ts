import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { apiError } from "@/lib/http";
import { rateLimit, rateLimitResponse, AUTH_LIMIT } from "@/lib/rate-limit";
import {
  createSession,
  getUserBySessionToken,
  hashPassword,
  setSessionCookie,
  serializeUser,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

async function logSuccessfulLogin(
  request: NextRequest,
  user: NonNullable<Awaited<ReturnType<typeof getUserBySessionToken>>>,
) {
  if (user.role !== "admin" && user.role !== "provider") {
    return;
  }

  const company = user.ownedCompanies[0];
  const roleLabel = user.role === "admin" ? "Admin" : "Service provider";

  await createAuditLog({
    actorUserId: user.id,
    action: user.role === "admin" ? "admin_logged_in" : "provider_logged_in",
    targetType: "user",
    targetId: user.id,
    companyId: company?.id ?? null,
    summary: `${roleLabel} ${user.email} logged in`,
    metadata: {
      targetDisplayId: user.email,
      email: user.email,
      role: user.role,
      serviceProviderId: company?.serviceProviderId ?? null,
      companyId: company?.id ?? null,
      ...getAuthAuditRequestMetadata(request),
    },
  });
}

async function ensureDemoAccounts() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const count = await prisma.user.count();
  if (count > 0) {
    return;
  }

  const demoUsers = [
    {
      email: "explorer@demo.com",
      password: "demo12345",
      firstName: "Foreign",
      lastName: "Explorer",
      role: "explorer",
      explorerType: "foreign",
      verificationStatus: "basic_approved",
    },
    {
      email: "local.explorer@demo.com",
      password: "demo12345",
      firstName: "Local",
      lastName: "Explorer",
      role: "explorer",
      explorerType: "local",
      verificationStatus: "basic_approved",
    },
    {
      email: "provider@demo.com",
      password: "demo12345",
      firstName: "Provider",
      lastName: "Owner",
      role: "provider",
      verificationStatus: "basic_approved",
      company: {
        companyName: "Victoria Falls Adventure Co.",
        tradingName: "VF Adventure",
        businessRegistrationNumber: "VF-2025-001",
        mainContactPerson: "Provider Owner",
        businessPhone: "+263774555321",
        businessEmail: "provider@demo.com",
        physicalAddress: "Victoria Falls, Zimbabwe",
        businessCategory: "Adventure Activities",
        businessDescription:
          "Adventure operator running flights, cruises, and curated Zimbabwe experiences.",
        servicesOffered: ["Helicopter Tours", "Sunset Cruises", "Safari Trips"],
        onboardingStatus: "basic_approved",
      },
    },
    {
      email: "admin@demo.com",
      password: "demo12345",
      firstName: "Platform",
      lastName: "Admin",
      role: "admin",
      verificationStatus: "basic_approved",
    },
  ];

  for (const demoUser of demoUsers) {
    await prisma.user.create({
      data: {
        email: demoUser.email,
        passwordHash: hashPassword(demoUser.password),
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        name: `${demoUser.firstName} ${demoUser.lastName}`,
        role: demoUser.role,
        explorerType: demoUser.explorerType,
        verificationStatus: demoUser.verificationStatus,
        hasVerifiedBadge: demoUser.role === "provider",
        explorerScore:
          demoUser.role === "explorer"
            ? JSON.stringify({
                rating: 4.8,
                completedBookings: 3,
                cancelledBookings: 0,
                reviewsReceived: 2,
                lastUpdated: new Date().toISOString(),
              })
            : JSON.stringify({}),
        ownedCompanies: demoUser.company
          ? {
              create: {
                ...demoUser.company,
                verificationTier: "basic",
                socialMediaLinks: JSON.stringify({ instagram: "@vfadventure" }),
                serviceAreas: JSON.stringify(["Victoria Falls", "Hwange"]),
                servicesOffered: JSON.stringify(
                  demoUser.company.servicesOffered,
                ),
                reviewSubmittedAt: new Date(),
                basicApprovedAt: new Date(),
                listings: {
                  create: [
                    {
                      title: "Victoria Falls Helicopter Tour",
                      slug: "victoria-falls-helicopter-tour",
                      category: "Experience",
                      listingType: "experience",
                      description:
                        "Scenic helicopter flights over Victoria Falls with professional briefing and premium safety standards.",
                      shortDescription:
                        "A signature aerial experience over the falls.",
                      location: "Victoria Falls",
                      pricingModel: "per_person",
                      basePrice: 180,
                      currency: "USD",
                      instantBooking: true,
                      bookingMode: "instant",
                      status: "active",
                      visibility: "public",
                      images: JSON.stringify([]),
                      amenities: JSON.stringify([
                        "Safety briefing",
                        "Window seat options",
                        "Transfers available",
                      ]),
                      tags: JSON.stringify(["adventure", "iconic", "aerial"]),
                    },
                  ],
                },
              },
            }
          : undefined,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, "login", AUTH_LIMIT);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    await ensureDemoAccounts();

    const payload = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (
      !user?.passwordHash ||
      !verifyPassword(payload.password, user.passwordHash)
    ) {
      return apiError("Incorrect email or password.", 401);
    }

    const session = await createSession(user.id);
    const hydratedUser = await getUserBySessionToken(session.sessionToken);

    if (!hydratedUser) {
      return apiError("Unable to create a session right now.", 500);
    }

    await logSuccessfulLogin(request, hydratedUser);

    return setSessionCookie(
      NextResponse.json({
        token: session.sessionToken,
        user: serializeUser(hydratedUser),
      }),
      session.sessionToken,
      session.expires,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid login data", 422);
    }

    console.error("Login route error:", error);
    return apiError("Unable to sign in right now.", 500);
  }
}
