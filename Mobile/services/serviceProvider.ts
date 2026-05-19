import { apiFetch } from '../lib/api';

type ProviderCompanyRecord = {
  id: string;
  ownerUserId: string;
  companyName: string;
  tradingName?: string | null;
  businessRegistrationNumber: string;
  mainContactPerson: string;
  businessPhone: string;
  businessEmail: string;
  physicalAddress: string;
  headquartersCity?: string | null;
  businessCategory?: string | null;
  businessDescription?: string | null;
  websiteUrl?: string | null;
  serviceAreas: string[];
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    fileUrl?: string | null;
    status: string;
    notes?: string | null;
  }>;
  verificationReviews: Array<{
    id: string;
    status: string;
    notes?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
  }>;
  onboardingStatus: 'draft' | 'submitted' | 'basic_approved' | 'changes_requested';
  verificationTier: 'basic' | 'verified_premium';
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
  reviewSubmittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProviderListingRecord = {
  id: string;
  title: string;
  category: string;
  listingType: string;
  shortDescription?: string | null;
  description: string;
  location: string;
  basePrice?: number | null;
  currency: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'archived';
  visibility: 'private' | 'public';
  images: string[];
  createdAt: string;
  updatedAt: string;
};

type ProviderOrderRecord = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    category: string;
    location: string;
  } | null;
};

type ServiceError = {
  message: string;
};

type ServiceResult<T> = {
  data: T;
  error: ServiceError | null;
};

type ProviderReviewStatus = 'pending' | 'under_review' | 'verified' | 'rejected';

type ProviderBusinessType =
  | 'hotel'
  | 'lodge'
  | 'tour_operator'
  | 'restaurant'
  | 'transport'
  | 'activity_provider'
  | 'other';

type ProviderSubscriptionTier = 'basic' | 'premium' | 'enterprise';

type NotificationPreferences = {
  email: boolean;
  sms: boolean;
};

type VerificationDocumentDraft = {
  type: string;
  fileName: string;
  fileUrl: string;
  status: string;
  notes?: string | null;
};

const pendingDocumentUploads = new Map<string, VerificationDocumentDraft>();

