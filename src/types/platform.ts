export type ProviderOnboardingStatus =
  | "draft"
  | "submitted"
  | "basic_approved"
  | "changes_requested";

export type ProviderVerificationTier = "basic" | "verified_premium";

export type ProviderTier = "basic" | "premium";

export type ProviderTierStatus =
  | "active"
  | "trialing"
  | "paused"
  | "past_due"
  | "cancelled";

export type ServiceProviderCategoryId =
  | "stays"
  | "events"
  | "things_to_do"
  | "bus"
  | "flight";

export type ProviderListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "approved"
  | "pending"
  | "archived"
  | "rejected";

export type ProviderListingVisibility = "private" | "public";

export interface ProviderDocumentRecord {
  id: string;
  type: string;
  fileName: string;
  fileUrl?: string | null;
  status: string;
  notes?: string | null;
  uploadedAt: string;
  reviewedAt?: string | null;
}

export interface ProviderVerificationReviewRecord {
  id: string;
  reviewType: string;
  status: string;
  notes?: string | null;
  internalSummary?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ProviderRatingReviewRecord {
  id: string;
  rating: number;
  note?: string | null;
  customerName: string;
  customerEmail?: string | null;
  bookingType: string;
  confirmationNumber: string;
  totalAmount: number;
  currency: string;
  guests?: number | null;
  listingTitle?: string | null;
  listingCategory?: string | null;
  listingLocation?: string | null;
  isVerified: boolean;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface ProviderCompanyRecord {
  id: string;
  serviceProviderId?: string | null;
  ownerUserId: string;
  companyName: string;
  tradingName?: string | null;
  businessRegistrationNumber: string;
  mainContactPerson: string;
  businessPhone: string;
  businessEmail: string;
  physicalAddress: string;
  headquartersCity?: string | null;
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
  businessCategory?: string | null;
  businessDescription?: string | null;
  establishedYear?: number | null;
  numberOfEmployees?: string | null;
  operatingHours?: string | null;
  websiteUrl?: string | null;
  socialMediaLinks: Record<string, string>;
  servicesOffered: string[];
  serviceAreas: string[];
  onboardingStatus: ProviderOnboardingStatus;
  verificationTier: ProviderVerificationTier;
  providerTier: ProviderTier;
  tierStatus: ProviderTierStatus | string;
  tierFeatures: string[];
  serviceCategories: ServiceProviderCategoryId[];
  reviewSubmittedAt?: string | null;
  basicApprovedAt?: string | null;
  verifiedBadgeExpiresAt?: string | null;
  documents: ProviderDocumentRecord[];
  verificationReviews: ProviderVerificationReviewRecord[];
  listingStats?: {
    total: number;
    active: number;
    pending: number;
  };
  bookingStats?: {
    total: number;
    pending: number;
    disputed: number;
  };
  ratingStats?: {
    average: number;
    reviewCount: number;
    distribution?: Record<1 | 2 | 3 | 4 | 5, number>;
    withComments?: number;
    verifiedCount?: number;
    latestReviewAt?: string | null;
    reviews?: ProviderRatingReviewRecord[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ListingAvailabilityRecord {
  id: string;
  startDate: string;
  endDate: string;
  unitsAvailable?: number | null;
  status: string;
  notes?: string | null;
}

export interface AdminListingBookingRecord {
  id: string;
  confirmationNumber: string;
  status: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  totalAmount: number;
  currency: string;
}

export interface ProviderListingRecord {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  category: string;
  listingType: string;
  shortDescription?: string | null;
  description: string;
  location: string;
  pricingModel: string;
  basePrice?: number | null;
  currency: string;
  instantBooking: boolean;
  bookingMode: string;
  status: ProviderListingStatus;
  visibility: ProviderListingVisibility;
  capacity?: number | null;
  pickupLeadTimeHours?: number | null;
  images: string[];
  tags: string[];
  amenities: string[];
  policies: Record<string, unknown>;
  metadata: Record<string, unknown>;
  destinationId?: string | null;
  destinationName?: string | null;
  destinationLocation?: string | null;
  requiresDestination: boolean;
  hasDestinationAssignment: boolean;
  availability: ListingAvailabilityRecord[];
  bookingsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicListingRecord extends ProviderListingRecord {
  provider: {
    id: string;
    companyName: string;
    tradingName?: string | null;
    location: string;
    verificationTier: ProviderVerificationTier;
    hasVerifiedBadge: boolean;
  };
}

export interface ProviderOrderRecord {
  id: string;
  listingId?: string | null;
  providerId?: string | null;
  bookingType: string;
  status: string;
  totalAmount: number;
  currency: string;
  confirmationNumber: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  specialRequests?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  listing?: {
    id: string;
    title: string;
    category: string;
    location: string;
  } | null;
  paymentStatus: string;
  disputesCount: number;
}

export interface ExplorerBookingRecord {
  id: string;
  confirmationNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  bookingType: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  specialRequests?: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: {
    id: string;
    slug: string;
    title: string;
    category: string;
    location: string;
  } | null;
  provider?: {
    id: string;
    companyName: string;
    verificationTier: ProviderVerificationTier;
  } | null;
  paymentStatus: string;
  disputesCount?: number;
}

export interface AdminBookingRecord {
  id: string;
  confirmationNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  bookingType: string;
  guests?: number | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  provider?: {
    id: string;
    companyName: string;
    verificationTier: ProviderVerificationTier;
  } | null;
  listing?: {
    id: string;
    slug: string;
    title: string;
    category: string;
    location: string;
  } | null;
  disputesCount: number;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  verificationStatus: string;
  hasVerifiedBadge: boolean;
  emailVerified?: string | null;
  phone?: string | null;
  nationality?: string | null;
  createdAt: string;
  updatedAt: string;
  bookingCount: number;
  providerCompanyCount: number;
  disputeCount: number;
}

export interface AdminListingRecord {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  category: string;
  listingType: string;
  shortDescription?: string | null;
  description: string;
  location: string;
  pricingModel: string;
  basePrice?: number | null;
  currency: string;
  instantBooking: boolean;
  bookingMode: string;
  status: ProviderListingStatus;
  visibility: ProviderListingVisibility;
  capacity?: number | null;
  pickupLeadTimeHours?: number | null;
  images: string[];
  tags: string[];
  amenities: string[];
  policies: Record<string, unknown>;
  metadata: Record<string, unknown>;
  destinationId?: string | null;
  destinationName?: string | null;
  destinationLocation?: string | null;
  requiresDestination: boolean;
  hasDestinationAssignment: boolean;
  availability: ListingAvailabilityRecord[];
  bookingCalendar: AdminListingBookingRecord[];
  availabilityCount: number;
  bookingsCount: number;
  disputesCount: number;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    companyName: string;
    verificationTier: ProviderVerificationTier;
    onboardingStatus: ProviderOnboardingStatus;
  };
}

export interface DisputeRecord {
  id: string;
  bookingId: string;
  bookingConfirmationNumber: string;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  companyId?: string | null;
  reason: string;
  details?: string | null;
  status: string;
  resolution?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  openedBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
  listing?: {
    id: string;
    slug: string;
    title: string;
  } | null;
  provider?: {
    id: string;
    companyName: string;
    verificationTier: ProviderVerificationTier;
  } | null;
}
