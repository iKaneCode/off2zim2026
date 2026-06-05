import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderTierFeatures } from "@/lib/provider-platform";
import {
  readProviderProfileMeta,
  stripProviderProfileMeta,
} from "@/lib/provider-profile-meta";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = "off2zim_session";

type UserWithCompany = Awaited<ReturnType<typeof getUserBySessionToken>>;

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

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) {
    return false;
  }

  const candidateHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(originalHash, "hex"),
    Buffer.from(candidateHash, "hex"),
  );
}

export async function createSession(userId: string) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      expires,
    },
  });

  return { sessionToken, expires };
}

function getSessionCookieDomain() {
  const explicitDomain = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (explicitDomain) {
    return explicitDomain;
  }

  if (process.env.NODE_ENV !== "production") {
    return undefined;
  }

  const configuredUrl =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    return undefined;
  }

  try {
    const hostname = new URL(configuredUrl).hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".vercel.app")
    ) {
      return undefined;
    }

    return hostname.startsWith(".") ? hostname : `.${hostname}`;
  } catch {
    return undefined;
  }
}

export async function deleteSession(sessionToken: string) {
  await prisma.session.deleteMany({
    where: {
      sessionToken,
    },
  });
}

export function setSessionCookie(
  response: NextResponse,
  sessionToken: string,
  expires: Date,
) {
  const domain = getSessionCookieDomain();

  if (domain) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  }

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain,
    expires,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  const domain = getSessionCookieDomain();
  if (domain) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain,
      expires: new Date(0),
    });
  }

  return response;
}

export async function getUserBySessionToken(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        include: {
          ownedCompanies: {
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
          },
        },
      },
    },
  });

  if (!session || session.expires < new Date()) {
    return null;
  }

  return session.user;
}

export async function getSessionTokenFromHeaders() {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

export async function requireSessionUser() {
  const sessionToken = await getSessionTokenFromHeaders();
  if (!sessionToken) {
    throw new Error("Unauthorized");
  }

  const user = await getUserBySessionToken(sessionToken);
  if (!user) {
    throw new Error("Unauthorized");
  }

  return { user, sessionToken };
}

export function serializeUser(user: NonNullable<UserWithCompany>) {
  const company = user.ownedCompanies[0];
  const preferences = safeJsonParse<{
    mobileProfile?: Record<string, string | null | undefined>;
  }>(user.preferences, {});
  const mobileProfile =
    typeof preferences.mobileProfile === "object" && preferences.mobileProfile
      ? preferences.mobileProfile
      : {};
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.name ||
    user.email;
  const providerSocialMediaLinks = safeJsonParse<Record<string, string>>(
    company?.socialMediaLinks,
    {},
  );
  const providerProfileMeta = readProviderProfileMeta(providerSocialMediaLinks);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    name: fullName,
    role: user.role,
    isVerified: user.verificationStatus !== "pending",
    verificationStatus: user.verificationStatus,
    hasVerifiedBadge: user.hasVerifiedBadge,
    verifiedBadgeExpiresAt: company?.verifiedBadgeExpiresAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    lastActive: user.updatedAt.toISOString(),
    explorerType: user.explorerType ?? undefined,
    companyId: company?.id,
    profile: {
      fullName:
        (typeof mobileProfile.full_name === "string" &&
          mobileProfile.full_name) ||
        fullName,
      phone: user.phone || undefined,
      location: user.nationality || undefined,
      nationality:
        user.nationality ||
        (typeof mobileProfile.nationality === "string"
          ? mobileProfile.nationality
          : undefined),
      title:
        typeof mobileProfile.title === "string"
          ? mobileProfile.title
          : undefined,
      gender:
        typeof mobileProfile.gender === "string"
          ? mobileProfile.gender
          : undefined,
      idType:
        typeof mobileProfile.id_type === "string"
          ? mobileProfile.id_type
          : undefined,
      identityNumber:
        typeof mobileProfile.identity_number === "string"
          ? mobileProfile.identity_number
          : undefined,
      dateOfBirth:
        typeof mobileProfile.date_of_birth === "string"
          ? mobileProfile.date_of_birth
          : undefined,
      explorerType: user.explorerType ?? undefined,
      companyName: company?.companyName,
      tradingName: company?.tradingName,
      legalCompanyName: providerProfileMeta.legalCompanyName ?? undefined,
      incorporationDate: providerProfileMeta.incorporationDate ?? undefined,
      profileImageUrl: providerProfileMeta.profileImageUrl ?? undefined,
      coverImageUrl: providerProfileMeta.coverImageUrl ?? undefined,
      businessRegistrationNumber: company?.businessRegistrationNumber,
      mainContactPerson: company?.mainContactPerson,
      contactPersonPhone: providerProfileMeta.contactPersonPhone ?? undefined,
      contactPersonIdType: providerProfileMeta.contactPersonIdType ?? undefined,
      contactPersonIdNumber:
        providerProfileMeta.contactPersonIdNumber ?? undefined,
      businessPhone: company?.businessPhone,
      businessEmail: company?.businessEmail,
      physicalAddress: company?.physicalAddress,
      websiteUrl: company?.websiteUrl,
      providerTier: company?.providerTier,
      tierStatus: company?.tierStatus,
      tierFeatures: company ? getProviderTierFeatures(company) : [],
      socialMediaLinks: stripProviderProfileMeta(providerSocialMediaLinks),
      servicesOffered: safeJsonParse<string[]>(company?.servicesOffered, []),
      serviceAreas: safeJsonParse<string[]>(company?.serviceAreas, []),
      businessDescription: company?.businessDescription,
      establishedYear: company?.establishedYear?.toString(),
      numberOfEmployees: company?.numberOfEmployees,
      businessCategory: company?.businessCategory,
      operatingHours: company?.operatingHours,
      zimraBpNumber: providerProfileMeta.zimraBpNumber ?? undefined,
      tinNumber: providerProfileMeta.tinNumber ?? undefined,
      taxClearanceExpiresAt:
        providerProfileMeta.taxClearanceExpiresAt ?? undefined,
      businessDocuments:
        company?.documents.map((document) => ({
          type: document.type,
          file: null,
          fileUrl: document.fileUrl,
          status:
            document.status === "verified"
              ? "verified"
              : document.status === "rejected"
                ? "rejected"
                : document.status === "uploaded"
                  ? "uploaded"
                  : "pending",
        })) || [],
      onboardingCompleted:
        company?.onboardingStatus === "submitted" ||
        company?.onboardingStatus === "basic_approved",
      basicReviewSubmitted: !!company?.reviewSubmittedAt,
      basicReviewSubmittedAt: company?.reviewSubmittedAt?.toISOString(),
    },
    verification: {
      email: !!user.emailVerified,
      phone: !!user.phone,
      identity: user.verificationStatus !== "pending",
      business: !!company,
    },
    explorerScore: safeJsonParse(user.explorerScore, {
      rating: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      reviewsReceived: 0,
      lastUpdated: new Date(0).toISOString(),
    }),
  };
}
