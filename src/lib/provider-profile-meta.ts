export interface ProviderProfileMeta {
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  legalCompanyName?: string | null;
  incorporationDate?: string | null;
  contactPersonPhone?: string | null;
  contactPersonIdType?: string | null;
  contactPersonIdNumber?: string | null;
  zimraBpNumber?: string | null;
  tinNumber?: string | null;
  taxClearanceExpiresAt?: string | null;
  galleryEnabled?: boolean | null;
  premiumUpgradeStatus?: "none" | "pending" | "approved" | "rejected" | null;
  premiumUpgradeRequestedAt?: string | null;
  tierChangeRequestedTier?: "basic" | "premium" | null;
  pendingReviewSections?: string[];
  payoutSettings?: Record<string, unknown> | null;
}

const META_KEYS = {
  profileImageUrl: "__off2zim_profileImageUrl",
  coverImageUrl: "__off2zim_coverImageUrl",
  legalCompanyName: "__off2zim_legalCompanyName",
  incorporationDate: "__off2zim_incorporationDate",
  contactPersonPhone: "__off2zim_contactPersonPhone",
  contactPersonIdType: "__off2zim_contactPersonIdType",
  contactPersonIdNumber: "__off2zim_contactPersonIdNumber",
  zimraBpNumber: "__off2zim_zimraBpNumber",
  tinNumber: "__off2zim_tinNumber",
  taxClearanceExpiresAt: "__off2zim_taxClearanceExpiresAt",
  galleryEnabled: "__off2zim_galleryEnabled",
  premiumUpgradeStatus: "__off2zim_premiumUpgradeStatus",
  premiumUpgradeRequestedAt: "__off2zim_premiumUpgradeRequestedAt",
  tierChangeRequestedTier: "__off2zim_tierChangeRequestedTier",
  pendingReviewSections: "__off2zim_pendingReviewSections",
  payoutSettings: "__off2zim_payoutSettings",
} satisfies Record<keyof ProviderProfileMeta, string>;

function cleanValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function cleanBooleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function cleanPayoutSettings(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function cleanStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function readProviderProfileMeta(
  socialMediaLinks: Record<string, string>,
): ProviderProfileMeta {
  return {
    profileImageUrl: cleanValue(socialMediaLinks[META_KEYS.profileImageUrl]),
    coverImageUrl: cleanValue(socialMediaLinks[META_KEYS.coverImageUrl]),
    legalCompanyName: cleanValue(socialMediaLinks[META_KEYS.legalCompanyName]),
    incorporationDate: cleanValue(
      socialMediaLinks[META_KEYS.incorporationDate],
    ),
    contactPersonPhone: cleanValue(
      socialMediaLinks[META_KEYS.contactPersonPhone],
    ),
    contactPersonIdType: cleanValue(
      socialMediaLinks[META_KEYS.contactPersonIdType],
    ),
    contactPersonIdNumber: cleanValue(
      socialMediaLinks[META_KEYS.contactPersonIdNumber],
    ),
    zimraBpNumber: cleanValue(socialMediaLinks[META_KEYS.zimraBpNumber]),
    tinNumber: cleanValue(socialMediaLinks[META_KEYS.tinNumber]),
    taxClearanceExpiresAt: cleanValue(
      socialMediaLinks[META_KEYS.taxClearanceExpiresAt],
    ),
    galleryEnabled: cleanBooleanValue(
      socialMediaLinks[META_KEYS.galleryEnabled],
    ),
    premiumUpgradeStatus: cleanValue(
      socialMediaLinks[META_KEYS.premiumUpgradeStatus],
    ) as ProviderProfileMeta["premiumUpgradeStatus"],
    premiumUpgradeRequestedAt: cleanValue(
      socialMediaLinks[META_KEYS.premiumUpgradeRequestedAt],
    ),
    tierChangeRequestedTier: cleanValue(
      socialMediaLinks[META_KEYS.tierChangeRequestedTier],
    ) as ProviderProfileMeta["tierChangeRequestedTier"],
    pendingReviewSections: cleanStringArray(
      socialMediaLinks[META_KEYS.pendingReviewSections],
    ),
    payoutSettings: cleanPayoutSettings(
      socialMediaLinks[META_KEYS.payoutSettings],
    ),
  };
}

export function stripProviderProfileMeta(
  socialMediaLinks: Record<string, string>,
) {
  const reservedKeys = new Set(Object.values(META_KEYS));

  return Object.fromEntries(
    Object.entries(socialMediaLinks).filter(([key]) => !reservedKeys.has(key)),
  );
}

export function mergeProviderProfileMeta(
  socialMediaLinks: Record<string, string>,
  meta: ProviderProfileMeta,
) {
  const next = { ...stripProviderProfileMeta(socialMediaLinks) };

  Object.entries(META_KEYS).forEach(([field, key]) => {
    const rawValue = meta[field as keyof ProviderProfileMeta];
    if (field === "galleryEnabled") {
      if (typeof rawValue === "boolean") {
        next[key] = String(rawValue);
      }
      return;
    }

    if (field === "payoutSettings") {
      const value = cleanPayoutSettings(rawValue);
      if (value && Object.keys(value).length > 0) {
        next[key] = JSON.stringify(value);
      }
      return;
    }

    if (field === "pendingReviewSections") {
      const values = cleanStringArray(rawValue);
      if (values.length > 0) {
        next[key] = JSON.stringify(values);
      }
      return;
    }

    const value = cleanValue(rawValue);
    if (value) {
      next[key] = value;
    }
  });

  return next;
}
