import { prisma } from "@/lib/prisma";
import { ensureServiceProviderIds } from "@/lib/provider-company-ids";
import {
  getProviderListingDisplayId,
  getServiceProviderDisplayId,
  normalizeServiceProviderId,
} from "@/lib/service-provider-id";

export const LISTING_DISPLAY_ID_METADATA_KEY = "listingDisplayId";
export const LISTING_SEQUENCE_METADATA_KEY = "listingSequence";

type ListingDisplayMetadata = Record<string, unknown> | null | undefined;

function parseMetadata(value: string | null | undefined) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getStoredListingDisplayId(
  metadata: ListingDisplayMetadata,
): string {
  const value =
    metadata?.[LISTING_DISPLAY_ID_METADATA_KEY] ??
    metadata?.displayListingId ??
    metadata?.publicListingId;

  return typeof value === "string" ? value : "";
}

export function withListingDisplayMetadata(
  metadata: Record<string, unknown>,
  displayId: string,
  sequence: number,
) {
  return {
    ...metadata,
    [LISTING_DISPLAY_ID_METADATA_KEY]: displayId,
    [LISTING_SEQUENCE_METADATA_KEY]: sequence,
  };
}

async function ensureCompanyServiceProviderId(company: {
  id: string;
  serviceProviderId?: string | null;
}) {
  if (normalizeServiceProviderId(company.serviceProviderId)) {
    return getServiceProviderDisplayId(company);
  }

  const dbCompany = await prisma.providerCompany.findUnique({
    where: { id: company.id },
    select: { id: true, createdAt: true, serviceProviderId: true },
  });

  if (!dbCompany) {
    return getServiceProviderDisplayId(company);
  }

  const [ensuredCompany] = await ensureServiceProviderIds([dbCompany]);
  return getServiceProviderDisplayId(ensuredCompany);
}

export async function getNextListingDisplayIdentity(company: {
  id: string;
  serviceProviderId?: string | null;
}) {
  const [currentListingsCount, createdLogsCount] = await Promise.all([
    prisma.providerListing.count({ where: { companyId: company.id } }),
    prisma.adminAuditLog.count({
      where: {
        companyId: company.id,
        targetType: "provider_listing",
        action: "provider_listing_created",
      },
    }),
  ]);
  const sequence = Math.max(currentListingsCount, createdLogsCount) + 1;
  const serviceProviderId = await ensureCompanyServiceProviderId(company);

  return {
    sequence,
    serviceProviderId,
    displayId: getProviderListingDisplayId(serviceProviderId, sequence),
  };
}

export async function resolveListingDisplayId(listingId?: string | null) {
  if (!listingId) return "";
  const result = await resolveListingDisplayIds([listingId]);
  return result.get(listingId) || "";
}

export async function resolveListingDisplayIds(listingIds: string[]) {
  const uniqueListingIds = [...new Set(listingIds.filter(Boolean))];
  const displayIds = new Map<string, string>();
  if (uniqueListingIds.length === 0) return displayIds;

  const listings = await prisma.providerListing.findMany({
    where: { id: { in: uniqueListingIds } },
    select: {
      id: true,
      companyId: true,
      createdAt: true,
      metadata: true,
      company: {
        select: {
          id: true,
          createdAt: true,
          serviceProviderId: true,
        },
      },
    },
  });

  const companyIds = [...new Set(listings.map((listing) => listing.companyId))];
  const companyListings = await prisma.providerListing.findMany({
    where: { companyId: { in: companyIds } },
    select: {
      id: true,
      companyId: true,
      createdAt: true,
      metadata: true,
      company: {
        select: {
          id: true,
          createdAt: true,
          serviceProviderId: true,
        },
      },
    },
    orderBy: [{ companyId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const ensuredCompanies = await ensureServiceProviderIds([
    ...new Map(
      companyListings.map((listing) => [listing.company.id, listing.company]),
    ).values(),
  ]);
  const serviceProviderIdsByCompanyId = new Map(
    ensuredCompanies.map((company) => [
      company.id,
      getServiceProviderDisplayId(company),
    ]),
  );
  const sequencesByCompany = new Map<string, number>();
  companyListings.forEach((listing) => {
    const nextSequence = (sequencesByCompany.get(listing.companyId) ?? 0) + 1;
    sequencesByCompany.set(listing.companyId, nextSequence);

    const metadata = parseMetadata(listing.metadata);
    const storedDisplayId = getStoredListingDisplayId(metadata);
    if (storedDisplayId) {
      displayIds.set(listing.id, storedDisplayId);
      return;
    }

    const serviceProviderId =
      serviceProviderIdsByCompanyId.get(listing.companyId) ||
      getServiceProviderDisplayId(listing.company);
    displayIds.set(
      listing.id,
      getProviderListingDisplayId(serviceProviderId, nextSequence),
    );
  });

  return displayIds;
}
