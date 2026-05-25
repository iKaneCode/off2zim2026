export interface ProviderProfileMeta {
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  legalCompanyName?: string | null;
  incorporationDate?: string | null;
  contactPersonPhone?: string | null;
  zimraBpNumber?: string | null;
  tinNumber?: string | null;
  taxClearanceExpiresAt?: string | null;
}

const META_KEYS = {
  profileImageUrl: "__off2zim_profileImageUrl",
  coverImageUrl: "__off2zim_coverImageUrl",
  legalCompanyName: "__off2zim_legalCompanyName",
  incorporationDate: "__off2zim_incorporationDate",
  contactPersonPhone: "__off2zim_contactPersonPhone",
  zimraBpNumber: "__off2zim_zimraBpNumber",
  tinNumber: "__off2zim_tinNumber",
  taxClearanceExpiresAt: "__off2zim_taxClearanceExpiresAt",
} satisfies Record<keyof ProviderProfileMeta, string>;

function cleanValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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
    zimraBpNumber: cleanValue(socialMediaLinks[META_KEYS.zimraBpNumber]),
    tinNumber: cleanValue(socialMediaLinks[META_KEYS.tinNumber]),
    taxClearanceExpiresAt: cleanValue(
      socialMediaLinks[META_KEYS.taxClearanceExpiresAt],
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
    const value = cleanValue(meta[field as keyof ProviderProfileMeta]);
    if (value) {
      next[key] = value;
    }
  });

  return next;
}
