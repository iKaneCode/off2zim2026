export type ProviderTier = "basic" | "premium";

export type ProviderFeature =
  | "profile_content"
  | "gallery_management"
  | "listing_management"
  | "calendar_management"
  | "basic_analytics"
  | "push_campaigns"
  | "advanced_analytics"
  | "premium_android_app";

export type ReviewStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "sent"
  | "archived";

export const REVIEW_STATUSES: ReviewStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "scheduled",
  "sent",
  "archived",
];

export const PROVIDER_TIER_DEFINITIONS: Record<
  ProviderTier,
  { label: string; features: ProviderFeature[] }
> = {
  basic: {
    label: "Basic",
    features: [
      "profile_content",
      "listing_management",
      "calendar_management",
      "basic_analytics",
    ],
  },
  premium: {
    label: "Premium",
    features: [
      "profile_content",
      "gallery_management",
      "listing_management",
      "calendar_management",
      "basic_analytics",
      "push_campaigns",
      "advanced_analytics",
      "premium_android_app",
    ],
  },
};

export class ProviderFeatureError extends Error {
  status = 403;

  constructor(feature: ProviderFeature) {
    super(`This provider tier does not include ${feature.replace(/_/g, " ")}.`);
    this.name = "ProviderFeatureError";
  }
}

export function normalizeProviderTier(
  tier: string | null | undefined,
): ProviderTier {
  return tier === "premium" ? "premium" : "basic";
}

export function getProviderTierFeatures(company: {
  providerTier?: string | null;
  tierStatus?: string | null;
}) {
  if (company.tierStatus && company.tierStatus !== "active") {
    return PROVIDER_TIER_DEFINITIONS.basic.features;
  }

  return PROVIDER_TIER_DEFINITIONS[normalizeProviderTier(company.providerTier)]
    .features;
}

export function providerHasFeature(
  company: { providerTier?: string | null; tierStatus?: string | null },
  feature: ProviderFeature,
) {
  return getProviderTierFeatures(company).includes(feature);
}

export function assertProviderFeature(
  company: { providerTier?: string | null; tierStatus?: string | null },
  feature: ProviderFeature,
) {
  if (!providerHasFeature(company, feature)) {
    throw new ProviderFeatureError(feature);
  }
}

export function safeJsonParse<T>(
  value: string | null | undefined,
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toJsonRecord(value: Record<string, unknown> | undefined) {
  return JSON.stringify(value ?? {});
}

export function toOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeReviewStatus(
  status: string | null | undefined,
  fallback: ReviewStatus = "pending_review",
): ReviewStatus {
  return REVIEW_STATUSES.includes(status as ReviewStatus)
    ? (status as ReviewStatus)
    : fallback;
}