export interface ServiceProvider {
  id: string;
  user_id: string;
  business_name: string;
  business_type: ProviderBusinessType;
  business_registration_number?: string;
  tax_number?: string;
  contact_person_name: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  country: string;
  description?: string;
  logo_url?: string;
  images?: string[];
  verification_status: ProviderReviewStatus;
  verification_documents?: string[];
  verification_notes?: string;
  verified_at?: string;
  verified_by?: string;
  status: 'active' | 'suspended' | 'inactive';
  subscription_tier: ProviderSubscriptionTier;
  auto_approve_content: boolean;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface ContentReview {
  id: string;
  content_type: 'destination' | 'stay' | 'event' | 'provider';
  content_id: string;
  provider_id: string;
  reviewer_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  review_notes?: string;
  changes_requested?: string;
  reviewed_at?: string;
  submitted_by: string;
  submission_notes?: string;
  created_at: string;
}

function toError(error: unknown): ServiceError {
  return {
    message: error instanceof Error ? error.message : 'Request failed',
  };
}

function success<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

function failure<T>(data: T, error: unknown): ServiceResult<T> {
  return { data, error: toError(error) };
}

function normalizeBusinessType(category?: string | null): ProviderBusinessType {
  const value = (category || '').toLowerCase().replace(/\s+/g, '_');
  switch (value) {
    case 'hotel':
    case 'lodge':
    case 'tour_operator':
    case 'restaurant':
    case 'transport':
    case 'activity_provider':
    case 'other':
      return value;
    default:
      return 'other';
  }
}

function normalizeVerificationStatus(
  company: ProviderCompanyRecord
): ProviderReviewStatus {
  if (company.verificationTier === 'verified_premium') {
    return 'verified';
  }

  if (company.onboardingStatus === 'basic_approved') {
    return 'verified';
  }

  if (company.onboardingStatus === 'submitted') {
    return 'under_review';
  }

  if (company.onboardingStatus === 'changes_requested') {
    return 'rejected';
  }

  return 'pending';
}

function toServiceProvider(company: ProviderCompanyRecord): ServiceProvider {
  const latestReview = company.verificationReviews[0];
  return {
    id: company.id,
    user_id: company.ownerUserId,
    business_name: company.companyName,
    business_type: normalizeBusinessType(company.businessCategory),
    business_registration_number: company.businessRegistrationNumber,
    contact_person_name: company.mainContactPerson,
    email: company.businessEmail,
    phone: company.businessPhone,
    website: company.websiteUrl || undefined,
    address: company.physicalAddress,
    city: company.headquartersCity || '',
    country: 'Zimbabwe',
    description: company.businessDescription || undefined,
    verification_status: normalizeVerificationStatus(company),
    verification_documents: company.documents
      .map(document => document.fileUrl)
      .filter((value): value is string => Boolean(value)),
    verification_notes: latestReview?.notes || undefined,
    verified_at: latestReview?.reviewedAt || undefined,
    status: 'active',
    subscription_tier:
      company.verificationTier === 'verified_premium' ? 'premium' : 'basic',
    auto_approve_content: false,
    notification_preferences: {
      email: true,
      sms: false,
    },
    created_at: company.createdAt,
    updated_at: company.updatedAt,
  };
}

function buildCompanyPayload(
  updates: Partial<ServiceProvider>,
  existing?: ProviderCompanyRecord,
  documents?: VerificationDocumentDraft[]
) {
  const mergedDocuments =
    documents ||
    existing?.documents.map(document => ({
      type: document.type,
      fileName: document.fileName,
      fileUrl: document.fileUrl || '',
      status: document.status,
      notes: document.notes || null,
    })) ||
    [];

  return {
    companyName: updates.business_name || existing?.companyName || '',
    tradingName: existing?.tradingName || updates.business_name || '',
    businessRegistrationNumber:
      updates.business_registration_number ||
      existing?.businessRegistrationNumber ||
      'PENDING',
    mainContactPerson:
      updates.contact_person_name || existing?.mainContactPerson || '',
    businessPhone: updates.phone || existing?.businessPhone || '',
    businessEmail: updates.email || existing?.businessEmail || '',
    physicalAddress: updates.address || existing?.physicalAddress || '',
    headquartersCity: updates.city || existing?.headquartersCity || '',
    businessCategory:
      updates.business_type || existing?.businessCategory || 'other',
    businessDescription:
      updates.description ?? existing?.businessDescription ?? '',
    establishedYear: null,
    numberOfEmployees: null,
    operatingHours: null,
    websiteUrl: updates.website ?? existing?.websiteUrl ?? '',
    socialMediaLinks: {},
    servicesOffered: [],
    serviceAreas:
      existing?.serviceAreas.length
        ? existing.serviceAreas
        : [updates.city, updates.country].filter(
            (value): value is string => Boolean(value)
          ),
    documents: mergedDocuments,
  };
}

async function getCurrentCompany() {
  return apiFetch<{ company: ProviderCompanyRecord }>('/api/provider/company');
}

async function getProviderListings() {
  return apiFetch<{ listings: ProviderListingRecord[] }>('/api/provider/listings');
}

async function getProviderOrders() {
  return apiFetch<{ orders: ProviderOrderRecord[] }>('/api/provider/orders');
}

function inferListingKind(listing: ProviderListingRecord) {
  const category = `${listing.category} ${listing.listingType}`.toLowerCase();
  if (category.includes('destination')) {
    return 'destination';
  }
  if (
    category.includes('stay') ||
    category.includes('hotel') ||
    category.includes('lodge') ||
    category.includes('accommodation')
  ) {
    return 'stay';
  }
  return 'event';
}

function toLegacyContentRecord(listing: ProviderListingRecord) {
  return {
    id: listing.id,
    name: listing.title,
    description: listing.description,
    location: listing.location,
    images: listing.images,
    approval_status: listing.status,
    created_at: listing.createdAt,
    updated_at: listing.updatedAt,
  };
}

async function upsertProviderProfile(
  updates: Partial<ServiceProvider>,
  documentDrafts?: VerificationDocumentDraft[]
) {
  const { company } = await getCurrentCompany();
  return apiFetch<{ company: ProviderCompanyRecord }>('/api/provider/company', {
    method: 'PATCH',
    body: JSON.stringify(buildCompanyPayload(updates, company, documentDrafts)),
  });
}

export const serviceProviderService = {
  register: async (
    providerData: Omit<ServiceProvider, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ): Promise<ServiceResult<ServiceProvider | null>> => {
    try {
      const payload = await upsertProviderProfile(providerData);
      return success(toServiceProvider(payload.company));
    } catch (error) {
      return failure<ServiceProvider | null>(null, error);
    }
  },

  getCurrentProvider: async (): Promise<ServiceResult<ServiceProvider | null>> => {
    try {
      const payload = await getCurrentCompany();
      return success(toServiceProvider(payload.company));
    } catch (error) {
      return failure<ServiceProvider | null>(null, error);
    }
  },

  getMyListings: async (): Promise<ServiceResult<ProviderListingRecord[]>> => {
    try {
      const payload = await getProviderListings();
      return success(payload.listings);
    } catch (error) {
      return failure<ProviderListingRecord[]>([], error);
    }
  },

  getMyOrders: async (): Promise<ServiceResult<ProviderOrderRecord[]>> => {
    try {
      const payload = await getProviderOrders();
      return success(payload.orders);
    } catch (error) {
      return failure<ProviderOrderRecord[]>([], error);
    }
  },

  updateProfile: async (
    updates: Partial<ServiceProvider>
  ): Promise<ServiceResult<ServiceProvider | null>> => {
    try {
      const payload = await upsertProviderProfile(updates);
      return success(toServiceProvider(payload.company));
    } catch (error) {
      return failure<ServiceProvider | null>(null, error);
    }
  },

  uploadVerificationDocument: async (
    file: any,
    fileName: string
  ): Promise<ServiceResult<{ url: string; path: string } | null>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', fileName);

      const payload = await apiFetch<{
        asset: { fileName: string; fileUrl: string; contentType: string; size: number };
      }>('/api/provider/uploads/documents', {
        method: 'POST',
        body: formData,
      });

      const url = payload.asset.fileUrl;
      pendingDocumentUploads.set(url, {
        type: fileName,
        fileName: payload.asset.fileName,
        fileUrl: url,
        status: 'uploaded',
      });
      return success({ url, path: url });
    } catch (error) {
      return failure<{ url: string; path: string } | null>(null, error);
    }
  },

  submitForVerification: async (
    documentUrls: string[],
    notes?: string
  ): Promise<ServiceResult<ServiceProvider | null>> => {
    try {
      const { company } = await getCurrentCompany();
      const drafts = documentUrls.map((url, index) => {
        const pending = pendingDocumentUploads.get(url);
        return (
          pending || {
            type: 'verification_document',
            fileName: `verification-${index + 1}`,
            fileUrl: url,
            status: 'uploaded',
            notes: null,
          }
        );
      });

      const updated = await apiFetch<{ company: ProviderCompanyRecord }>(
        '/api/provider/company',
        {
          method: 'PATCH',
          body: JSON.stringify(
            buildCompanyPayload(toServiceProvider(company), company, drafts)
          ),
        }
      );

      const submitted = await apiFetch<{ company: ProviderCompanyRecord }>(
        '/api/provider/company/review',
        {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }
      ).catch(async () => updated);

      return success(toServiceProvider(submitted.company));
    } catch (error) {
      return failure<ServiceProvider | null>(null, error);
    }
  },

  getAllProviders: async (filters?: {
    verification_status?: string;
    business_type?: string;
    status?: string;
  }): Promise<ServiceResult<ServiceProvider[]>> => {
    try {
      const payload = await apiFetch<{ providers: ProviderCompanyRecord[] }>(
        '/api/admin/providers'
      );

      let providers = payload.providers.map(toServiceProvider);

      if (filters?.verification_status === 'verified') {
        providers = providers.filter(
          provider =>
            provider.verification_status === 'verified' ||
            provider.verification_status === 'under_review'
        );
      } else if (filters?.verification_status) {
        providers = providers.filter(
          provider => provider.verification_status === filters.verification_status
        );
      }

      if (filters?.business_type) {
        providers = providers.filter(
          provider => provider.business_type === filters.business_type
        );
      }

      if (filters?.status) {
        providers = providers.filter(provider => provider.status === filters.status);
      }

      return success(providers);
    } catch (error) {
      return failure<ServiceProvider[]>([], error);
    }
  },

  verifyProvider: async (
    providerId: string,
    approved: boolean,
    notes?: string
  ): Promise<ServiceResult<ServiceProvider | null>> => {
    try {
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        `/api/admin/providers/${providerId}/review`,
        {
          method: 'POST',
          body: JSON.stringify({
            status: approved ? 'verified_premium' : 'changes_requested',
            notes: notes || (approved ? 'Approved by admin.' : 'Changes requested.'),
            internalSummary: null,
          }),
        }
      );

      return success(toServiceProvider(payload.company));
    } catch (error) {
      return failure<ServiceProvider | null>(null, error);
    }
  },
};

