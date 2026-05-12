import type {
  ListingAvailability,
  ProviderCompany,
  ProviderDocument,
  ProviderListing,
  ProviderVerificationReview,
  Booking,
  Dispute,
  User,
} from "@prisma/client";
import type {
  ProviderCompanyRecord,
  ProviderListingRecord,
  ProviderOrderRecord,
  PublicListingRecord,
  ExplorerBookingRecord,
  AdminBookingRecord,
  AdminListingRecord,
  DisputeRecord,
} from "@/types/platform";
import {
  getListingDestinationMetadata,
  listingRequiresDestination,
} from "@/lib/listing-destination-rules";

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

type CompanyWithRelations = ProviderCompany & {
  documents: ProviderDocument[];
  verificationReviews: (ProviderVerificationReview & {
    reviewedBy: User | null;
  })[];
  listings?: (ProviderListing & { bookings: Booking[] })[];
  bookings?: (Booking & { disputes: Dispute[] })[];
};

type ListingWithRelations = ProviderListing & {
  availability: ListingAvailability[];
  bookings?: Booking[];
};

type BookingWithRelations = Booking & {
  user: User;
  listing: ProviderListing | null;
  disputes: Dispute[];
  payments?: { status: string }[];
};

export function serializeCompany(
  company: CompanyWithRelations
): ProviderCompanyRecord {
  const listingStats = company.listings
    ? {
        total: company.listings.length,
        active: company.listings.filter((listing) => listing.status === "active")
          .length,
        pending: company.listings.filter(
          (listing) => listing.status === "pending_review"
        ).length,
      }
    : undefined;

  const bookingStats = company.bookings
    ? {
        total: company.bookings.length,
        pending: company.bookings.filter((booking) =>
          ["PENDING", "REQUESTED"].includes(booking.status)
        ).length,
        disputed: company.bookings.filter((booking) => booking.disputes.length > 0)
          .length,
      }
    : undefined;

  return {
    id: company.id,
    ownerUserId: company.ownerUserId,
    companyName: company.companyName,
    tradingName: company.tradingName,
    businessRegistrationNumber: company.businessRegistrationNumber,
    mainContactPerson: company.mainContactPerson,
    businessPhone: company.businessPhone,
    businessEmail: company.businessEmail,
    physicalAddress: company.physicalAddress,
    headquartersCity: company.headquartersCity,
    businessCategory: company.businessCategory,
    businessDescription: company.businessDescription,
    establishedYear: company.establishedYear,
    numberOfEmployees: company.numberOfEmployees,
    operatingHours: company.operatingHours,
    websiteUrl: company.websiteUrl,
    socialMediaLinks: safeJsonParse(company.socialMediaLinks, {}),
    servicesOffered: safeJsonParse(company.servicesOffered, []),
    serviceAreas: safeJsonParse(company.serviceAreas, []),
    onboardingStatus:
      company.onboardingStatus as ProviderCompanyRecord["onboardingStatus"],
    verificationTier:
      company.verificationTier as ProviderCompanyRecord["verificationTier"],
    reviewSubmittedAt: company.reviewSubmittedAt?.toISOString() ?? null,
    basicApprovedAt: company.basicApprovedAt?.toISOString() ?? null,
    verifiedBadgeExpiresAt:
      company.verifiedBadgeExpiresAt?.toISOString() ?? null,
    documents: company.documents.map((document) => ({
      id: document.id,
      type: document.type,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      status: document.status,
      notes: document.notes,
      uploadedAt: document.uploadedAt.toISOString(),
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
    })),
    verificationReviews: company.verificationReviews.map((review) => ({
      id: review.id,
      reviewType: review.reviewType,
      status: review.status,
      notes: review.notes,
      internalSummary: review.internalSummary,
      createdAt: review.createdAt.toISOString(),
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      reviewedBy: review.reviewedBy
        ? {
            id: review.reviewedBy.id,
            name:
              [review.reviewedBy.firstName, review.reviewedBy.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || review.reviewedBy.email,
            email: review.reviewedBy.email,
          }
        : null,
    })),
    listingStats,
    bookingStats,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

export function serializeListing(
  listing: ListingWithRelations
): ProviderListingRecord {
  const metadata = safeJsonParse<Record<string, unknown>>(listing.metadata, {});
  const destination = getListingDestinationMetadata(metadata);
  const requiresDestination = listingRequiresDestination(listing.category);

  return {
    id: listing.id,
    companyId: listing.companyId,
    title: listing.title,
    slug: listing.slug,
    category: listing.category,
    listingType: listing.listingType,
    shortDescription: listing.shortDescription,
    description: listing.description,
    location: listing.location,
    pricingModel: listing.pricingModel,
    basePrice: listing.basePrice,
    currency: listing.currency,
    instantBooking: listing.instantBooking,
    bookingMode: listing.bookingMode,
    status: listing.status as ProviderListingRecord["status"],
    visibility: listing.visibility as ProviderListingRecord["visibility"],
    capacity: listing.capacity,
    pickupLeadTimeHours: listing.pickupLeadTimeHours,
    images: safeJsonParse(listing.images, []),
    tags: safeJsonParse(listing.tags, []),
    amenities: safeJsonParse(listing.amenities, []),
    policies: safeJsonParse(listing.policies, {}),
    metadata,
    destinationId: destination.destinationId ?? null,
    destinationName: destination.destinationName ?? null,
    destinationLocation: destination.destinationLocation ?? null,
    requiresDestination,
    hasDestinationAssignment: !requiresDestination || !!destination.destinationId,
    availability: listing.availability.map((slot) => ({
      id: slot.id,
      startDate: slot.startDate.toISOString(),
      endDate: slot.endDate.toISOString(),
      unitsAvailable: slot.unitsAvailable,
      status: slot.status,
      notes: slot.notes,
    })),
    bookingsCount: listing.bookings?.length ?? 0,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

export function serializePublicListing(
  listing: ListingWithRelations & {
    company: ProviderCompany;
    companyOwner?: User | null;
  }
): PublicListingRecord {
  const base = serializeListing(listing);

  return {
    ...base,
    provider: {
      id: listing.company.id,
      companyName: listing.company.companyName,
      tradingName: listing.company.tradingName,
      location:
        listing.company.headquartersCity ||
        listing.company.physicalAddress ||
        listing.location,
      verificationTier:
        listing.company.verificationTier as PublicListingRecord["provider"]["verificationTier"],
      hasVerifiedBadge: listing.company.verificationTier === "verified_premium",
    },
  };
}

export function serializeOrder(order: BookingWithRelations): ProviderOrderRecord {
  return {
    id: order.id,
    listingId: order.listingId,
    providerId: order.providerId,
    bookingType: order.bookingType,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    confirmationNumber: order.confirmationNumber,
    checkIn: order.checkIn?.toISOString() ?? null,
    checkOut: order.checkOut?.toISOString() ?? null,
    guests: order.guests,
    specialRequests: order.specialRequests,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customer: {
      id: order.user.id,
      name:
        [order.user.firstName, order.user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || order.user.name || order.user.email,
      email: order.user.email,
    },
    listing: order.listing
      ? {
          id: order.listing.id,
          title: order.listing.title,
          category: order.listing.category,
          location: order.listing.location,
        }
      : null,
    paymentStatus: order.payments?.[0]?.status || "PENDING",
    disputesCount: order.disputes.length,
  };
}

export function serializeExplorerBooking(
  booking: Booking & {
    listing: ProviderListing | null;
    provider: ProviderCompany | null;
    payments: { status: string }[];
    disputes?: Dispute[];
  }
): ExplorerBookingRecord {
  return {
    id: booking.id,
    confirmationNumber: booking.confirmationNumber,
    status: booking.status,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    bookingType: booking.bookingType,
    checkIn: booking.checkIn?.toISOString() ?? null,
    checkOut: booking.checkOut?.toISOString() ?? null,
    guests: booking.guests,
    specialRequests: booking.specialRequests,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    listing: booking.listing
      ? {
          id: booking.listing.id,
          slug: booking.listing.slug,
          title: booking.listing.title,
          category: booking.listing.category,
          location: booking.listing.location,
        }
      : null,
    provider: booking.provider
      ? {
          id: booking.provider.id,
          companyName: booking.provider.companyName,
          verificationTier:
            booking.provider.verificationTier as NonNullable<
              ExplorerBookingRecord["provider"]
            >["verificationTier"],
        }
      : null,
    paymentStatus: booking.payments[0]?.status || "PENDING",
    disputesCount: booking.disputes?.length || 0,
  };
}

export function serializeAdminBooking(
  booking: Booking & {
    user: User;
    listing: ProviderListing | null;
    provider: ProviderCompany | null;
    payments: { status: string }[];
    disputes: Dispute[];
  }
): AdminBookingRecord {
  return {
    id: booking.id,
    confirmationNumber: booking.confirmationNumber,
    status: booking.status,
    paymentStatus: booking.payments[0]?.status || "PENDING",
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    bookingType: booking.bookingType,
    guests: booking.guests,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    customer: {
      id: booking.user.id,
      name:
        [booking.user.firstName, booking.user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || booking.user.name || booking.user.email,
      email: booking.user.email,
    },
    provider: booking.provider
      ? {
          id: booking.provider.id,
          companyName: booking.provider.companyName,
          verificationTier:
            booking.provider.verificationTier as NonNullable<
              AdminBookingRecord["provider"]
            >["verificationTier"],
        }
      : null,
    listing: booking.listing
      ? {
          id: booking.listing.id,
          slug: booking.listing.slug,
          title: booking.listing.title,
          category: booking.listing.category,
          location: booking.listing.location,
        }
      : null,
    disputesCount: booking.disputes.length,
  };
}

export function serializeAdminListing(
  listing: ProviderListing & {
    company: ProviderCompany;
    availability: ListingAvailability[];
    bookings: (Booking & { disputes: Dispute[] })[];
  }
): AdminListingRecord {
  const metadata = safeJsonParse<Record<string, unknown>>(listing.metadata, {});
  const destination = getListingDestinationMetadata(metadata);
  const requiresDestination = listingRequiresDestination(listing.category);

  return {
    id: listing.id,
    companyId: listing.companyId,
    title: listing.title,
    slug: listing.slug,
    category: listing.category,
    listingType: listing.listingType,
    location: listing.location,
    pricingModel: listing.pricingModel,
    basePrice: listing.basePrice,
    currency: listing.currency,
    instantBooking: listing.instantBooking,
    bookingMode: listing.bookingMode,
    status: listing.status as AdminListingRecord["status"],
    visibility: listing.visibility as AdminListingRecord["visibility"],
    capacity: listing.capacity,
    destinationId: destination.destinationId ?? null,
    destinationName: destination.destinationName ?? null,
    destinationLocation: destination.destinationLocation ?? null,
    requiresDestination,
    hasDestinationAssignment: !requiresDestination || !!destination.destinationId,
    availabilityCount: listing.availability.length,
    bookingsCount: listing.bookings.length,
    disputesCount: listing.bookings.reduce(
      (total, booking) => total + booking.disputes.length,
      0
    ),
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    provider: {
      id: listing.company.id,
      companyName: listing.company.companyName,
      verificationTier:
        listing.company.verificationTier as AdminListingRecord["provider"]["verificationTier"],
      onboardingStatus:
        listing.company.onboardingStatus as AdminListingRecord["provider"]["onboardingStatus"],
    },
  };
}

export function serializeDispute(
  dispute: Dispute & {
    booking: Booking & {
      listing: ProviderListing | null;
      provider: ProviderCompany | null;
      payments?: { status: string; createdAt: Date }[];
    };
    openedBy: User;
    assignedAdmin: User | null;
  }
): DisputeRecord {
  return {
    id: dispute.id,
    bookingId: dispute.bookingId,
    bookingConfirmationNumber: dispute.booking.confirmationNumber,
    bookingStatus: dispute.booking.status,
    paymentStatus: dispute.booking.payments?.[0]?.status || "PENDING",
    totalAmount: dispute.booking.totalAmount,
    currency: dispute.booking.currency,
    companyId: dispute.companyId,
    reason: dispute.reason,
    details: dispute.details,
    status: dispute.status,
    resolution: dispute.resolution,
    createdAt: dispute.createdAt.toISOString(),
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    openedBy: {
      id: dispute.openedBy.id,
      name:
        [dispute.openedBy.firstName, dispute.openedBy.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || dispute.openedBy.name || dispute.openedBy.email,
      email: dispute.openedBy.email,
    },
    assignedAdmin: dispute.assignedAdmin
      ? {
          id: dispute.assignedAdmin.id,
          name:
            [dispute.assignedAdmin.firstName, dispute.assignedAdmin.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            dispute.assignedAdmin.name ||
            dispute.assignedAdmin.email,
          email: dispute.assignedAdmin.email,
        }
      : null,
    listing: dispute.booking.listing
      ? {
          id: dispute.booking.listing.id,
          slug: dispute.booking.listing.slug,
          title: dispute.booking.listing.title,
        }
      : null,
    provider: dispute.booking.provider
      ? {
          id: dispute.booking.provider.id,
          companyName: dispute.booking.provider.companyName,
          verificationTier:
            dispute.booking.provider.verificationTier as NonNullable<
              DisputeRecord["provider"]
            >["verificationTier"],
        }
      : null,
  };
}