export const providerContentService = {
  createDestination: async (destinationData: Record<string, unknown>) => {
    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        '/api/provider/listings',
        {
          method: 'POST',
          body: JSON.stringify({
            title:
              destinationData.name ||
              destinationData.title ||
              'Untitled Destination',
            category: 'destination',
            listingType: 'destination',
            shortDescription: destinationData.short_description || null,
            description: destinationData.description || 'Destination listing',
            location: destinationData.location || 'Zimbabwe',
            basePrice: destinationData.base_price || null,
            currency: destinationData.currency || 'USD',
            status: 'pending_review',
            visibility: 'private',
            images: destinationData.images || [],
            tags: destinationData.tags || [],
            amenities: destinationData.amenities || [],
            policies: {},
            metadata: destinationData,
            availability: [],
          }),
        }
      );

      return success(toLegacyContentRecord(payload.listing));
    } catch (error) {
      return failure<Record<string, unknown> | null>(null, error);
    }
  },

  createStay: async (stayData: Record<string, unknown>) => {
    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        '/api/provider/listings',
        {
          method: 'POST',
          body: JSON.stringify({
            title: stayData.name || stayData.title || 'Untitled Stay',
            category: 'stay',
            listingType: 'accommodation',
            shortDescription: stayData.short_description || null,
            description: stayData.description || 'Accommodation listing',
            location: stayData.location || 'Zimbabwe',
            basePrice: stayData.price_per_night || stayData.base_price || null,
            currency: stayData.currency || 'USD',
            status: 'pending_review',
            visibility: 'private',
            images: stayData.images || [],
            tags: stayData.tags || [],
            amenities: stayData.amenities || [],
            policies: {},
            metadata: stayData,
            availability: [],
          }),
        }
      );

      return success(toLegacyContentRecord(payload.listing));
    } catch (error) {
      return failure<Record<string, unknown> | null>(null, error);
    }
  },

  createEvent: async (eventData: Record<string, unknown>) => {
    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        '/api/provider/listings',
        {
          method: 'POST',
          body: JSON.stringify({
            title: eventData.name || eventData.title || 'Untitled Event',
            category: 'event',
            listingType: 'experience',
            shortDescription: eventData.short_description || null,
            description: eventData.description || 'Event listing',
            location: eventData.location || 'Zimbabwe',
            basePrice: eventData.price || eventData.base_price || null,
            currency: eventData.currency || 'USD',
            status: 'pending_review',
            visibility: 'private',
            images: eventData.images || [],
            tags: eventData.tags || [],
            amenities: eventData.amenities || [],
            policies: {},
            metadata: eventData,
            availability: [],
          }),
        }
      );

      return success(toLegacyContentRecord(payload.listing));
    } catch (error) {
      return failure<Record<string, unknown> | null>(null, error);
    }
  },

  getMyDestinations: async () => {
    try {
      const payload = await getProviderListings();
      return success(
        payload.listings
          .filter(listing => inferListingKind(listing) === 'destination')
          .map(toLegacyContentRecord)
      );
    } catch (error) {
      return failure<Record<string, unknown>[]>([], error);
    }
  },

  getMyStays: async () => {
    try {
      const payload = await getProviderListings();
      return success(
        payload.listings
          .filter(listing => inferListingKind(listing) === 'stay')
          .map(toLegacyContentRecord)
      );
    } catch (error) {
      return failure<Record<string, unknown>[]>([], error);
    }
  },

  getMyEvents: async () => {
    try {
      const payload = await getProviderListings();
      return success(
        payload.listings
          .filter(listing => inferListingKind(listing) === 'event')
          .map(toLegacyContentRecord)
      );
    } catch (error) {
      return failure<Record<string, unknown>[]>([], error);
    }
  },

  updateDestination: async (id: string, updates: Record<string, unknown>) => {
    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        `/api/provider/listings/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: updates.name || updates.title,
            description: updates.description,
            location: updates.location,
            images: updates.images,
            metadata: updates,
            status: 'pending_review',
          }),
        }
      );

      return success(toLegacyContentRecord(payload.listing));
    } catch (error) {
      return failure<Record<string, unknown> | null>(null, error);
    }
  },

  uploadContentImage: async (
    file: any,
    contentType: 'destination' | 'stay' | 'event',
    contentId: string
  ): Promise<ServiceResult<{ url: string; path: string } | null>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contentType', contentType);
      formData.append('contentId', contentId);

      const payload = await apiFetch<{
        asset: { fileName: string; fileUrl: string; contentType: string; size: number };
      }>('/api/provider/uploads/content', {
        method: 'POST',
        body: formData,
      });

      return success({ url: payload.asset.fileUrl, path: payload.asset.fileUrl });
    } catch (error) {
      return failure<{ url: string; path: string } | null>(null, error);
    }
  },
};

export const contentReviewService = {
  createReview: async (
    reviewData: Omit<ContentReview, 'id' | 'created_at' | 'submitted_by' | 'status'>
  ): Promise<ServiceResult<ContentReview | null>> => {
    const now = new Date().toISOString();
    return success({
      id: reviewData.content_id,
      content_type: reviewData.content_type,
      content_id: reviewData.content_id,
      provider_id: reviewData.provider_id,
      reviewer_id: reviewData.reviewer_id,
      status: 'pending',
      submission_notes: reviewData.submission_notes,
      created_at: now,
      submitted_by: reviewData.provider_id,
    });
  },

  getPendingReviews: async (): Promise<ServiceResult<ContentReview[]>> => {
    try {
      const payload = await apiFetch<{ providers: ProviderCompanyRecord[] }>(
        '/api/admin/providers'
      );

      const reviews: ContentReview[] = payload.providers
        .filter(provider => provider.onboardingStatus === 'submitted')
        .map(provider => ({
          id: provider.id,
          content_type: 'provider' as const,
          content_id: provider.id,
          provider_id: provider.id,
          status: 'pending' as const,
          review_notes: provider.verificationReviews[0]?.notes || undefined,
          reviewed_at: provider.verificationReviews[0]?.reviewedAt || undefined,
          submitted_by: provider.ownerUserId,
          submission_notes:
            provider.documents.length > 0
              ? `Submitted ${provider.documents.length} verification document(s)`
              : 'Submitted for verification',
          created_at:
            provider.reviewSubmittedAt ||
            provider.verificationReviews[0]?.createdAt ||
            provider.updatedAt,
        }));

      return success(reviews);
    } catch (error) {
      return failure<ContentReview[]>([], error);
    }
  },

  reviewContent: async (
    reviewId: string,
    approved: boolean,
    notes?: string,
    changesRequested?: string
  ): Promise<ServiceResult<ContentReview | null>> => {
    try {
      await apiFetch<{ company: ProviderCompanyRecord }>(
        `/api/admin/providers/${reviewId}/review`,
        {
          method: 'POST',
          body: JSON.stringify({
            status: approved ? 'verified_premium' : 'changes_requested',
            notes: notes || changesRequested || 'Reviewed by administrator.',
            internalSummary: changesRequested || null,
          }),
        }
      );

      return success({
        id: reviewId,
        content_type: 'provider',
        content_id: reviewId,
        provider_id: reviewId,
        reviewer_id: undefined,
        status: approved ? 'approved' : changesRequested ? 'changes_requested' : 'rejected',
        review_notes: notes,
        changes_requested: changesRequested,
        reviewed_at: new Date().toISOString(),
        submitted_by: reviewId,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      return failure<ContentReview | null>(null, error);
    }
  },

  getMyReviews: async (): Promise<ServiceResult<ContentReview[]>> => {
    try {
      const payload = await getCurrentCompany();
      const reviews: ContentReview[] = payload.company.verificationReviews.map(review => ({
        id: review.id,
        content_type: 'provider' as const,
        content_id: payload.company.id,
        provider_id: payload.company.id,
        reviewer_id: undefined,
        status:
          review.status === 'approved'
            ? 'approved'
            : review.status === 'changes_requested'
              ? 'changes_requested'
              : 'pending',
        review_notes: review.notes || undefined,
        reviewed_at: review.reviewedAt || undefined,
        submitted_by: payload.company.ownerUserId,
        submission_notes: review.notes || undefined,
        created_at: review.createdAt,
      }));

      return success(reviews);
    } catch (error) {
      return failure<ContentReview[]>([], error);
    }
  },
};

export const providerAnalyticsService = {
  getDashboardStats: async (): Promise<
    ServiceResult<{
      destinations: { total: number; approved: number; pending: number };
      stays: { total: number; approved: number; pending: number };
      events: { total: number; approved: number; pending: number };
      bookings: { total: number; confirmed: number; totalRevenue: number };
    } | null>
  > => {
    try {
      const [listingsPayload, ordersPayload] = await Promise.all([
        getProviderListings(),
        getProviderOrders(),
      ]);

      const totals = {
        destinations: { total: 0, approved: 0, pending: 0 },
        stays: { total: 0, approved: 0, pending: 0 },
        events: { total: 0, approved: 0, pending: 0 },
      };

      for (const listing of listingsPayload.listings) {
        const kind = inferListingKind(listing);
        const bucket =
          kind === 'destination'
            ? totals.destinations
            : kind === 'stay'
              ? totals.stays
              : totals.events;
        bucket.total += 1;
        if (listing.status === 'active') {
          bucket.approved += 1;
        }
        if (listing.status === 'pending_review') {
          bucket.pending += 1;
        }
      }

      const confirmedStatuses = new Set(['CONFIRMED', 'PAID', 'COMPLETED']);
      const bookings = {
        total: ordersPayload.orders.length,
        confirmed: ordersPayload.orders.filter(order =>
          confirmedStatuses.has(order.status.toUpperCase())
        ).length,
        totalRevenue: ordersPayload.orders.reduce(
          (sum, order) => sum + (Number(order.totalAmount) || 0),
          0
        ),
      };

      return success({
        destinations: totals.destinations,
        stays: totals.stays,
        events: totals.events,
        bookings,
      });
    } catch (error) {
      return failure(null, error);
    }
  },
};
