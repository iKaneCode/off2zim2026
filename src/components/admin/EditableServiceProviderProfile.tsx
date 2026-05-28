"use client";

import {
  ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { actionButtonVariants } from "@/components/admin/ActionButton";
import { serviceProviderCategoryLabels } from "@/components/admin/ServiceProviderProfile";
import { apiFetch } from "@/lib/client-api";
import { curatedZimbabweDestinations } from "@/lib/destination-explorer";
import {
  SERVICE_PROVIDER_FILTERS,
  type ServiceProviderCategoryId,
} from "@/lib/service-provider-categories";
import {
  getProviderListingDisplayId,
  getServiceProviderDisplayId,
} from "@/lib/service-provider-id";
import { cn } from "@/lib/utils";
import type {
  AdminListingRecord,
  ProviderCompanyRecord,
  ProviderDocumentRecord,
  ProviderRatingReviewRecord,
} from "@/types/platform";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Contact,
  FilePlus,
  FileText,
  Hourglass,
  ImagePlus,
  ListPlus,
  Plus,
  ReceiptText,
  Save,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { IonHourglassOutline } from "@/components/icons/IonHourglassOutline";
import { IonFolderOpen } from "@/components/icons/IonFolderOpen";

type ReviewStatus = "basic_approved" | "changes_requested" | "verified_premium";
type DocumentStatus = "missing" | "pending" | "approved" | "rejected";
type OperatingDayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface OperatingDaySchedule {
  enabled: boolean;
  opensAt: string;
  closesAt: string;
}

interface ReviewDecisionProps {
  status: ReviewStatus;
  setStatus: (status: ReviewStatus) => void;
  notes: string;
  setNotes: (notes: string) => void;
  internalSummary: string;
  setInternalSummary: (summary: string) => void;
  saving: boolean;
  submitReview: () => void;
}

interface ProviderFormState {
  companyName: string;
  tradingName: string;
  legalCompanyName: string;
  businessRegistrationNumber: string;
  mainContactPerson: string;
  contactPersonPhone: string;
  contactPersonIdType: string;
  contactPersonIdNumber: string;
  businessPhone: string;
  businessEmail: string;
  physicalAddress: string;
  headquartersCity: string;
  businessDescription: string;
  establishedYear: string;
  numberOfEmployees: string;
  incorporationDate: string;
  selectedServices: ServiceProviderCategoryId[];
  serviceAreas: string[];
  operatingTimeEnabled: boolean;
  operatingSchedule: Record<OperatingDayId, OperatingDaySchedule>;
  zimraBpNumber: string;
  tinNumber: string;
  taxClearanceExpiresAt: string;
  documents: EditableDocument[];
}

interface EditableDocument {
  id: string;
  type: string;
  status: string;
  notes: string;
}

interface ListingEditForm {
  title: string;
  shortDescription: string;
  status: string;
  visibility: string;
  location: string;
  bookingMode: string;
  instantBooking: boolean;
  basePrice: string;
  listingType: string;
  pricingModel: string;
  capacity: string;
  totalUnits: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  maxAdults: string;
  maxChildren: string;
  maxInfants: string;
  bedSetup: string;
  bathroomType: string;
  roomView: string;
  checkInFrom: string;
  checkInUntil: string;
  checkOutUntil: string;
  minNights: string;
  maxNights: string;
  advanceNoticeHours: string;
  bookingWindowMonths: string;
  cleaningFee: string;
  securityDeposit: string;
  extraGuestFee: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
  cancellationPolicy: string;
  paymentPolicy: string;
  calendarSyncUrl: string;
  blackoutNotes: string;
  accessibilityFeatures: string[];
  safetyFeatures: string[];
  included: string[];
  notAllowed: string[];
}

interface ProviderMediaRecord {
  id: string;
  companyId: string;
  listingId?: string | null;
  mediaType: string;
  title?: string | null;
  caption?: string | null;
  altText?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  sortOrder?: number | null;
  visibility: string;
  status: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const SERVICE_OPTIONS = SERVICE_PROVIDER_FILTERS.filter(
  (option): option is { id: ServiceProviderCategoryId; label: string } =>
    option.id !== "all",
);

const LOCATION_OPTIONS = curatedZimbabweDestinations.map((destination) => ({
  value: destination.name,
  label: `${destination.name}, ${destination.location}`,
}));

const DAY_OPTIONS: Array<{
  id: OperatingDayId;
  label: string;
  fullLabel: string;
}> = [
  { id: "mon", label: "Mon", fullLabel: "Monday" },
  { id: "tue", label: "Tue", fullLabel: "Tuesday" },
  { id: "wed", label: "Wed", fullLabel: "Wednesday" },
  { id: "thu", label: "Thu", fullLabel: "Thursday" },
  { id: "fri", label: "Fri", fullLabel: "Friday" },
  { id: "sat", label: "Sat", fullLabel: "Saturday" },
  { id: "sun", label: "Sun", fullLabel: "Sunday" },
];

const REQUIRED_DOCUMENTS = [
  {
    type: "certificate_of_incorporation",
    title: "Certificate of incorporation",
    body: "Company name as per certificate of incorporation (Pvt) Ltd.",
    icon: Building2,
  },
  {
    type: "contact_person_id",
    title: "Contact person ID / passport",
    body: "Identity document for the main contact person.",
    icon: Contact,
  },
  {
    type: "tax_clearance",
    title: "Tax clearance",
    body: "Current tax clearance document with expiry date.",
    icon: ReceiptText,
  },
];

const documentStatusOptions = [
  { value: "uploaded", label: "Uploaded / pending review" },
  { value: "approved", label: "Reviewed and approved" },
  { value: "rejected", label: "Reviewed and rejected" },
];

const inputClassName =
  "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/10 dark:focus:border-white/30 dark:focus:ring-white/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white dark:placeholder:text-white/35 dark:disabled:bg-white/[0.04]";

const emptyListingEditForm: ListingEditForm = {
  title: "",
  shortDescription: "",
  status: "",
  visibility: "",
  location: "",
  bookingMode: "",
  instantBooking: false,
  basePrice: "",
  listingType: "",
  pricingModel: "",
  capacity: "",
  totalUnits: "",
  bedrooms: "",
  beds: "",
  bathrooms: "",
  maxAdults: "",
  maxChildren: "",
  maxInfants: "",
  bedSetup: "",
  bathroomType: "",
  roomView: "",
  checkInFrom: "",
  checkInUntil: "",
  checkOutUntil: "",
  minNights: "",
  maxNights: "",
  advanceNoticeHours: "",
  bookingWindowMonths: "",
  cleaningFee: "",
  securityDeposit: "",
  extraGuestFee: "",
  weeklyDiscount: "",
  monthlyDiscount: "",
  cancellationPolicy: "",
  paymentPolicy: "",
  calendarSyncUrl: "",
  blackoutNotes: "",
  accessibilityFeatures: [],
  safetyFeatures: [],
  included: [],
  notAllowed: [],
};

const STAY_ROOM_TYPE_OPTIONS = [
  "Standard room",
  "Deluxe room",
  "Suite",
  "Family room",
  "Self-catering unit",
  "Villa",
  "Lodge room",
  "Campsite",
];

const STAY_PRICING_OPTIONS = [
  { value: "per_night", label: "Per night" },
  { value: "per_room", label: "Per room" },
  { value: "per_person", label: "Per person" },
  { value: "package", label: "Package" },
];

const STAY_INCLUDED_OPTIONS = [
  "Breakfast",
  "Wi-Fi",
  "Airport transfer",
  "All meals",
  "Game drive",
  "Parking",
  "No inclusions listed",
];

const STAY_NOT_ALLOWED_OPTIONS = [
  "No smoking",
  "No pets",
  "No parties or events",
  "No outside food",
  "Adults only",
  "No restrictions listed",
];

const GUEST_CAPACITY_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
);

const ROOM_COUNT_OPTIONS = Array.from({ length: 50 }, (_, index) =>
  String(index + 1),
);

const CALENDAR_WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

type ListingStatusFilter =
  | "all"
  | "approved"
  | "pending"
  | "archived"
  | "rejected";

const TIER_FEATURES = [
  { id: "listings", label: "Create & manage listings", basic: true },
  { id: "bookings", label: "Booking management", basic: true },
  { id: "analytics", label: "Basic analytics", basic: true },
  { id: "gallery", label: "Gallery image uploads", basic: false },
  { id: "notifications", label: "Push notification campaigns", basic: false },
  { id: "advanced-analytics", label: "Advanced analytics", basic: false },
  { id: "android", label: "Premium Android app", basic: false },
  { id: "priority", label: "Priority review queue", basic: false },
];

const MAX_LISTING_GALLERY_IMAGES = 12;

const LISTING_SERVICE_CONFIG: Record<
  ServiceProviderCategoryId,
  {
    label: string;
    singular: string;
    emptyTitle: string;
    emptyBody: string;
    addLabel: string;
    defaultListingType: string;
    defaultPricingModel: string;
  }
> = {
  stays: {
    label: "Accommodation",
    singular: "room",
    emptyTitle: "No accommodation listings yet",
    emptyBody: "Add a room, suite, lodge, campsite, or stay package.",
    addLabel: "Add stay",
    defaultListingType: "Room",
    defaultPricingModel: "per_night",
  },
  events: {
    label: "Events",
    singular: "event",
    emptyTitle: "No event listings yet",
    emptyBody: "Add an event, ticketed experience, festival, or show.",
    addLabel: "Add event",
    defaultListingType: "Event",
    defaultPricingModel: "per_ticket",
  },
  things_to_do: {
    label: "Activities",
    singular: "activity",
    emptyTitle: "No activity listings yet",
    emptyBody: "Add a tour, attraction, activity, or guided experience.",
    addLabel: "Add activity",
    defaultListingType: "Activity",
    defaultPricingModel: "per_person",
  },
  bus: {
    label: "Bus",
    singular: "route",
    emptyTitle: "No bus listings yet",
    emptyBody: "Add a route, shuttle, transfer, or bus service.",
    addLabel: "Add route",
    defaultListingType: "Route",
    defaultPricingModel: "per_seat",
  },
  flight: {
    label: "Flight",
    singular: "flight",
    emptyTitle: "No flight listings yet",
    emptyBody: "Add a flight, charter, route, or air transfer.",
    addLabel: "Add flight",
    defaultListingType: "Flight",
    defaultPricingModel: "per_seat",
  },
};

export default function EditableServiceProviderProfile({
  provider,
  onProviderChange,
  reviewDecision,
}: {
  provider: ProviderCompanyRecord;
  onProviderChange: (provider: ProviderCompanyRecord) => void;
  reviewDecision: ReviewDecisionProps;
}) {
  const hasGalleryAccess = provider.tierFeatures.includes("gallery_management");
  const [form, setForm] = useState<ProviderFormState>(() => toForm(provider));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshotPayload(toForm(provider)),
  );
  const [gallery, setGallery] = useState<ProviderMediaRecord[]>([]);
  const [listings, setListings] = useState<AdminListingRecord[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [addingListing, setAddingListing] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState("");
  const [editingListingId, setEditingListingId] = useState("");
  const [listingEditForm, setListingEditForm] =
    useState<ListingEditForm>(emptyListingEditForm);
  const [savingListingId, setSavingListingId] = useState("");
  const [listingValidationAttemptedIds, setListingValidationAttemptedIds] =
    useState<Set<string>>(new Set());
  const [tierSaving, setTierSaving] = useState(false);
  const [reviewingMediaId, setReviewingMediaId] = useState("");
  const [selectedGalleryListingId, setSelectedGalleryListingId] = useState("");
  const [galleryPanelEnabled, setGalleryPanelEnabled] = useState(
    () => hasGalleryAccess,
  );
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  );
  const ratingSummary = getProviderRatingSummary(provider);
  const gallerySectionActive = hasGalleryAccess && galleryPanelEnabled;
  const coverImageEditable = hasGalleryAccess;
  const selectedService = form.selectedServices[0] || "things_to_do";
  const listingServiceConfig = LISTING_SERVICE_CONFIG[selectedService];

  useEffect(() => {
    const nextForm = toForm(provider);
    setForm(nextForm);
    setSavedSnapshot(snapshotPayload(nextForm));
  }, [provider.id]);

  useEffect(() => {
    setGalleryPanelEnabled(hasGalleryAccess);
  }, [provider.id, hasGalleryAccess]);

  useEffect(() => {
    if (hasGalleryAccess) {
      loadGallery();
    } else {
      setGallery([]);
    }
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id, hasGalleryAccess]);

  useEffect(() => {
    setSelectedGalleryListingId((current) => {
      const matchingListings = listings.filter((listing) =>
        listingMatchesService(listing, selectedService),
      );

      if (
        current &&
        matchingListings.some((listing) => listing.id === current)
      ) {
        return current;
      }

      return matchingListings[0]?.id || "";
    });
  }, [listings, provider.id, selectedService]);

  const documentsByType = useMemo(
    () => mapDocumentsByType(provider.documents),
    [provider.documents],
  );

  const selectedGalleryListing = useMemo(
    () =>
      listings.find(
        (listing) =>
          listing.id === selectedGalleryListingId &&
          listingMatchesService(listing, selectedService),
      ) || null,
    [listings, selectedGalleryListingId, selectedService],
  );

  const serviceListings = useMemo(
    () =>
      listings.filter((listing) =>
        listingMatchesService(listing, selectedService),
      ),
    [listings, selectedService],
  );

  const selectedListingGallery = useMemo(
    () =>
      gallery
        .filter((image) => image.listingId === selectedGalleryListingId)
        .sort((first, second) => {
          const firstOrder = first.sortOrder ?? 0;
          const secondOrder = second.sortOrder ?? 0;
          if (firstOrder !== secondOrder) return firstOrder - secondOrder;
          return (
            new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime()
          );
        }),
    [gallery, selectedGalleryListingId],
  );

  const isDirty = useMemo(
    () => snapshotPayload(form) !== savedSnapshot,
    [form, savedSnapshot],
  );

  const isProfileDirty = useMemo(() => {
    const saved = toForm(provider);
    return (
      form.companyName !== saved.companyName ||
      form.tradingName !== saved.tradingName ||
      form.headquartersCity !== saved.headquartersCity ||
      form.businessDescription !== saved.businessDescription ||
      form.businessPhone !== saved.businessPhone ||
      form.businessEmail !== saved.businessEmail ||
      JSON.stringify(form.serviceAreas) !==
        JSON.stringify(saved.serviceAreas) ||
      JSON.stringify(form.selectedServices) !==
        JSON.stringify(saved.selectedServices)
    );
  }, [form, provider]);

  const isOperatingTimeDirty = useMemo(() => {
    const saved = toForm(provider);
    return (
      form.operatingTimeEnabled !== saved.operatingTimeEnabled ||
      JSON.stringify(form.operatingSchedule) !==
        JSON.stringify(saved.operatingSchedule)
    );
  }, [form, provider]);

  const isContactDirty = useMemo(() => {
    const saved = toForm(provider);
    return (
      form.mainContactPerson !== saved.mainContactPerson ||
      form.contactPersonPhone !== saved.contactPersonPhone ||
      form.contactPersonIdType !== saved.contactPersonIdType ||
      form.contactPersonIdNumber !== saved.contactPersonIdNumber ||
      form.businessEmail !== saved.businessEmail ||
      form.physicalAddress !== saved.physicalAddress
    );
  }, [form, provider]);

  const updateField = (field: keyof ProviderFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => {
      if (!current.has(field)) return current;
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  };

  const toggleOperatingTime = (enabled: boolean) => {
    setForm((current) => {
      const hasActiveDay = Object.values(current.operatingSchedule).some(
        (day) => day.enabled,
      );

      return {
        ...current,
        operatingTimeEnabled: enabled,
        operatingSchedule:
          enabled && !hasActiveDay
            ? createDefaultOperatingSchedule()
            : current.operatingSchedule,
      };
    });
  };

  const toggleDay = (day: OperatingDayId) => {
    setForm((current) => ({
      ...current,
      operatingSchedule: {
        ...current.operatingSchedule,
        [day]: {
          ...current.operatingSchedule[day],
          enabled: !current.operatingSchedule[day].enabled,
        },
      },
    }));
  };

  const selectService = (service: ServiceProviderCategoryId | "") => {
    setForm((current) => ({
      ...current,
      selectedServices: service ? [service] : [],
    }));
    if (service) {
      setValidationErrors((current) => {
        if (!current.has("selectedServices")) return current;
        const next = new Set(current);
        next.delete("selectedServices");
        return next;
      });
    }
  };

  const updateOperatingTime = (
    day: OperatingDayId,
    field: "opensAt" | "closesAt",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      operatingSchedule: {
        ...current.operatingSchedule,
        [day]: {
          ...current.operatingSchedule[day],
          [field]: value,
        },
      },
    }));
  };

  const togglePremiumTier = async (enabled: boolean) => {
    setTierSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = await apiFetch<{
        company: Pick<
          ProviderCompanyRecord,
          "id" | "providerTier" | "tierStatus" | "tierFeatures"
        >;
      }>(`/api/admin/providers/${provider.id}/tier`, {
        method: "PATCH",
        body: JSON.stringify({
          providerTier: enabled ? "premium" : "basic",
          tierStatus: "active",
          billingCycle: enabled ? "monthly" : null,
        }),
      });

      onProviderChange({
        ...provider,
        providerTier: payload.company.providerTier,
        tierStatus: payload.company.tierStatus,
        tierFeatures: payload.company.tierFeatures,
      });
      setMessage(
        enabled
          ? "Provider upgraded to premium."
          : "Provider moved back to basic.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update subscription.",
      );
    } finally {
      setTierSaving(false);
    }
  };

  const selectLocation = (location: string) => {
    if (!location || form.serviceAreas.includes(location)) return;
    setForm((current) => ({
      ...current,
      serviceAreas: [...current.serviceAreas, location],
    }));
    setValidationErrors((current) => {
      if (!current.has("serviceAreas")) return current;
      const next = new Set(current);
      next.delete("serviceAreas");
      return next;
    });
  };

  const removeLocation = (location: string) => {
    setForm((current) => ({
      ...current,
      serviceAreas: current.serviceAreas.filter((item) => item !== location),
    }));
  };

  const updateDocument = (
    type: string,
    patch: Partial<Pick<EditableDocument, "status" | "notes">>,
  ) => {
    setForm((current) => {
      const existing = current.documents.find(
        (document) => document.type === type,
      );
      const documents = existing
        ? current.documents.map((document) =>
            document.type === type ? { ...document, ...patch } : document,
          )
        : [
            ...current.documents,
            {
              id: documentsByType[type]?.id || "",
              type,
              status:
                patch.status || documentsByType[type]?.status || "uploaded",
              notes: patch.notes || documentsByType[type]?.notes || "",
            },
          ];

      return { ...current, documents };
    });
  };

  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const payload = await apiFetch<{ media: ProviderMediaRecord[] }>(
        `/api/admin/provider-media?companyId=${encodeURIComponent(provider.id)}`,
      );
      setGallery(
        payload.media.filter(
          (media) => media.mediaType === "image" && media.status !== "archived",
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load gallery.");
    } finally {
      setLoadingGallery(false);
    }
  };

  const loadListings = async () => {
    setLoadingListings(true);
    try {
      const payload = await apiFetch<{ listings: AdminListingRecord[] }>(
        "/api/admin/listings",
      );
      setListings(
        payload.listings.filter((listing) => listing.companyId === provider.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load listings.");
    } finally {
      setLoadingListings(false);
    }
  };

  const uploadMedia = async (slot: "profile" | "cover", file?: File | null) => {
    if (!file) return;

    setUploading(slot);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("slot", slot);
      body.append("file", file);
      const payload = await apiFetch<{ provider: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}/media`,
        { method: "POST", body },
      );
      onProviderChange(payload.provider);
      setMessage(
        slot === "profile" ? "Profile image updated." : "Cover image updated.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload image.");
    } finally {
      setUploading("");
    }
  };

  const uploadListingGalleryImages = async (
    listingId: string,
    files: File[],
  ) => {
    if (files.length === 0) return;
    if (!listingId) {
      setError("Select a listing before uploading gallery images.");
      return;
    }

    setUploading(`gallery:${listingId}`);
    setError("");
    setMessage("");
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("slot", "gallery");
        body.append("listingId", listingId);
        body.append("file", file);
        await apiFetch<{ media: ProviderMediaRecord }>(
          `/api/admin/providers/${provider.id}/media`,
          { method: "POST", body },
        );
      }
      await loadGallery();
      setMessage(
        files.length === 1
          ? "Gallery image uploaded for review."
          : `${files.length} gallery images uploaded for review.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to upload gallery images.",
      );
    } finally {
      setUploading("");
    }
  };

  const reviewGalleryImage = async (
    image: ProviderMediaRecord,
    status: "approved" | "rejected" | "pending_review",
  ) => {
    let rejectionReason: string | null = null;
    if (status === "rejected") {
      const reason = window.prompt(
        "Add a short reason for rejecting this image.",
      );
      if (!reason?.trim()) return;
      rejectionReason = reason.trim();
    }

    setReviewingMediaId(`${image.id}:${status}`);
    setError("");
    setMessage("");
    try {
      await apiFetch<{ media: ProviderMediaRecord }>(
        `/api/admin/provider-media/${image.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            visibility: status === "approved" ? "public" : "private",
            rejectionReason,
          }),
        },
      );
      await loadGallery();
      setMessage(
        status === "approved"
          ? "Gallery image approved."
          : status === "rejected"
            ? "Gallery image rejected."
            : "Gallery image returned to review.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update gallery image.",
      );
    } finally {
      setReviewingMediaId("");
    }
  };

  const uploadDocument = async (type: string, file?: File | null) => {
    if (!file) return;

    setUploading(type);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("documentType", type);
      body.append("file", file);
      const payload = await apiFetch<{ provider: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}/documents`,
        { method: "POST", body },
      );
      onProviderChange(payload.provider);
      setForm((current) => ({
        ...current,
        documents: toEditableDocuments(payload.provider.documents),
      }));
      setMessage("Document uploaded and marked pending review.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to upload document.",
      );
    } finally {
      setUploading("");
    }
  };

  const deleteDocument = async (type: string) => {
    setUploading(type);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ provider: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}/documents?type=${encodeURIComponent(type)}`,
        { method: "DELETE" },
      );
      onProviderChange(payload.provider);
      setForm((current) => ({
        ...current,
        documents: toEditableDocuments(payload.provider.documents),
      }));
      setMessage("Document removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete document.",
      );
    } finally {
      setUploading("");
    }
  };

  const saveProfile = async () => {
    if (!isDirty) return;

    const errors = new Set<string>();
    // Profile
    if (!form.companyName.trim()) errors.add("companyName");
    if (!form.tradingName.trim()) errors.add("tradingName");
    if (!form.headquartersCity) errors.add("headquartersCity");
    if (!form.businessDescription.trim()) errors.add("businessDescription");
    if (form.selectedServices.length === 0) errors.add("selectedServices");
    if (form.serviceAreas.length === 0) errors.add("serviceAreas");
    if (!form.businessPhone.trim()) errors.add("businessPhone");
    // Contact Person
    if (!form.mainContactPerson.trim()) errors.add("mainContactPerson");
    if (!form.contactPersonPhone.trim()) errors.add("contactPersonPhone");
    if (!form.businessEmail.trim()) errors.add("businessEmail");
    if (!form.physicalAddress.trim()) errors.add("physicalAddress");
    if (!form.contactPersonIdType) errors.add("contactPersonIdType");
    if (!form.contactPersonIdNumber.trim()) errors.add("contactPersonIdNumber");
    if (!documentsByType.contact_person_id) errors.add("contact_person_id");
    // Company verification
    if (!form.legalCompanyName.trim()) errors.add("legalCompanyName");
    if (!form.businessRegistrationNumber.trim())
      errors.add("businessRegistrationNumber");
    // ZIMRA
    if (!form.zimraBpNumber.trim()) errors.add("zimraBpNumber");
    if (!form.tinNumber.trim()) errors.add("tinNumber");
    if (errors.size > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors(new Set());

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = await apiFetch<{ provider: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(formToPayload(form)),
        },
      );
      const nextForm = toForm(payload.provider);
      onProviderChange(payload.provider);
      setForm(nextForm);
      setSavedSnapshot(snapshotPayload(nextForm));
      setMessage("Service provider profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    const nextForm = toForm(provider);
    setForm(nextForm);
    setSavedSnapshot(snapshotPayload(nextForm));
    setError("");
    setMessage("Unsaved changes discarded.");
  };

  const addListing = async () => {
    setAddingListing(true);
    setError("");
    setMessage("");
    try {
      const primaryService = selectedService;
      const config = LISTING_SERVICE_CONFIG[primaryService];
      const payload = await apiFetch<{ listing: AdminListingRecord }>(
        `/api/admin/providers/${provider.id}/listings`,
        {
          method: "POST",
          body: JSON.stringify({
            title: getProviderDisplayName(provider, form),
            category: serviceProviderCategoryLabels[primaryService],
            listingType: config.defaultListingType,
            location:
              form.serviceAreas[0] ||
              form.headquartersCity ||
              provider.headquartersCity ||
              "Zimbabwe",
            pricingModel: config.defaultPricingModel,
            serviceCategory: primaryService,
          }),
        },
      );
      await loadListings();
      setSelectedGalleryListingId(payload.listing.id);
      startEditListing(payload.listing);
      setMessage("Listing added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add listing.");
    } finally {
      setAddingListing(false);
    }
  };

  const deleteListing = async (listing: AdminListingRecord) => {
    const confirmed = window.confirm(
      `Remove ${listing.title}? Listings with bookings will be archived for record keeping.`,
    );
    if (!confirmed) return;

    setDeletingListingId(listing.id);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ archived: boolean; deleted: boolean }>(
        `/api/admin/listings/${listing.id}`,
        { method: "DELETE" },
      );
      await loadListings();
      setMessage(payload.archived ? "Listing archived." : "Listing deleted.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove listing.",
      );
    } finally {
      setDeletingListingId("");
    }
  };

  const startEditListing = (listing: AdminListingRecord) => {
    setEditingListingId(listing.id);
    setListingEditForm(
      toListingEditForm(listing, getProviderDisplayName(provider, form)),
    );
  };

  const updateListingEdit = (
    listing: AdminListingRecord,
    patch: Partial<ListingEditForm>,
  ) => {
    setSelectedGalleryListingId(listing.id);
    setEditingListingId(listing.id);
    setListingEditForm((current) => ({
      ...(editingListingId === listing.id
        ? current
        : toListingEditForm(listing, getProviderDisplayName(provider, form))),
      ...patch,
    }));
  };

  const cancelEditListing = () => {
    setEditingListingId("");
    setListingEditForm(emptyListingEditForm);
    setListingValidationAttemptedIds((current) => {
      if (!editingListingId || !current.has(editingListingId)) return current;
      const next = new Set(current);
      next.delete(editingListingId);
      return next;
    });
  };

  const saveListingEdit = async () => {
    if (!editingListingId) return;
    const listingErrors = getListingValidationErrors(
      listingEditForm,
      selectedService,
    );
    if (listingErrors.size > 0) {
      setListingValidationAttemptedIds((current) => {
        const next = new Set(current);
        next.add(editingListingId);
        return next;
      });
      return;
    }

    setSavingListingId(editingListingId);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ listing: AdminListingRecord }>(
        `/api/admin/listings/${editingListingId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: listingEditForm.title || undefined,
            shortDescription: listingEditForm.shortDescription || undefined,
            status: getPersistedListingStatus(listingEditForm.status),
            visibility: listingEditForm.visibility || undefined,
            location: listingEditForm.location || undefined,
            bookingMode: listingEditForm.bookingMode || undefined,
            instantBooking: listingEditForm.instantBooking,
            listingType: listingEditForm.listingType || undefined,
            pricingModel: listingEditForm.pricingModel || undefined,
            basePrice: listingEditForm.basePrice
              ? parseFloat(listingEditForm.basePrice)
              : undefined,
            capacity: listingEditForm.capacity
              ? parseInt(listingEditForm.capacity, 10)
              : null,
            amenities: listingEditForm.included.filter(
              (item) => item !== "No inclusions listed",
            ),
            policies: {
              notAllowed: listingEditForm.notAllowed.filter(
                (item) => item !== "No restrictions listed",
              ),
            },
            metadata:
              selectedService === "stays"
                ? { stayDetails: toStayDetailsPayload(listingEditForm) }
                : undefined,
          }),
        },
      );
      setListings((prev) =>
        prev.map((l) => (l.id === editingListingId ? payload.listing : l)),
      );
      setEditingListingId("");
      setListingEditForm(emptyListingEditForm);
      setListingValidationAttemptedIds((current) => {
        if (!current.has(editingListingId)) return current;
        const next = new Set(current);
        next.delete(editingListingId);
        return next;
      });
      setMessage("Listing updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update listing.",
      );
    } finally {
      setSavingListingId("");
    }
  };

  return (
    <div className="space-y-5">
      {error ? (
        <AlertModal
          tone="error"
          title="Attention required"
          message={error}
          onClose={() => setError("")}
        />
      ) : null}

      {message ? (
        <AlertModal
          tone="success"
          title="Notification"
          message={message}
          onClose={() => setMessage("")}
        />
      ) : null}

      {reviewsOpen ? (
        <ReviewsModal
          provider={provider}
          onClose={() => setReviewsOpen(false)}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
        {/* Cover image */}
        <div
          className={cn(
            "relative h-80 bg-slate-200 transition dark:bg-white/[0.06]",
            !coverImageEditable && "opacity-45 grayscale",
          )}
        >
          {provider.coverImageUrl ? (
            <>
              <img
                src={provider.coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <label
                aria-disabled={!coverImageEditable}
                className={cn(
                  actionButtonVariants({ variant: "secondary", size: "sm" }),
                  "absolute right-4 top-4 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] motion-safe:animate-pulse dark:bg-[#151515]/95",
                  coverImageEditable ? "cursor-pointer" : "cursor-not-allowed",
                )}
              >
                <ImagePlus className="h-4 w-4" />
                {uploading === "cover" ? "Uploading..." : "Edit cover"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={!coverImageEditable}
                  className="sr-only"
                  onChange={(event) =>
                    handleFileChange(event, (file) =>
                      uploadMedia("cover", file),
                    )
                  }
                />
              </label>
            </>
          ) : (
            <label
              aria-disabled={!coverImageEditable}
              className={cn(
                "flex h-full flex-col items-center justify-center transition dark:hover:bg-white/[0.04]",
                coverImageEditable
                  ? "cursor-pointer hover:bg-slate-300/30"
                  : "cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition motion-safe:animate-pulse dark:bg-[#1c1c1e]",
                )}
              >
                <ImagePlus className="h-5 w-5" />
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                {uploading === "cover" ? "Uploading..." : "Add cover image"}
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-white/45">
                Recommended upload 1200 x 400 px
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={!coverImageEditable}
                className="sr-only"
                onChange={(event) =>
                  handleFileChange(event, (file) => uploadMedia("cover", file))
                }
              />
            </label>
          )}
        </div>

        <div className="relative z-10 px-6 pb-6 pt-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-end gap-5">
              {/* Profile picture */}
              <label
                aria-label="Upload profile image"
                className="relative flex h-32 w-32 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-[3px] border-slate-300 bg-white bg-cover bg-center bg-no-repeat text-center transition hover:scale-[1.02] dark:border-white/25 dark:bg-[#101010]"
                style={
                  provider.profileImageUrl
                    ? { backgroundImage: `url("${provider.profileImageUrl}")` }
                    : undefined
                }
              >
                {provider.profileImageUrl ? (
                  <span className="absolute inset-0 bg-black/15" />
                ) : null}
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition motion-safe:animate-pulse dark:bg-[#1c1c1e]">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    handleFileChange(event, (file) =>
                      uploadMedia("profile", file),
                    )
                  }
                />
              </label>
              {/* Title + location */}
              <div className="min-w-0 pb-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-2xl font-bold text-slate-950 dark:text-white">
                    {getProviderDisplayName(provider, form)}
                  </h2>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black bg-blue-500 dark:border-white">
                    <svg
                      viewBox="0 0 10 8"
                      className="h-3 w-3 fill-none"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 4l2.5 2.5L9 1"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {provider.headquartersCity || provider.physicalAddress ? (
                  <div className="mt-2">
                    <LocationPill
                      location={
                        provider.headquartersCity || provider.physicalAddress
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="pb-1 sm:ml-auto">
              <RatingPill
                average={ratingSummary.average}
                reviewCount={ratingSummary.reviewCount}
                onClick={() => setReviewsOpen(true)}
              />
            </div>
          </div>
        </div>
      </section>

      <FormPanel title="Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40 mb-1.5">
              Service Provider ID
            </label>
            <input
              type="text"
              value={getServiceProviderDisplayId(provider)}
              disabled
              className="w-full min-h-11 px-3 rounded-md border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed font-mono"
              readOnly
              tabIndex={-1}
            />
          </div>
          <Field
            label="Display name"
            value={form.tradingName}
            initialValue={provider.tradingName ?? ""}
            onChange={(value) => updateField("tradingName", value)}
            hasError={validationErrors.has("tradingName")}
          />
          <Field
            label="Business phone"
            value={form.businessPhone}
            initialValue={provider.businessPhone ?? ""}
            onChange={(value) => updateField("businessPhone", value)}
            hasError={validationErrors.has("businessPhone")}
          />
          <Field
            label="Business email"
            value={form.businessEmail}
            initialValue={provider.businessEmail ?? ""}
            onChange={(value) => updateField("businessEmail", value)}
            hasError={validationErrors.has("businessEmail")}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Office location
              </span>
              {validationErrors.has("headquartersCity") && (
                <span className="text-xs font-bold text-rose-500">
                  Required
                </span>
              )}
            </div>
            {form.headquartersCity ? (
              <div className="flex items-center gap-2">
                <div className="inline-flex max-w-full items-center rounded-full bg-black/[0.04] px-3.5 py-2 text-sm dark:bg-white/10">
                  <LocationIconBubble />
                  <span className="truncate font-semibold text-slate-950 dark:text-white">
                    {form.headquartersCity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateField("headquartersCity", "")}
                    className="ml-2 shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white"
                    aria-label="Clear office location"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <select
                value=""
                onChange={(event) =>
                  updateField("headquartersCity", event.target.value)
                }
                className={cn(
                  inputClassName,
                  validationErrors.has("headquartersCity")
                    ? "border-rose-400 dark:border-rose-500"
                    : "",
                )}
              >
                <option value="">Select</option>
                {LOCATION_OPTIONS.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="block self-start">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Operating locations
              </span>
              {validationErrors.has("serviceAreas") && (
                <span className="text-xs font-bold text-rose-500">
                  Required
                </span>
              )}
            </div>
            <select
              value=""
              onChange={(event) => selectLocation(event.target.value)}
              className={cn(
                inputClassName,
                validationErrors.has("serviceAreas")
                  ? "border-rose-400 dark:border-rose-500"
                  : "",
              )}
            >
              <option value="">Select</option>
              {LOCATION_OPTIONS.map((location) => (
                <option
                  key={location.value}
                  value={location.value}
                  disabled={form.serviceAreas.includes(location.value)}
                >
                  {location.label}
                </option>
              ))}
            </select>
            {form.serviceAreas.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.serviceAreas.map((location) => (
                  <div
                    key={location}
                    className="inline-flex max-w-full items-center rounded-full bg-black/[0.04] px-3.5 py-2 text-sm dark:bg-white/10"
                  >
                    <LocationIconBubble />
                    <span className="truncate font-semibold text-slate-950 dark:text-white">
                      {location}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLocation(location)}
                      className="ml-2 shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white"
                      aria-label={`Remove ${location}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </label>
        </div>

        <div className="mt-6">
          <TextArea
            label="About us"
            value={form.businessDescription}
            initialValue={provider.businessDescription ?? ""}
            onChange={(value) => updateField("businessDescription", value)}
            hasError={validationErrors.has("businessDescription")}
          />
        </div>

        <div className="mt-6 md:w-[calc(50%-0.5rem)]">
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Services
              </span>
              {validationErrors.has("selectedServices") && (
                <span className="text-xs font-bold text-rose-500">
                  Required
                </span>
              )}
            </div>
            <select
              value={form.selectedServices[0] || ""}
              onChange={(event) =>
                selectService(
                  event.target.value as ServiceProviderCategoryId | "",
                )
              }
              className={cn(
                inputClassName,
                validationErrors.has("selectedServices")
                  ? "border-rose-400 dark:border-rose-500"
                  : "",
              )}
            >
              <option value="">Select</option>
              {SERVICE_OPTIONS.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <SubscriptionTierPanel
          provider={provider}
          saving={tierSaving}
          onTogglePremium={togglePremiumTier}
        />

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={cancelChanges}
            disabled={!isProfileDirty || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-100 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveProfile}
            disabled={!isProfileDirty || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M4.5 2A2.5 2.5 0 0 0 2 4.5v11A2.5 2.5 0 0 0 4.5 18h11a2.5 2.5 0 0 0 2.5-2.5V7.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 12.586 2H4.5ZM5.5 3.75H12.5V7H5.5V3.75Z"
                clipRule="evenodd"
              />
            </svg>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </FormPanel>

      <FormPanel
        title="Operating Time"
        action={
          <SectionToggle
            checked={form.operatingTimeEnabled}
            ariaLabel="Toggle Operating Time"
            onChange={toggleOperatingTime}
          />
        }
      >
        <div
          className={cn(
            "transition-opacity duration-200",
            !form.operatingTimeEnabled && "pointer-events-none opacity-40",
          )}
        >
          {/* Day rows */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
            {DAY_OPTIONS.map((day, index) => {
              const schedule = form.operatingSchedule[day.id];

              return (
                <div
                  key={day.id}
                  className={cn(
                    "transition-colors duration-150",
                    index > 0 &&
                      "border-t border-slate-100 dark:border-white/[0.05]",
                    schedule.enabled
                      ? "bg-white dark:bg-transparent"
                      : "bg-slate-50/60 dark:bg-white/[0.01]",
                  )}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      aria-pressed={schedule.enabled}
                      disabled={!form.operatingTimeEnabled}
                      className={cn(
                        "relative h-6 w-10 shrink-0 rounded-full transition disabled:cursor-not-allowed",
                        schedule.enabled
                          ? "bg-neutral-900 dark:bg-white"
                          : "bg-neutral-200 dark:bg-white/10",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
                          schedule.enabled
                            ? "left-[18px] dark:bg-neutral-900"
                            : "left-0.5",
                        )}
                      />
                      <span className="sr-only">
                        {schedule.enabled ? "Close" : "Open"} {day.fullLabel}
                      </span>
                    </button>

                    {/* Day name + status */}
                    <div className="w-28 shrink-0">
                      <div
                        className={cn(
                          "text-sm font-semibold transition-colors duration-150",
                          schedule.enabled
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-300 dark:text-white/20",
                        )}
                      >
                        {day.fullLabel}
                      </div>
                      <div
                        className={cn(
                          "text-[11px] font-semibold transition-colors duration-150",
                          schedule.enabled
                            ? "text-emerald-500 dark:text-emerald-400"
                            : "text-rose-300 dark:text-rose-400/50",
                        )}
                      >
                        {schedule.enabled ? "Open" : "Closed"}
                      </div>
                    </div>

                    {/* Time range — desktop */}
                    <div
                      className={cn(
                        "ml-auto hidden items-end gap-3 transition-opacity duration-200 sm:flex",
                        !schedule.enabled && "pointer-events-none opacity-0",
                      )}
                    >
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Opens
                        </span>
                        <input
                          type="time"
                          value={schedule.opensAt}
                          onChange={(e) =>
                            updateOperatingTime(
                              day.id,
                              "opensAt",
                              e.target.value,
                            )
                          }
                          disabled={
                            !form.operatingTimeEnabled || !schedule.enabled
                          }
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/30"
                        />
                      </label>
                      <span className="mb-1.5 text-slate-300 dark:text-white/20">
                        —
                      </span>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Closes
                        </span>
                        <input
                          type="time"
                          value={schedule.closesAt}
                          onChange={(e) =>
                            updateOperatingTime(
                              day.id,
                              "closesAt",
                              e.target.value,
                            )
                          }
                          disabled={
                            !form.operatingTimeEnabled || !schedule.enabled
                          }
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/30"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Time range — mobile (below when open) */}
                  {schedule.enabled && (
                    <div className="flex items-center gap-2 px-4 pb-3 pl-[72px] sm:hidden">
                      <input
                        type="time"
                        value={schedule.opensAt}
                        onChange={(e) =>
                          updateOperatingTime(day.id, "opensAt", e.target.value)
                        }
                        disabled={!form.operatingTimeEnabled}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/30"
                      />
                      <span className="text-sm text-slate-300 dark:text-white/20">
                        —
                      </span>
                      <input
                        type="time"
                        value={schedule.closesAt}
                        onChange={(e) =>
                          updateOperatingTime(
                            day.id,
                            "closesAt",
                            e.target.value,
                          )
                        }
                        disabled={!form.operatingTimeEnabled}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/30"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={cancelChanges}
            disabled={!isOperatingTimeDirty || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-100 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveProfile}
            disabled={!isOperatingTimeDirty || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M4.5 2A2.5 2.5 0 0 0 2 4.5v11A2.5 2.5 0 0 0 4.5 18h11a2.5 2.5 0 0 0 2.5-2.5V7.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 12.586 2H4.5ZM5.5 3.75H12.5V7H5.5V3.75Z"
                clipRule="evenodd"
              />
            </svg>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </FormPanel>

      <FormPanel title="Contact Person">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Name"
            value={form.mainContactPerson}
            initialValue={provider.mainContactPerson ?? ""}
            onChange={(value) => updateField("mainContactPerson", value)}
            hasError={validationErrors.has("mainContactPerson")}
          />
          <Field
            label="Phone number"
            value={form.contactPersonPhone}
            initialValue={
              provider.contactPersonPhone || provider.businessPhone || ""
            }
            onChange={(value) => updateField("contactPersonPhone", value)}
            hasError={validationErrors.has("contactPersonPhone")}
          />
          <Field
            label="Email address"
            value={form.businessEmail}
            initialValue={provider.businessEmail ?? ""}
            onChange={(value) => updateField("businessEmail", value)}
            hasError={validationErrors.has("businessEmail")}
          />
          <TextArea
            label="Physical address"
            value={form.physicalAddress}
            initialValue={provider.physicalAddress ?? ""}
            onChange={(value) => updateField("physicalAddress", value)}
            className="md:col-span-2"
            hasError={validationErrors.has("physicalAddress")}
          />
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                ID type
              </span>
              {validationErrors.has("contactPersonIdType") && (
                <span className="text-xs font-bold text-rose-500">
                  Required
                </span>
              )}
            </div>
            <select
              value={form.contactPersonIdType}
              onChange={(e) =>
                updateField("contactPersonIdType", e.target.value)
              }
              className={cn(
                inputClassName,
                form.contactPersonIdType === ""
                  ? "border-rose-400 focus:border-rose-400 dark:border-rose-500 dark:focus:border-rose-500"
                  : form.contactPersonIdType !==
                      (provider.contactPersonIdType || "")
                    ? "border-emerald-500 focus:border-emerald-500 dark:border-emerald-400 dark:focus:border-emerald-400"
                    : "",
              )}
            >
              <option value="">Select</option>
              <option value="id">National ID</option>
              <option value="passport">Passport</option>
            </select>
          </label>
          <Field
            label="ID / Passport number"
            value={form.contactPersonIdNumber}
            initialValue={provider.contactPersonIdNumber || ""}
            hasError={validationErrors.has("contactPersonIdNumber")}
            onChange={(value) => updateField("contactPersonIdNumber", value)}
          />
        </div>

        {/* ID document upload */}
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                ID Document
              </div>
            </div>
            {validationErrors.has("contact_person_id") && (
              <span className="text-xs font-bold text-rose-500">Required</span>
            )}
          </div>

          {documentsByType.contact_person_id ? (
            <div className="inline-flex max-w-full items-center rounded-full border-2 border-emerald-500 bg-black/[0.04] px-3.5 py-2 text-sm dark:border-emerald-400 dark:bg-white/10">
              <span className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
                <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-white/55" />
              </span>
              <span className="truncate font-semibold text-slate-950 dark:text-white">
                {documentsByType.contact_person_id.fileName}
              </span>
              <button
                type="button"
                onClick={() => deleteDocument("contact_person_id")}
                disabled={uploading === "contact_person_id"}
                className="ml-2 shrink-0 rounded-full p-0.5 text-slate-400 transition hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40 dark:text-white/40 dark:hover:text-white"
                aria-label="Remove document"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed border-rose-400 px-4 py-8 text-center transition hover:border-rose-500 hover:bg-rose-50/30 dark:border-rose-500/50 dark:hover:border-rose-500/70 dark:hover:bg-rose-500/[0.03]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition motion-safe:animate-pulse dark:bg-[#1c1c1e]">
                <FilePlus className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-950 dark:text-white">
                {uploading === "contact_person_id"
                  ? "Uploading…"
                  : "Upload document"}
              </span>
              <span className="text-xs text-slate-400 dark:text-white/30">
                PNG, JPG or PDF up to 10 MB
              </span>
              <input
                type="file"
                className="sr-only"
                onChange={(e) =>
                  handleFileChange(e, (file) =>
                    uploadDocument("contact_person_id", file),
                  )
                }
              />
            </label>
          )}

          {documentsByType.contact_person_id && (
            <div className="mt-4 grid gap-3">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                  Document status
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      value: "uploaded",
                      label: "Pending review",
                      active:
                        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
                    },
                    {
                      value: "approved",
                      label: "Approved",
                      active:
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
                    },
                    {
                      value: "rejected",
                      label: "Rejected",
                      active:
                        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateDocument("contact_person_id", {
                          status: opt.value,
                        })
                      }
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                        (form.documents.find(
                          (d) => d.type === "contact_person_id",
                        )?.status ||
                          documentsByType.contact_person_id?.status ||
                          "uploaded") === opt.value
                          ? opt.active
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-white/40 dark:hover:bg-white/10",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                    Review notes
                  </span>
                </div>
                <textarea
                  value={
                    form.documents.find((d) => d.type === "contact_person_id")
                      ?.notes ??
                    documentsByType.contact_person_id?.notes ??
                    ""
                  }
                  onChange={(e) =>
                    updateDocument("contact_person_id", {
                      notes: e.target.value,
                    })
                  }
                  placeholder="Add review notes…"
                  className={cn(inputClassName, "min-h-20 resize-y py-3")}
                />
              </label>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={cancelChanges}
            disabled={!isContactDirty || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-100 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveProfile}
            disabled={!isContactDirty || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M4.5 2A2.5 2.5 0 0 0 2 4.5v11A2.5 2.5 0 0 0 4.5 18h11a2.5 2.5 0 0 0 2.5-2.5V7.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 12.586 2H4.5ZM5.5 3.75H12.5V7H5.5V3.75Z"
                clipRule="evenodd"
              />
            </svg>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </FormPanel>

      <FormPanel
        title="Listings"
        action={
          <button
            type="button"
            onClick={addListing}
            disabled={addingListing}
            className="flex flex-col items-center justify-center py-0 transition hover:bg-slate-300/30 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-white/[0.04]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition motion-safe:animate-pulse dark:bg-[#1c1c1e]">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </span>
            {/* No text label, icon only */}
          </button>
        }
      >
        <ListingsManagerPanel
          listings={serviceListings}
          allProviderListings={listings}
          loading={loadingListings}
          editingListingId={editingListingId}
          listingEditForm={listingEditForm}
          deletingListingId={deletingListingId}
          service={selectedService}
          serviceProviderId={getServiceProviderDisplayId(provider)}
          operatingLocations={form.serviceAreas}
          displayName={getProviderDisplayName(provider, form)}
          savingListingId={savingListingId}
          validationAttemptedIds={listingValidationAttemptedIds}
          onEditListing={updateListingEdit}
          onCancelListing={cancelEditListing}
          onSaveListing={saveListingEdit}
          onDeleteListing={deleteListing}
        />
      </FormPanel>

      <FormPanel
        title="Gallery"
        action={
          <SectionToggle
            checked={gallerySectionActive}
            ariaLabel="Toggle listing gallery"
            disabled={!hasGalleryAccess}
            onChange={setGalleryPanelEnabled}
          />
        }
      >
        <GalleryManagerPanel
          active={gallerySectionActive}
          listings={serviceListings}
          selectedListingId={selectedGalleryListingId}
          selectedListing={selectedGalleryListing}
          gallery={selectedListingGallery}
          loading={loadingGallery || loadingListings}
          uploading={uploading === `gallery:${selectedGalleryListingId}`}
          reviewingMediaId={reviewingMediaId}
          onSelectListing={setSelectedGalleryListingId}
          onUpload={(files) =>
            uploadListingGalleryImages(selectedGalleryListingId, files)
          }
          onReview={reviewGalleryImage}
        />
      </FormPanel>

      <FormPanel title="Company verification">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Company name as per certificate of incorporation (Pvt) Ltd"
            value={form.legalCompanyName}
            initialValue={provider.legalCompanyName || provider.companyName}
            onChange={(value) => updateField("legalCompanyName", value)}
            hasError={validationErrors.has("legalCompanyName")}
          />
          <Field
            label="Date incorporated"
            value={form.incorporationDate}
            initialValue={formatDateInput(provider.incorporationDate)}
            type="date"
            onChange={(value) => updateField("incorporationDate", value)}
            icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
          />
          <Field
            label="Company registration number"
            value={form.businessRegistrationNumber}
            initialValue={provider.businessRegistrationNumber ?? ""}
            onChange={(value) =>
              updateField("businessRegistrationNumber", value)
            }
            hasError={validationErrors.has("businessRegistrationNumber")}
          />
        </div>
        <div className="mt-4">
          <DocumentRequirement
            document={documentsByType.certificate_of_incorporation}
            definition={REQUIRED_DOCUMENTS[0]}
            editable={form.documents.find(
              (item) => item.type === "certificate_of_incorporation",
            )}
            uploading={uploading === "certificate_of_incorporation"}
            onUpload={(file) =>
              uploadDocument("certificate_of_incorporation", file)
            }
            onStatusChange={(status) =>
              updateDocument("certificate_of_incorporation", { status })
            }
            onNotesChange={(notes) =>
              updateDocument("certificate_of_incorporation", { notes })
            }
          />
        </div>
      </FormPanel>

      <FormPanel title="ZIMRA and tax clearance">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="ZIMRA BP number"
            value={form.zimraBpNumber}
            initialValue={provider.zimraBpNumber || ""}
            onChange={(value) => updateField("zimraBpNumber", value)}
            hasError={validationErrors.has("zimraBpNumber")}
          />
          <Field
            label="TIN number"
            value={form.tinNumber}
            initialValue={provider.tinNumber || ""}
            onChange={(value) => updateField("tinNumber", value)}
            hasError={validationErrors.has("tinNumber")}
          />
          <Field
            label="Tax clearance expiry date"
            value={form.taxClearanceExpiresAt}
            initialValue={formatDateInput(provider.taxClearanceExpiresAt)}
            type="date"
            onChange={(value) => updateField("taxClearanceExpiresAt", value)}
            icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
          />
        </div>
        <div className="mt-4">
          <DocumentRequirement
            document={documentsByType.tax_clearance}
            definition={REQUIRED_DOCUMENTS[2]}
            editable={form.documents.find(
              (item) => item.type === "tax_clearance",
            )}
            uploading={uploading === "tax_clearance"}
            onUpload={(file) => uploadDocument("tax_clearance", file)}
            onStatusChange={(status) =>
              updateDocument("tax_clearance", { status })
            }
            onNotesChange={(notes) =>
              updateDocument("tax_clearance", { notes })
            }
          />
        </div>
      </FormPanel>

      <FormPanel title="Admin review">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Review decision
              </span>
            </div>
            <select
              value={reviewDecision.status}
              onChange={(event) =>
                reviewDecision.setStatus(event.target.value as ReviewStatus)
              }
              className={inputClassName}
            >
              <option value="basic_approved">Approve basic</option>
              <option value="changes_requested">Request changes</option>
              <option value="verified_premium">Approve premium</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={reviewDecision.submitReview}
              disabled={reviewDecision.saving}
              className={cn(
                actionButtonVariants({ variant: "primary", size: "lg" }),
              )}
            >
              {reviewDecision.saving ? "Saving..." : "Save review decision"}
            </button>
          </div>
          <TextArea
            label="Review notes"
            value={reviewDecision.notes}
            onChange={reviewDecision.setNotes}
          />
          <TextArea
            label="Internal summary"
            value={reviewDecision.internalSummary}
            onChange={reviewDecision.setInternalSummary}
          />
        </div>
      </FormPanel>

      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101010] sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={cancelChanges}
          disabled={!isDirty || saving}
          className={cn(
            actionButtonVariants({ variant: "secondary", size: "lg" }),
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveProfile}
          disabled={!isDirty || saving}
          className={cn(
            actionButtonVariants({ variant: "primary", size: "lg" }),
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M4.5 2A2.5 2.5 0 0 0 2 4.5v11A2.5 2.5 0 0 0 4.5 18h11a2.5 2.5 0 0 0 2.5-2.5V7.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 12.586 2H4.5ZM5.5 3.75H12.5V7H5.5V3.75Z"
              clipRule="evenodd"
            />
          </svg>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function DocumentRequirement({
  document,
  definition,
  editable,
  uploading,
  onUpload,
  onStatusChange,
  onNotesChange,
}: {
  document?: ProviderDocumentRecord;
  definition: (typeof REQUIRED_DOCUMENTS)[number];
  editable?: EditableDocument;
  uploading: boolean;
  onUpload: (file?: File | null) => void;
  onStatusChange: (status: string) => void;
  onNotesChange: (notes: string) => void;
}) {
  const Icon = definition.icon;
  const status = documentStatus(document);

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.08]">
          <Icon className="h-4 w-4 text-slate-500 dark:text-white/55" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-950 dark:text-white">
                {definition.title}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                {definition.body}
              </div>
            </div>
            <DocumentStatusIcon status={status} />
          </div>

          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/[0.04] dark:text-white/55">
            {document?.fileName || "No file uploaded"}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                  Document status
                </span>
              </div>
              <select
                value={editable?.status || document?.status || "uploaded"}
                onChange={(event) => onStatusChange(event.target.value)}
                disabled={!document}
                className={inputClassName}
              >
                {documentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className={cn(
                actionButtonVariants({ variant: "secondary" }),
                "cursor-pointer justify-center",
              )}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : document ? "Replace" : "Upload"}
              <input
                type="file"
                className="sr-only"
                onChange={(event) => handleFileChange(event, onUpload)}
              />
            </label>
          </div>

          <label className="mt-3 block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Review notes
              </span>
            </div>
            <textarea
              value={editable?.notes ?? document?.notes ?? ""}
              onChange={(event) => onNotesChange(event.target.value)}
              disabled={!document}
              placeholder="Add review notes…"
              className={cn(inputClassName, "min-h-20 resize-y py-3")}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function DocumentStatusIcon({ status }: { status: DocumentStatus }) {
  if (status === "approved") {
    return (
      <span title="Reviewed and approved" className="text-emerald-500">
        <CheckCircle2 className="h-6 w-6" />
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span title="Uploaded, awaiting review" className="text-amber-500">
        <Hourglass className="h-6 w-6" />
      </span>
    );
  }

  return (
    <span
      title={status === "rejected" ? "Reviewed and rejected" : "Missing"}
      className="text-rose-500"
    >
      <XCircle className="h-6 w-6" />
    </span>
  );
}

function FormPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SelectorBlock({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <div className="mb-3">
        <div className="text-sm font-medium text-slate-950 dark:text-white">
          {title}
        </div>
        {body ? (
          <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
            {body}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SelectedList({
  values,
  onRemove,
  empty,
  icon,
}: {
  values: Array<{ id: string; label: string }>;
  onRemove: (id: string) => void;
  empty: string;
  icon?: ReactNode;
}) {
  if (values.length === 0) {
    return (
      <div className="mt-3 text-sm text-slate-500 dark:text-white/40">
        {empty}
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      {values.map((value) => (
        <div
          key={value.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate">{value.label}</span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(value.id)}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={`Remove ${value.label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ListingsManagerPanel({
  listings,
  allProviderListings,
  loading,
  editingListingId,
  listingEditForm,
  deletingListingId,
  service,
  serviceProviderId,
  operatingLocations,
  displayName,
  savingListingId,
  validationAttemptedIds,
  onEditListing,
  onCancelListing,
  onSaveListing,
  onDeleteListing,
}: {
  listings: AdminListingRecord[];
  allProviderListings: AdminListingRecord[];
  loading: boolean;
  editingListingId: string;
  listingEditForm: ListingEditForm;
  deletingListingId: string;
  service: ServiceProviderCategoryId;
  serviceProviderId: string;
  operatingLocations: string[];
  displayName: string;
  savingListingId: string;
  validationAttemptedIds: Set<string>;
  onEditListing: (
    listing: AdminListingRecord,
    patch: Partial<ListingEditForm>,
  ) => void;
  onCancelListing: () => void;
  onSaveListing: () => void;
  onDeleteListing: (listing: AdminListingRecord) => void;
}) {
  const config = LISTING_SERVICE_CONFIG[service];
  const typeOptions = getListingTypeOptions(service);
  const pricingOptions = getListingPricingOptions(service);
  const includedOptions = getListingIncludedOptions(service);
  const notAllowedOptions = getListingNotAllowedOptions(service);
  const [activeFilter, setActiveFilter] = useState<ListingStatusFilter>("all");
  const [customOptionInputs, setCustomOptionInputs] = useState<
    Record<string, { included: string; notAllowed: string }>
  >({});
  const filteredListings = useMemo(
    () =>
      listings.filter((listing) =>
        listingMatchesStatusFilter(listing.status, activeFilter),
      ),
    [activeFilter, listings],
  );
  const listingStats = getListingStatusStats(listings);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { value: "all" as const, label: "All", count: listingStats.all },
          {
            value: "approved" as const,
            label: "Approved",
            count: listingStats.approved,
          },
          {
            value: "pending" as const,
            label: "Pending",
            count: listingStats.pending,
          },
          {
            value: "archived" as const,
            label: "Archived",
            count: listingStats.archived,
          },
          {
            value: "rejected" as const,
            label: "Rejected",
            count: listingStats.rejected,
          },
        ].map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition",
              activeFilter === filter.value
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
            )}
          >
            <span className="font-semibold">{filter.count}</span>
            <span className="ml-2">{filter.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]"
            />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyPanel title={config.emptyTitle} body={config.emptyBody} />
      ) : (
        <div className="space-y-3">
          {filteredListings.map((listing) => {
            const listingDisplayId = getListingDisplayId(
              serviceProviderId,
              listing,
              allProviderListings,
            );
            const editing = listing.id === editingListingId;
            const values = editing
              ? listingEditForm
              : toListingEditForm(listing, displayName);
            const initialValues = toListingEditForm(listing, displayName);
            const statusValue = values.status || listing.status;
            const isStayListing = service === "stays";
            const isActive =
              statusValue === "active" || statusValue === "approved";
            const canToggleArchive = canToggleListingArchive(statusValue);
            const isDirty =
              editing && listingEditFormChanged(values, initialValues);
            const showRequiredState =
              editing && validationAttemptedIds.has(listing.id);
            const locationValue = operatingLocations.includes(values.location)
              ? values.location
              : "";
            const customInput = customOptionInputs[listing.id] ?? {
              included: "",
              notAllowed: "",
            };
            const edit = (patch: Partial<ListingEditForm>) =>
              onEditListing(listing, patch);
            const updateCustomInput = (
              field: "included" | "notAllowed",
              value: string,
            ) => {
              setCustomOptionInputs((current) => ({
                ...current,
                [listing.id]: {
                  included: current[listing.id]?.included ?? "",
                  notAllowed: current[listing.id]?.notAllowed ?? "",
                  [field]: value,
                },
              }));
            };
            const addCustomOption = (
              field: "included" | "notAllowed",
              fallback: string,
            ) => {
              const value = customInput[field].trim();
              if (!value) return;
              edit({
                [field]: addCustomListingOption(values[field], value, fallback),
              });
              updateCustomInput(field, "");
            };

            return (
              <div
                key={listing.id}
                className="relative rounded-xl border border-slate-200 bg-white p-3 transition dark:border-white/10 dark:bg-[#0b0b0b]"
              >
                <button
                  type="button"
                  onClick={() => onDeleteListing(listing)}
                  disabled={deletingListingId === listing.id}
                  aria-label={`Delete ${listing.title}`}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 shadow-sm transition hover:bg-rose-100 hover:text-rose-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15 dark:hover:text-rose-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid gap-3 pr-12 md:grid-cols-[220px_minmax(0,280px)_minmax(0,220px)] lg:grid-cols-[220px_minmax(0,280px)_minmax(0,220px)_minmax(0,1fr)] lg:items-end">
                  <label className="block">
                    <ListingFieldLabel>Listing ID</ListingFieldLabel>
                    <input
                      value={listingDisplayId}
                      disabled
                      readOnly
                      className={cn(
                        inputClassName,
                        "font-mono text-xs disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-white/45",
                      )}
                    />
                  </label>

                  <label className="block">
                    <ListingFieldLabel
                      required={showRequiredState && !locationValue}
                    >
                      Operating location
                    </ListingFieldLabel>
                    <select
                      value={locationValue}
                      onChange={(event) =>
                        edit({ location: event.target.value })
                      }
                      disabled={operatingLocations.length === 0}
                      className={cn(
                        inputClassName,
                        getListingRequiredFieldClass(
                          locationValue,
                          showRequiredState,
                        ),
                      )}
                    >
                      <option value="">Select</option>
                      {operatingLocations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-28">
                      <ListingFieldLabel>Status</ListingFieldLabel>
                      <div className="flex min-h-11 items-center">
                        <StatusPill
                          value={getListingStatusDisplayValue(statusValue)}
                        />
                      </div>
                    </div>
                    <ListingActivationToggle
                      checked={isActive}
                      disabled={!canToggleArchive}
                      onChange={(checked) =>
                        edit({
                          status: checked ? "active" : "archived",
                          visibility: checked ? "public" : "private",
                        })
                      }
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-3 grid gap-3 md:grid-cols-2",
                    isStayListing ? "xl:grid-cols-5" : "xl:grid-cols-4",
                  )}
                >
                  <label className="block">
                    <ListingFieldLabel
                      required={showRequiredState && !values.listingType}
                    >
                      {service === "stays" ? "Room type" : "Listing type"}
                    </ListingFieldLabel>
                    <select
                      value={values.listingType}
                      onChange={(event) =>
                        edit({ listingType: event.target.value })
                      }
                      className={cn(
                        inputClassName,
                        getListingRequiredFieldClass(
                          values.listingType,
                          showRequiredState,
                        ),
                      )}
                    >
                      <option value="">Select</option>
                      {typeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  {isStayListing ? (
                    <ListingSelectControl
                      label="Total rooms"
                      value={values.totalUnits}
                      options={ROOM_COUNT_OPTIONS}
                      required
                      showRequiredState={showRequiredState}
                      onChange={(value) => edit({ totalUnits: value })}
                    />
                  ) : null}

                  <label className="block">
                    <ListingFieldLabel
                      required={showRequiredState && !values.pricingModel}
                    >
                      Pricing model
                    </ListingFieldLabel>
                    <select
                      value={values.pricingModel}
                      onChange={(event) =>
                        edit({ pricingModel: event.target.value })
                      }
                      className={cn(
                        inputClassName,
                        getListingRequiredFieldClass(
                          values.pricingModel,
                          showRequiredState,
                        ),
                      )}
                    >
                      <option value="">Select</option>
                      {pricingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <ListingFieldLabel
                      required={showRequiredState && !values.basePrice}
                    >
                      {service === "stays" ? "Price / night" : "Price"}
                    </ListingFieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-white/45">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={values.basePrice}
                        onChange={(event) =>
                          edit({ basePrice: event.target.value })
                        }
                        className={cn(
                          inputClassName,
                          "pl-7",
                          getListingRequiredFieldClass(
                            values.basePrice,
                            showRequiredState,
                          ),
                        )}
                      />
                    </div>
                  </label>

                  <label className="block">
                    <ListingFieldLabel
                      required={showRequiredState && !values.capacity}
                    >
                      {service === "stays" ? "Max guests" : "Capacity"}
                    </ListingFieldLabel>
                    <select
                      value={values.capacity}
                      onChange={(event) =>
                        edit({ capacity: event.target.value })
                      }
                      className={cn(
                        inputClassName,
                        getListingRequiredFieldClass(
                          values.capacity,
                          showRequiredState,
                        ),
                      )}
                    >
                      <option value="">Select</option>
                      {GUEST_CAPACITY_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label
                    className={cn(
                      "block md:col-span-2",
                      isStayListing ? "xl:col-span-5" : "xl:col-span-4",
                    )}
                  >
                    <ListingFieldLabel
                      required={showRequiredState && !values.shortDescription}
                    >
                      Short description
                    </ListingFieldLabel>
                    <textarea
                      value={values.shortDescription}
                      onChange={(event) =>
                        edit({ shortDescription: event.target.value })
                      }
                      className={cn(
                        inputClassName,
                        "min-h-20 py-3",
                        getListingRequiredFieldClass(
                          values.shortDescription,
                          showRequiredState,
                        ),
                      )}
                      placeholder="Add"
                    />
                  </label>

                  {isStayListing ? (
                    <StaysListingCalendarPanel
                      listing={listing}
                      values={values}
                    />
                  ) : null}

                  <div
                    className={cn(
                      "md:col-span-2",
                      isStayListing ? "xl:col-span-5" : "xl:col-span-4",
                    )}
                  >
                    <ListingFieldLabel
                      required={
                        showRequiredState && values.included.length === 0
                      }
                    >
                      Included
                    </ListingFieldLabel>
                    <ListingOptionChips
                      options={getVisibleListingOptions(
                        includedOptions,
                        values.included,
                      )}
                      selected={values.included}
                      tone="included"
                      onToggle={(option) =>
                        edit({
                          included: toggleListingOption(
                            values.included,
                            option,
                            "No inclusions listed",
                          ),
                        })
                      }
                    />
                    <ListingCustomOptionInput
                      value={customInput.included}
                      placeholder="Add"
                      onChange={(value) => updateCustomInput("included", value)}
                      onAdd={() =>
                        addCustomOption("included", "No inclusions listed")
                      }
                    />
                  </div>

                  <div
                    className={cn(
                      "md:col-span-2",
                      isStayListing ? "xl:col-span-5" : "xl:col-span-4",
                    )}
                  >
                    <ListingFieldLabel
                      required={
                        showRequiredState && values.notAllowed.length === 0
                      }
                    >
                      Not allowed
                    </ListingFieldLabel>
                    <ListingOptionChips
                      options={getVisibleListingOptions(
                        notAllowedOptions,
                        values.notAllowed,
                      )}
                      selected={values.notAllowed}
                      tone="blocked"
                      onToggle={(option) =>
                        edit({
                          notAllowed: toggleListingOption(
                            values.notAllowed,
                            option,
                            "No restrictions listed",
                          ),
                        })
                      }
                    />
                    <ListingCustomOptionInput
                      value={customInput.notAllowed}
                      placeholder="Add"
                      onChange={(value) =>
                        updateCustomInput("notAllowed", value)
                      }
                      onAdd={() =>
                        addCustomOption("notAllowed", "No restrictions listed")
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-col-reverse items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={onCancelListing}
                    disabled={!editing || savingListingId !== ""}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:pointer-events-none disabled:opacity-45 dark:border-white/10 dark:text-white/60 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveListing}
                    disabled={!isDirty || savingListingId !== ""}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-45 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  >
                    {savingListingId === listing.id ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StaysListingCalendarPanel({
  listing,
  values,
}: {
  listing: AdminListingRecord;
  values: ListingEditForm;
}) {
  return (
    <div className="md:col-span-2 xl:col-span-5">
      <div>
        <ListingFieldLabel>Calendar & Availability</ListingFieldLabel>
        <StayCalendarPanel listing={listing} values={values} />
      </div>
    </div>
  );
}

type ListingSelectOption = string | { value: string; label: string };

function ListingSelectControl({
  label,
  value,
  options,
  required = false,
  showRequiredState,
  onChange,
}: {
  label: string;
  value: string;
  options: ListingSelectOption[];
  required?: boolean;
  showRequiredState: boolean;
  onChange: (value: string) => void;
}) {
  const showValidationState = required && showRequiredState;

  return (
    <label className="block">
      <ListingFieldLabel required={showValidationState && !value}>
        {label}
      </ListingFieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          inputClassName,
          getListingRequiredFieldClass(value, showValidationState),
        )}
      >
        <option value="">Select</option>
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;

          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function StayCalendarPanel({
  listing,
  values,
}: {
  listing: AdminListingRecord;
  values: ListingEditForm;
}) {
  const totalUnits = parsePositiveInt(values.totalUnits) || 0;
  const today = useMemo(
    () => parseCalendarDateKey(getCalendarDateKey(new Date())),
    [],
  );
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(today));
  const [selectedDate, setSelectedDate] = useState(() =>
    getCalendarDateKey(today),
  );
  const days = getStayCalendarMonthCells(listing, totalUnits, visibleMonth);
  const selectedDay = getStayDateOccupancy(listing, totalUnits, selectedDate);
  const roomType = values.listingType || "Room type";
  const visibleBookings = selectedDay.bookings.slice(0, 4);
  const isCurrentMonth = isSameCalendarMonth(visibleMonth, today);
  const monthLabel = formatCalendarMonthLabel(visibleMonth);

  const moveMonth = (direction: -1 | 1) => {
    if (direction === -1 && isCurrentMonth) return;
    setVisibleMonth((current) => {
      const nextMonth = getMonthStart(addCalendarMonths(current, direction));
      setSelectedDate(
        getCalendarDateKey(getDefaultSelectedDate(nextMonth, today)),
      );
      return nextMonth;
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b0b0b]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-white/60">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              {formatCalendarDateLabel(selectedDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-white/10 dark:bg-white/[0.04] sm:min-w-56">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            disabled={isCurrentMonth}
            aria-label="Previous month"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 disabled:pointer-events-none disabled:opacity-35 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-28 text-center text-sm font-semibold text-slate-950 dark:text-white">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <StayCalendarMetric label="Room type" value={roomType} />
        <StayCalendarMetric
          label="Total rooms"
          value={String(totalUnits || 0)}
        />
        <StayCalendarMetric
          label="Booked"
          value={String(selectedDay.bookedRooms)}
        />
        <StayCalendarMetric
          label="Available"
          value={String(selectedDay.availableRooms)}
        />
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {CALENDAR_WEEKDAY_LABELS.map((weekday) => (
          <div
            key={weekday}
            className="px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/35"
          >
            {weekday}
          </div>
        ))}
        {days.map((day, index) =>
          day ? (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedDate(day.key)}
              className={cn(
                "min-h-16 rounded-lg border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                selectedDate === day.key &&
                  "ring-2 ring-slate-950/15 dark:ring-white/20",
                day.status === "booked"
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
                  : day.status === "limited"
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
                    : day.status === "blocked"
                      ? "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/45"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
              )}
            >
              <div className="text-sm font-bold">{day.day}</div>
              <div className="mt-2 truncate text-[10px] font-semibold capitalize">
                {day.label}
              </div>
            </button>
          ) : (
            <div key={`blank-${index}`} className="min-h-16 rounded-lg" />
          ),
        )}
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Bookings on {formatCalendarDateLabel(selectedDate)}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-white/45">
              {selectedDay.bookedRooms} of {totalUnits || 0} {roomType} rooms
              booked
            </div>
          </div>
          <StatusPill value={selectedDay.status} />
        </div>

        {visibleBookings.length > 0 ? (
          <div className="mt-3 space-y-2">
            {visibleBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-[#0b0b0b]"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-white/80">
                    {booking.confirmationNumber || "Booking"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/45">
                    {formatBookingDateRange(booking.checkIn, booking.checkOut)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/45">
                    {booking.guests ? `${booking.guests} guests` : "Guests TBC"}
                  </span>
                  <StatusPill value={booking.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-500 dark:bg-[#0b0b0b] dark:text-white/45">
            No bookings for this room type on the selected date.
          </div>
        )}
      </div>
    </div>
  );
}

function StayCalendarMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function ListingActivationToggle({
  checked,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition",
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/15",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
      <span className="sr-only">
        {checked ? "Archive listing" : "Activate listing"}
      </span>
    </button>
  );
}

function ListingFieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
        {children}
      </span>
      {required ? (
        <span className="text-xs font-bold text-rose-500">Required</span>
      ) : null}
    </div>
  );
}

function getListingRequiredFieldClass(value: string, showState: boolean) {
  if (!showState) return "";

  return value.trim()
    ? "border-emerald-500 focus:border-emerald-500 dark:border-emerald-400 dark:focus:border-emerald-400"
    : "border-rose-400 focus:border-rose-400 dark:border-rose-500 dark:focus:border-rose-500";
}

function ListingOptionChips({
  options,
  selected,
  tone,
  onToggle,
}: {
  options: string[];
  selected: string[];
  tone: "included" | "blocked";
  onToggle: (option: string) => void;
}) {
  const Icon = tone === "included" ? CheckCircle2 : XCircle;

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition",
              active
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-400/10 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                tone === "included"
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-rose-500 dark:text-rose-400",
              )}
            />
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function ListingCustomOptionInput({
  value,
  placeholder,
  onChange,
  onAdd,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-2 flex max-w-xl gap-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        className={cn(inputClassName, "min-h-10")}
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={!value.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
        aria-label={placeholder}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function LegacyListingsManagerPanel({
  listings,
  loading,
  selectedListingId,
  deletingListingId,
  service,
  onSelectListing,
  onDeleteListing,
}: {
  listings: AdminListingRecord[];
  loading: boolean;
  selectedListingId: string;
  deletingListingId: string;
  service: ServiceProviderCategoryId;
  onSelectListing: (listingId: string) => void;
  onDeleteListing: (listing: AdminListingRecord) => void;
}) {
  const config = LISTING_SERVICE_CONFIG[service];
  const [activeFilter, setActiveFilter] = useState<string>("total");
  const listingStats = {
    all: listings.length,
    active: listings.filter((listing) => listing.status === "active").length,
    pending_review: listings.filter(
      (listing) => listing.status === "pending_review",
    ).length,
    archived: listings.filter((listing) => listing.status === "archived")
      .length,
    rejected: listings.filter((listing) => listing.status === "rejected")
      .length,
  };

  // Filter listings based on activeFilter
  const filteredListings = useMemo(() => {
    switch (activeFilter) {
      case "active":
        return listings.filter((listing) => listing.status === "active");
      case "pending_review":
        return listings.filter(
          (listing) => listing.status === "pending_review",
        );
      case "archived":
        return listings.filter((listing) => listing.status === "archived");
      case "rejected":
        return listings.filter((listing) => listing.status === "rejected");
      case "all":
      default:
        return listings;
    }
  }, [listings, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* All */}
        <button
          type="button"
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none",
            activeFilter === "all"
              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
          )}
          onClick={() => setActiveFilter("all")}
        >
          <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
            <svg
              className="h-4 w-4 text-slate-500 dark:text-white/60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="4" y="6" width="16" height="12" rx="2" />
              <path d="M4 10h16" />
            </svg>
          </span>
          <span className="font-semibold">{listingStats.all}</span>
          <span className="ml-2">All</span>
        </button>
        {/* Active */}
        <button
          type="button"
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none",
            activeFilter === "active"
              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
          )}
          onClick={() => setActiveFilter("active")}
        >
          <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
            <svg
              className="h-4 w-4 text-emerald-500 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-semibold">{listingStats.active}</span>
          <span className="ml-2">Active</span>
        </button>
        {/* Pending Review */}
        <button
          type="button"
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none",
            activeFilter === "pending_review"
              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
          )}
          onClick={() => setActiveFilter("pending_review")}
        >
          <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
            <IonHourglassOutline className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </span>
          <span className="font-semibold">{listingStats.pending_review}</span>
          <span className="ml-2">Pending</span>
        </button>
        {/* Archived */}
        <button
          type="button"
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none",
            activeFilter === "archived"
              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
          )}
          onClick={() => setActiveFilter("archived")}
        >
          <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
            <IonFolderOpen className="h-4 w-4 text-slate-400 dark:text-white/40" />
          </span>
          <span className="font-semibold">{listingStats.archived}</span>
          <span className="ml-2">Archived</span>
        </button>
        {/* Rejected */}
        <button
          type="button"
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none",
            activeFilter === "rejected"
              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
          )}
          onClick={() => setActiveFilter("rejected")}
        >
          <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
            <svg
              className="h-4 w-4 text-rose-500 dark:text-rose-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-semibold">{listingStats.rejected}</span>
          <span className="ml-2">Rejected</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06]"
            />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyPanel title={config.emptyTitle} body={config.emptyBody} />
      ) : (
        <div className="space-y-3">
          {filteredListings.map((listing) => {
            const selected = listing.id === selectedListingId;
            const details = getServiceListingDetails(service, listing);

            return (
              <div
                key={listing.id}
                className={cn(
                  "rounded-xl border p-4 transition",
                  selected
                    ? "border-slate-900/40 bg-slate-900/[0.04] dark:border-white/30 dark:bg-white/[0.06]"
                    : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0b]",
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-semibold text-slate-950 dark:text-white">
                        {listing.title}
                      </h4>
                      <StatusPill value={listing.status} />
                      <StatusPill value={listing.visibility} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-white/45">
                      <span>{listing.location}</span>
                      <span>{listing.bookingMode.replace(/_/g, " ")}</span>
                      <span>Updated {formatShortDate(listing.updatedAt)}</span>
                    </div>
                    {listing.shortDescription ? (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/55">
                        {listing.shortDescription}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectListing(listing.id)}
                      className={cn(
                        actionButtonVariants({
                          variant: selected ? "primary" : "secondary",
                          size: "sm",
                        }),
                      )}
                    >
                      {selected ? "Selected" : "Select"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteListing(listing)}
                      disabled={deletingListingId === listing.id}
                      className={cn(
                        actionButtonVariants({
                          variant: "danger",
                          size: "sm",
                        }),
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingListingId === listing.id
                        ? "Removing..."
                        : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {details.map((detail) => (
                    <ListingDetail
                      key={detail.label}
                      label={detail.label}
                      value={detail.value}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GalleryManagerPanel({
  active,
  listings,
  selectedListingId,
  selectedListing,
  gallery,
  loading,
  uploading,
  reviewingMediaId,
  onSelectListing,
  onUpload,
  onReview,
}: {
  active: boolean;
  listings: AdminListingRecord[];
  selectedListingId: string;
  selectedListing: AdminListingRecord | null;
  gallery: ProviderMediaRecord[];
  loading: boolean;
  uploading: boolean;
  reviewingMediaId: string;
  onSelectListing: (listingId: string) => void;
  onUpload: (files: File[]) => void;
  onReview: (
    image: ProviderMediaRecord,
    status: "approved" | "rejected" | "pending_review",
  ) => void;
}) {
  const stats = getGalleryReviewStats(gallery);
  const pendingImages = gallery.filter(
    (image) => image.status === "pending_review",
  );
  const approvedImages = gallery.filter((image) => image.status === "approved");
  const rejectedImages = gallery.filter((image) => image.status === "rejected");
  const canUpload =
    active &&
    Boolean(selectedListing) &&
    !loading &&
    gallery.length < MAX_LISTING_GALLERY_IMAGES;
  const uploadCopy = uploading
    ? "Uploading..."
    : gallery.length >= MAX_LISTING_GALLERY_IMAGES
      ? "Gallery limit reached"
      : "Add photos";

  return (
    <div
      className={cn(
        "space-y-5 transition",
        !active && "pointer-events-none opacity-45",
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px] lg:items-end">
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
              Listing
            </span>
          </div>
          <select
            value={selectedListingId}
            onChange={(event) => onSelectListing(event.target.value)}
            disabled={!active || loading || listings.length === 0}
            className={inputClassName}
          >
            {listings.length === 0 ? (
              <option value="">No listings available</option>
            ) : null}
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
            Images
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
            {gallery.length}/{MAX_LISTING_GALLERY_IMAGES}
          </div>
        </div>
      </div>

      {selectedListing ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                  {selectedListing.title}
                </div>
                <StatusPill value={selectedListing.status} />
                <StatusPill value={selectedListing.visibility} />
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-white/45">
                <span>{selectedListing.category}</span>
                <span>{selectedListing.location}</span>
                <span>{formatListingPrice(selectedListing)}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs sm:min-w-[360px]">
              <ReviewCount label="Images" value={stats.total} />
              <ReviewCount label="Review" value={stats.pending} />
              <ReviewCount label="Approved" value={stats.approved} />
              <ReviewCount label="Rejected" value={stats.rejected} />
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06]"
            />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyPanel
          title="No listings available"
          body="Add a listing first, then upload gallery images for that listing."
        />
      ) : (
        <>
          <label
            className={cn(
              "flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center transition dark:border-white/10 dark:bg-white/[0.04]",
              canUpload
                ? "cursor-pointer hover:border-slate-400/50 hover:bg-slate-900/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                : "cursor-not-allowed opacity-70",
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-[#1c1c1e]">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
              {uploadCopy}
            </span>
            <span className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-white/45">
              Images uploaded here belong to{" "}
              {selectedListing?.title || "the selected listing"}.
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={!canUpload || uploading}
              className="sr-only"
              onChange={(event) => handleFilesChange(event, onUpload)}
            />
          </label>

          <div className="space-y-4">
            <GalleryReviewGroup
              title="Being reviewed"
              body="These images are uploaded but not yet approved for the mobile listing gallery."
              empty="No images waiting for review."
              images={pendingImages}
              status="pending_review"
              reviewingMediaId={reviewingMediaId}
              onReview={onReview}
            />
            <GalleryReviewGroup
              title="Approved"
              body="These images are public and can be displayed on the listing gallery."
              empty="No approved images yet."
              images={approvedImages}
              status="approved"
              reviewingMediaId={reviewingMediaId}
              onReview={onReview}
            />
            <GalleryReviewGroup
              title="Rejected"
              body="These images are blocked from the listing gallery until replaced or reviewed again."
              empty="No rejected images."
              images={rejectedImages}
              status="rejected"
              reviewingMediaId={reviewingMediaId}
              onReview={onReview}
            />
          </div>
        </>
      )}
    </div>
  );
}

function GalleryReviewGroup({
  title,
  body,
  empty,
  images,
  status,
  reviewingMediaId,
  onReview,
}: {
  title: string;
  body: string;
  empty: string;
  images: ProviderMediaRecord[];
  status: "pending_review" | "approved" | "rejected";
  reviewingMediaId: string;
  onReview: (
    image: ProviderMediaRecord,
    status: "approved" | "rejected" | "pending_review",
  ) => void;
}) {
  const tone =
    status === "approved"
      ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-400/15 dark:bg-emerald-400/5"
      : status === "rejected"
        ? "border-rose-200 bg-rose-50/60 dark:border-rose-400/15 dark:bg-rose-400/5"
        : "border-amber-200 bg-amber-50/60 dark:border-amber-400/15 dark:bg-amber-400/5";

  return (
    <div className={cn("rounded-xl border p-4", tone)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GalleryStatusIcon status={status} />
            <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
              {title}
            </h4>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm dark:bg-[#151515] dark:text-white/60">
              {images.length}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/45">
            {body}
          </p>
        </div>
        <StatusPill value={status} />
      </div>

      {images.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white/45">
          {empty}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <GalleryImageReviewCard
              key={image.id}
              image={image}
              index={index}
              reviewingMediaId={reviewingMediaId}
              onReview={onReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryImageReviewCard({
  image,
  index,
  reviewingMediaId,
  onReview,
}: {
  image: ProviderMediaRecord;
  index: number;
  reviewingMediaId: string;
  onReview: (
    image: ProviderMediaRecord,
    status: "approved" | "rejected" | "pending_review",
  ) => void;
}) {
  const approving = reviewingMediaId === `${image.id}:approved`;
  const rejecting = reviewingMediaId === `${image.id}:rejected`;
  const returning = reviewingMediaId === `${image.id}:pending_review`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0b]">
      <div className="relative aspect-square bg-slate-100 dark:bg-white/[0.06]">
        <img
          src={image.thumbnailUrl || image.url}
          alt={image.altText || image.title || `Gallery image ${index + 1}`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          {index === 0 ? (
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              Cover
            </span>
          ) : (
            <span />
          )}
          <StatusPill value={image.status} />
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <div className="truncate text-xs font-semibold text-slate-800 dark:text-white/80">
            {image.title || `Image ${index + 1}`}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-white/45">
            <span>Uploaded {formatShortDate(image.createdAt)}</span>
            {image.reviewedAt ? (
              <span>Reviewed {formatShortDate(image.reviewedAt)}</span>
            ) : null}
            <span className="capitalize">{image.visibility}</span>
          </div>
          {image.rejectionReason ? (
            <div className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] leading-4 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">
              {image.rejectionReason}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {image.status !== "approved" ? (
            <button
              type="button"
              onClick={() => onReview(image, "approved")}
              disabled={approving || rejecting || returning}
              className={cn(
                actionButtonVariants({ variant: "secondary", size: "sm" }),
                "h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-300 dark:hover:bg-emerald-400/10",
              )}
            >
              {approving ? "Approving..." : "Approve"}
            </button>
          ) : null}
          {image.status !== "rejected" ? (
            <button
              type="button"
              onClick={() => onReview(image, "rejected")}
              disabled={approving || rejecting || returning}
              className={cn(
                actionButtonVariants({ variant: "secondary", size: "sm" }),
                "h-8 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-300 dark:hover:bg-rose-400/10",
              )}
            >
              {rejecting ? "Rejecting..." : "Reject"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReview(image, "pending_review")}
              disabled={approving || rejecting || returning}
              className={cn(
                actionButtonVariants({ variant: "secondary", size: "sm" }),
                "h-8",
              )}
            >
              {returning ? "Moving..." : "Review again"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GalleryStatusIcon({
  status,
}: {
  status: "pending_review" | "approved" | "rejected";
}) {
  const iconClassName =
    status === "approved"
      ? "text-emerald-600 dark:text-emerald-300"
      : status === "rejected"
        ? "text-rose-600 dark:text-rose-300"
        : "text-amber-600 dark:text-amber-300";

  if (status === "approved") {
    return <CheckCircle2 className={cn("h-4 w-4", iconClassName)} />;
  }

  if (status === "rejected") {
    return <XCircle className={cn("h-4 w-4", iconClassName)} />;
  }

  return <IonHourglassOutline className={cn("h-4 w-4", iconClassName)} />;
}

function SubscriptionTierPanel({
  provider,
  saving,
  onTogglePremium,
}: {
  provider: ProviderCompanyRecord;
  saving: boolean;
  onTogglePremium: (enabled: boolean) => void;
}) {
  const isPremium = provider.providerTier === "premium";

  return (
    <div className="mt-6">
      <span className="mb-3 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
        Subscription tier
      </span>
      <div className="grid grid-cols-2 gap-3">
        {/* Basic card */}
        <div
          role="button"
          tabIndex={saving || !isPremium ? -1 : 0}
          aria-pressed={!isPremium}
          onClick={() => !saving && isPremium && onTogglePremium(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!saving && isPremium) onTogglePremium(false);
            }
          }}
          className={cn(
            "overflow-hidden rounded-xl border transition-all duration-200",
            !isPremium
              ? "border-blue-300/60 shadow-md dark:border-blue-400/25"
              : "cursor-pointer border-slate-200 opacity-50 hover:opacity-75 dark:border-white/10",
            saving && "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 transition-colors duration-200",
              !isPremium
                ? "bg-blue-500/[0.05] dark:bg-blue-400/[0.06]"
                : "bg-slate-50 dark:bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                  !isPremium
                    ? "border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400"
                    : "border-slate-300 dark:border-white/20",
                )}
              >
                {!isPremium && (
                  <svg
                    viewBox="0 0 10 8"
                    className="h-2.5 w-2.5 fill-none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white/90">
                Basic
              </span>
            </div>
            {!isPremium && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
                Current
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {TIER_FEATURES.map((feature) => (
              <li
                key={feature.id}
                className="flex items-center gap-2.5 px-4 py-2.5"
              >
                {feature.basic ? (
                  <svg
                    viewBox="0 0 10 8"
                    className="h-3.5 w-3.5 shrink-0 fill-none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    <span className="block h-px w-3 rounded-full bg-slate-300 dark:bg-white/20" />
                  </span>
                )}
                <span
                  className={cn(
                    "text-xs leading-snug",
                    feature.basic
                      ? "text-slate-700 dark:text-white/70"
                      : "text-slate-400 dark:text-white/25",
                  )}
                >
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Premium card */}
        <div
          role="button"
          tabIndex={saving || isPremium ? -1 : 0}
          aria-pressed={isPremium}
          onClick={() => !saving && !isPremium && onTogglePremium(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!saving && !isPremium) onTogglePremium(true);
            }
          }}
          className={cn(
            "overflow-hidden rounded-xl border transition-all duration-200",
            isPremium
              ? "border-yellow-400/50 shadow-md dark:border-yellow-500/25"
              : "cursor-pointer border-slate-200 opacity-50 hover:opacity-75 dark:border-white/10",
            saving && "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 transition-colors duration-200",
              isPremium
                ? "bg-[#d4af37]/[0.06] dark:bg-[#d4af37]/[0.07]"
                : "bg-slate-50 dark:bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                  isPremium
                    ? "border-[#b8960c] bg-[#d4af37]"
                    : "border-slate-300 dark:border-white/20",
                )}
              >
                {isPremium && (
                  <svg
                    viewBox="0 0 10 8"
                    className="h-2.5 w-2.5 fill-none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white/90">
                Premium
              </span>
            </div>
            {isPremium && (
              <span className="rounded-full bg-[#d4af37]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9a7a0a] dark:bg-[#d4af37]/10 dark:text-[#d4af37]">
                Current
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {TIER_FEATURES.map((feature) => (
              <li
                key={feature.id}
                className="flex items-center gap-2.5 px-4 py-2.5"
              >
                <svg
                  viewBox="0 0 10 8"
                  className="h-3.5 w-3.5 shrink-0 fill-none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 4l2.5 2.5L9 1"
                    stroke="#d4af37"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs leading-snug text-slate-700 dark:text-white/70">
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SectionToggle({
  checked,
  ariaLabel,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  ariaLabel: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60",
          checked
            ? "bg-neutral-900 dark:bg-white"
            : "bg-neutral-200 dark:bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-6 dark:bg-neutral-900" : "left-1",
          )}
        />
        <span className="sr-only">
          {ariaLabel}: {checked ? "active" : "inactive"}
        </span>
      </button>
    </div>
  );
}

function LocationPinIcon() {
  return <LocationIconBubble compact />;
}

function LocationIconBubble({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]",
        compact ? "h-5 w-5" : "mr-1.5 h-6 w-6",
      )}
    >
      <MobileLocationGlyph className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
    </span>
  );
}

function MobileLocationGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 512 512"
      className={className}
      fill="#ff3b30"
    >
      <path d="M256 32C167.67 32 96 103.67 96 192c0 120 160 288 160 288s160-168 160-288C416 103.67 344.33 32 256 32Zm0 224a64 64 0 1 1 64-64 64.07 64.07 0 0 1-64 64Z" />
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  icon,
  disabled = false,
  initialValue,
  hasError = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: ReactNode;
  disabled?: boolean;
  initialValue?: string;
  hasError?: boolean;
}) {
  const borderOverride =
    initialValue !== undefined
      ? value.trim() === ""
        ? "border-rose-400 focus:border-rose-400 dark:border-rose-500 dark:focus:border-rose-500"
        : value !== initialValue
          ? "border-emerald-500 focus:border-emerald-500 dark:border-emerald-400 dark:focus:border-emerald-400"
          : ""
      : "";

  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
          {label}
        </span>
        {hasError && (
          <span className="text-xs font-bold text-rose-500">Required</span>
        )}
      </div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClassName, icon ? "pr-10" : "", borderOverride)}
          disabled={disabled}
        />
        {icon ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {icon}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  className,
  initialValue,
  hasError = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  initialValue?: string;
  hasError?: boolean;
}) {
  const borderOverride =
    initialValue !== undefined
      ? value.trim() === ""
        ? "border-rose-400 focus:border-rose-400 dark:border-rose-500 dark:focus:border-rose-500"
        : value !== initialValue
          ? "border-emerald-500 focus:border-emerald-500 dark:border-emerald-400 dark:focus:border-emerald-400"
          : ""
      : "";

  return (
    <label className={cn("block", className)}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
          {label}
        </span>
        {hasError && (
          <span className="text-xs font-bold text-rose-500">Required</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClassName, "min-h-28 resize-y py-3", borderOverride)}
      />
    </label>
  );
}

function ListingDetail({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-white/35">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white/80">
        {value}
      </div>
    </div>
  );
}

function ReviewCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-[#0b0b0b]">
      <div className="text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-white/35">
        {label}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/35">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.replace(/_/g, " ");
  let className = "";
  if (value === "pending") {
    className =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300";
  } else if (
    value === "approved" ||
    value === "active" ||
    value === "online" ||
    value === "available"
  ) {
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";
  } else if (value === "limited") {
    className =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300";
  } else if (value === "archived" || value === "blocked") {
    className =
      "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/60";
  } else if (value === "rejected" || value === "booked") {
    className =
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300";
  } else {
    className =
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/75";
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 text-xs font-semibold capitalize transition-all",
        "h-7 w-28",
        className,
      )}
      style={{ minWidth: 72, maxWidth: 112 }}
    >
      {normalized}
    </span>
  );
}

function LocationPill({ location }: { location: string }) {
  return (
    <div
      aria-label={`Location: ${location}`}
      className="inline-flex max-w-full items-center rounded-full bg-black/[0.04] px-3.5 py-2 text-sm text-slate-950 dark:bg-white/10 dark:text-white"
    >
      <LocationIconBubble />
      <span className="truncate font-semibold text-slate-950 dark:text-white">
        {location}
      </span>
    </div>
  );
}

function RatingPill({
  average,
  reviewCount,
  onClick,
}: {
  average: number;
  reviewCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${formatAverageRating(average)} stars, ${reviewCount} reviews`}
      className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-black/[0.05] px-3.5 py-2 text-sm text-slate-950 transition hover:-translate-y-0.5 hover:bg-black/[0.08] focus:outline-none focus:ring-4 focus:ring-slate-900/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/[0.16] dark:focus:ring-white/15"
    >
      <span className="mr-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
        <Star className="h-3.5 w-3.5 fill-[#daa520] text-[#daa520]" />
      </span>
      <span className="font-semibold">{formatAverageRating(average)}</span>
      <span
        aria-hidden="true"
        className="mx-2 h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-white/45"
      />
      <span className="whitespace-nowrap font-medium text-slate-500 dark:text-white/60">
        {reviewCount.toLocaleString()} reviews
      </span>
    </button>
  );
}

type ReviewSortOption = "newest" | "highest" | "lowest" | "most_detailed";
type ReviewFilterOption =
  | "all"
  | "with_comments"
  | "star-5"
  | "star-4"
  | "star-3"
  | "star-2"
  | "star-1";

const reviewFilterOptions: Array<{ value: ReviewFilterOption; label: string }> =
  [
    { value: "all", label: "All" },
    { value: "star-5", label: "5 stars" },
    { value: "star-4", label: "4 stars" },
    { value: "star-3", label: "3 stars" },
    { value: "star-2", label: "2 stars" },
    { value: "star-1", label: "1 star" },
    { value: "with_comments", label: "With comments" },
  ];

function ReviewsModal({
  provider,
  onClose,
}: {
  provider: ProviderCompanyRecord;
  onClose: () => void;
}) {
  const summary = getProviderRatingSummary(provider);
  const displayName = getProviderDisplayName(provider);
  const [sortBy, setSortBy] = useState<ReviewSortOption>("newest");
  const [filterBy, setFilterBy] = useState<ReviewFilterOption>("all");
  const [query, setQuery] = useState("");

  const filteredReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return summary.reviews
      .filter((review) => reviewMatchesFilter(review, filterBy))
      .filter((review) => {
        if (!normalizedQuery) return true;

        return [
          review.customerName,
          review.note,
          review.listingTitle,
          review.listingCategory,
          review.listingLocation,
          review.bookingType,
          review.confirmationNumber,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedQuery),
          );
      })
      .sort((first, second) => compareReviews(first, second, sortBy));
  }, [filterBy, query, sortBy, summary.reviews]);

  const maxDistributionCount = Math.max(
    1,
    ...([1, 2, 3, 4, 5] as const).map((rating) => summary.distribution[rating]),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101010]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
          <div className="flex flex-1 flex-col">
            <div className="text-center text-lg font-semibold text-slate-950 dark:text-white">
              Reviews
            </div>
            <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
              {displayName}
            </div>
            <div className="mt-2">
              <LocationPill
                location={
                  provider.serviceAreas?.[0] ||
                  provider.headquartersCity ||
                  provider.physicalAddress ||
                  displayName
                }
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reviews"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-900/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus:ring-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
              <div className="flex items-end gap-3">
                <div className="text-5xl font-bold tracking-normal text-slate-950 dark:text-white">
                  {formatAverageRating(summary.average)}
                </div>
                <div className="pb-1">
                  <ReviewStars rating={Math.round(summary.average)} />
                  <div className="mt-1 text-sm text-slate-500 dark:text-white/55">
                    {summary.reviewCount.toLocaleString()} total reviews
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                {([5, 4, 3, 2, 1] as const).map((rating) => {
                  const count = summary.distribution[rating];
                  const width = `${(count / maxDistributionCount) * 100}%`;

                  return (
                    <button
                      type="button"
                      key={rating}
                      onClick={() => setFilterBy(`star-${rating}`)}
                      className="grid w-full grid-cols-[56px_1fr_42px] items-center gap-3 text-left text-sm text-slate-600 transition hover:text-slate-950 dark:text-white/60 dark:hover:text-white"
                    >
                      <span>
                        {rating} {rating === 1 ? "star" : "stars"}
                      </span>
                      <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <span
                          className="block h-full rounded-full bg-[#daa520]"
                          style={{ width }}
                        />
                      </span>
                      <span className="text-right font-medium">
                        {count.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 flex h-5 w-5 items-center justify-center text-slate-400 dark:text-white/40">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by traveler, listing, location, or comment"
                    className="h-10 w-full rounded-full border-0 bg-black/[0.05] pl-9 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:bg-white/[0.08] dark:text-white dark:placeholder:text-white/35 dark:focus:ring-white/15"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70"
                      aria-label="Clear search"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  ) : null}
                </div>
                <label className="block">
                  <span className="sr-only">Sort reviews</span>
                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as ReviewSortOption)
                    }
                    className={inputClassName}
                  >
                    <option value="newest">Newest first</option>
                    <option value="highest">Highest rating</option>
                    <option value="lowest">Lowest rating</option>
                    <option value="most_detailed">Most detailed</option>
                  </select>
                </label>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {reviewFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilterBy(option.value)}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition",
                      filterBy === option.value
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="text-sm font-medium text-slate-500 dark:text-white/55">
                Showing {filteredReviews.length.toLocaleString()} of{" "}
                {summary.reviewCount.toLocaleString()} reviews
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <div className="md:col-span-2">
                <EmptyPanel
                  title="No reviews match this view"
                  body="Try a different star rating, filter, sort order, or search term."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
      <div className="text-xs font-medium text-slate-500 dark:text-white/45">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ProviderRatingReviewRecord }) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70">
            {getInitials(review.customerName)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-950 dark:text-white">
              {review.customerName}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-white/45">
              {formatShortDate(review.reviewedAt || review.createdAt)}
            </div>
          </div>
        </div>
        {review.isVerified ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            Verified
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <ReviewStars rating={review.rating} />
        <span className="text-sm font-semibold text-slate-950 dark:text-white">
          {review.rating}.0
        </span>
      </div>

      <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/65">
        {review.note?.trim() || "No written review supplied."}
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-white/45">
        <div className="truncate">
          {review.listingTitle || review.bookingType.replace(/_/g, " ")}
        </div>
        {review.listingLocation ? (
          <div className="truncate">{review.listingLocation}</div>
        ) : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>{review.confirmationNumber}</span>
          <span>{formatMoney(review.totalAmount, review.currency)}</span>
          {review.guests ? <span>{review.guests} guests</span> : null}
        </div>
      </div>
    </article>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${safeRating} stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= safeRating
              ? "fill-[#daa520] text-[#daa520]"
              : "fill-slate-200 text-slate-200 dark:fill-white/15 dark:text-white/15",
          )}
        />
      ))}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center dark:border-white/10">
      <div className="font-medium text-slate-950 dark:text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-white/45">
        {body}
      </div>
    </div>
  );
}

function AlertModal({
  tone,
  title,
  message,
  onClose,
}: {
  tone: "error" | "success";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const isError = tone === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white p-5 text-center shadow-2xl dark:border-white/10 dark:bg-[#101010]">
        <div
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            isError
              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
          )}
        >
          {isError ? (
            <XCircle className="h-7 w-7" />
          ) : (
            <CheckCircle2 className="h-7 w-7" />
          )}
        </div>
        <div className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
          {title}
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
          {message}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            actionButtonVariants({ variant: "primary", size: "lg" }),
            "mt-5 w-full justify-center",
          )}
        >
          OK
        </button>
      </div>
    </div>
  );
}

function handleFileChange(
  event: ChangeEvent<HTMLInputElement>,
  handler: (file?: File | null) => void,
) {
  const file = event.target.files?.[0] || null;
  handler(file);
  event.target.value = "";
}

function handleFilesChange(
  event: ChangeEvent<HTMLInputElement>,
  handler: (files: File[]) => void,
) {
  const files = Array.from(event.target.files || []);
  handler(files);
  event.target.value = "";
}

function getProviderRatingSummary(provider: ProviderCompanyRecord) {
  const average = provider.ratingStats?.average ?? 0;
  const reviewCount = provider.ratingStats?.reviewCount ?? 0;
  const reviews = provider.ratingStats?.reviews ?? [];
  const distribution = {
    1: provider.ratingStats?.distribution?.[1] ?? 0,
    2: provider.ratingStats?.distribution?.[2] ?? 0,
    3: provider.ratingStats?.distribution?.[3] ?? 0,
    4: provider.ratingStats?.distribution?.[4] ?? 0,
    5: provider.ratingStats?.distribution?.[5] ?? 0,
  } satisfies Record<1 | 2 | 3 | 4 | 5, number>;

  return {
    average: Number.isFinite(average) ? average : 0,
    reviewCount: Math.max(0, reviewCount),
    distribution,
    withComments:
      provider.ratingStats?.withComments ??
      reviews.filter((review) => review.note?.trim()).length,
    verifiedCount:
      provider.ratingStats?.verifiedCount ??
      reviews.filter((review) => review.isVerified).length,
    latestReviewAt: provider.ratingStats?.latestReviewAt ?? null,
    reviews,
  };
}

function formatAverageRating(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return (Math.round(value * 10) / 10).toFixed(1);
}

function getProviderDisplayName(
  provider: ProviderCompanyRecord,
  form?: ProviderFormState,
) {
  return (
    form?.tradingName?.trim() ||
    provider.tradingName?.trim() ||
    form?.companyName?.trim() ||
    provider.companyName
  );
}

function reviewMatchesFilter(
  review: ProviderRatingReviewRecord,
  filter: ReviewFilterOption,
) {
  if (filter === "all") return true;
  if (filter === "with_comments") return Boolean(review.note?.trim());
  if (filter.startsWith("star-")) {
    return review.rating === Number(filter.replace("star-", ""));
  }

  return true;
}

function compareReviews(
  first: ProviderRatingReviewRecord,
  second: ProviderRatingReviewRecord,
  sortBy: ReviewSortOption,
) {
  if (sortBy === "highest") return second.rating - first.rating;
  if (sortBy === "lowest") return first.rating - second.rating;
  if (sortBy === "most_detailed") {
    return (second.note?.length ?? 0) - (first.note?.length ?? 0);
  }

  return (
    getReviewTimestamp(second) - getReviewTimestamp(first) ||
    second.rating - first.rating
  );
}

function getReviewTimestamp(review: ProviderRatingReviewRecord) {
  const value = new Date(review.reviewedAt || review.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials || "OZ";
}

function toForm(provider: ProviderCompanyRecord): ProviderFormState {
  const operatingTime = parseOperatingHours(provider.operatingHours);
  const selectedServices =
    provider.serviceCategories.length > 0
      ? [provider.serviceCategories[0]]
      : (["things_to_do"] as ServiceProviderCategoryId[]);

  return {
    companyName: provider.companyName,
    tradingName: provider.tradingName || "",
    legalCompanyName: provider.legalCompanyName || provider.companyName,
    businessRegistrationNumber: provider.businessRegistrationNumber,
    mainContactPerson: provider.mainContactPerson,
    contactPersonPhone: provider.contactPersonPhone || provider.businessPhone,
    contactPersonIdType: provider.contactPersonIdType || "",
    contactPersonIdNumber: provider.contactPersonIdNumber || "",
    businessPhone: provider.businessPhone,
    businessEmail: provider.businessEmail,
    physicalAddress: provider.physicalAddress,
    headquartersCity: provider.headquartersCity || "",
    businessDescription: provider.businessDescription || "",
    establishedYear: provider.establishedYear
      ? String(provider.establishedYear)
      : "",
    numberOfEmployees: provider.numberOfEmployees || "",
    incorporationDate: formatDateInput(provider.incorporationDate),
    selectedServices,
    serviceAreas: provider.serviceAreas,
    operatingTimeEnabled: operatingTime.enabled,
    operatingSchedule: operatingTime.schedule,
    zimraBpNumber: provider.zimraBpNumber || "",
    tinNumber: provider.tinNumber || "",
    taxClearanceExpiresAt: formatDateInput(provider.taxClearanceExpiresAt),
    documents: toEditableDocuments(provider.documents),
  };
}

function toEditableDocuments(documents: ProviderDocumentRecord[]) {
  return documents.map((document) => ({
    id: document.id,
    type: document.type,
    status: document.status || "uploaded",
    notes: document.notes || "",
  }));
}

function formToPayload(form: ProviderFormState) {
  const serviceLabels = form.selectedServices.map(
    (service) => serviceProviderCategoryLabels[service],
  );

  return {
    companyName: form.companyName,
    tradingName: form.tradingName || null,
    legalCompanyName: form.legalCompanyName || null,
    incorporationDate: form.incorporationDate || null,
    businessRegistrationNumber: form.businessRegistrationNumber,
    mainContactPerson: form.mainContactPerson,
    contactPersonPhone: form.contactPersonPhone || null,
    contactPersonIdType: form.contactPersonIdType || null,
    contactPersonIdNumber: form.contactPersonIdNumber || null,
    businessPhone: form.businessPhone,
    businessEmail: form.businessEmail,
    physicalAddress: form.physicalAddress,
    headquartersCity: form.headquartersCity || null,
    businessCategory: serviceLabels.join(", ") || null,
    businessDescription: form.businessDescription || null,
    establishedYear: form.establishedYear ? Number(form.establishedYear) : null,
    numberOfEmployees: form.numberOfEmployees || null,
    operatingHours: form.operatingTimeEnabled
      ? formatOperatingHours(form.operatingSchedule)
      : "closed",
    socialMediaLinks: {},
    servicesOffered: serviceLabels,
    serviceAreas: form.serviceAreas,
    zimraBpNumber: form.zimraBpNumber || null,
    tinNumber: form.tinNumber || null,
    taxClearanceExpiresAt: form.taxClearanceExpiresAt || null,
    documents: form.documents,
  };
}

function snapshotPayload(form: ProviderFormState) {
  return JSON.stringify(formToPayload(form));
}

function parseOperatingHours(value?: string | null) {
  const schedule = createDefaultOperatingSchedule();

  if (!value) {
    return { enabled: true, schedule };
  }

  if (value.trim().toLowerCase() === "closed") {
    return {
      enabled: false,
      schedule: createDefaultOperatingSchedule([], "08:00", "17:00"),
    };
  }

  const parsedSchedule = parseJsonOperatingHours(value);
  if (parsedSchedule) {
    return {
      enabled: Object.values(parsedSchedule).some((day) => day.enabled),
      schedule: parsedSchedule,
    };
  }

  const parsed = createDefaultOperatingSchedule([], "08:00", "17:00");
  const groups = value
    .split(";")
    .map((group) => group.trim())
    .filter(Boolean);
  let hasParsedGroup = false;

  for (const group of groups) {
    const match = group.match(/^([a-z, ]+) (\d{2}:\d{2}) - (\d{2}:\d{2})$/i);
    if (!match) continue;

    const days = match[1]
      .split(",")
      .map((day) => normalizeDayId(day.trim()))
      .filter((day): day is OperatingDayId => Boolean(day));

    for (const day of days) {
      parsed[day] = {
        enabled: true,
        opensAt: match[2],
        closesAt: match[3],
      };
      hasParsedGroup = true;
    }
  }

  return {
    enabled: true,
    schedule: hasParsedGroup ? parsed : schedule,
  };
}

function parseJsonOperatingHours(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      schedule?: Partial<Record<OperatingDayId, Partial<OperatingDaySchedule>>>;
    };
    const source = (parsed.schedule ?? parsed) as Partial<
      Record<OperatingDayId, Partial<OperatingDaySchedule>>
    >;
    if (!source || typeof source !== "object") return null;

    const schedule = createDefaultOperatingSchedule([], "08:00", "17:00");

    for (const day of DAY_OPTIONS) {
      const entry = source[day.id];
      if (!entry || typeof entry !== "object") continue;
      schedule[day.id] = {
        enabled: Boolean(entry.enabled),
        opensAt: typeof entry.opensAt === "string" ? entry.opensAt : "08:00",
        closesAt: typeof entry.closesAt === "string" ? entry.closesAt : "17:00",
      };
    }

    return schedule;
  } catch {
    return null;
  }
}

function createDefaultOperatingSchedule(
  enabledDays: OperatingDayId[] = ["mon", "tue", "wed", "thu", "fri"],
  opensAt = "08:00",
  closesAt = "17:00",
) {
  return DAY_OPTIONS.reduce<Record<OperatingDayId, OperatingDaySchedule>>(
    (accumulator, day) => {
      accumulator[day.id] = {
        enabled: enabledDays.includes(day.id),
        opensAt,
        closesAt,
      };
      return accumulator;
    },
    {} as Record<OperatingDayId, OperatingDaySchedule>,
  );
}

function normalizeDayId(value: string): OperatingDayId | null {
  const normalized = value.slice(0, 3).toLowerCase();
  const match = DAY_OPTIONS.find((day) => day.id === normalized);
  return match?.id ?? null;
}

function formatOperatingHours(
  schedule: Record<OperatingDayId, OperatingDaySchedule>,
) {
  const groups = new Map<string, string[]>();

  for (const day of DAY_OPTIONS) {
    const entry = schedule[day.id];
    if (!entry?.enabled) continue;

    const opensAt = entry.opensAt || "08:00";
    const closesAt = entry.closesAt || "17:00";
    const key = `${opensAt} - ${closesAt}`;
    groups.set(key, [...(groups.get(key) ?? []), day.label]);
  }

  if (groups.size === 0) return "";

  return Array.from(groups.entries())
    .map(([time, days]) => `${days.join(", ")} ${time}`)
    .join("; ");
}

function mapDocumentsByType(documents: ProviderDocumentRecord[]) {
  return documents.reduce<Record<string, ProviderDocumentRecord>>(
    (accumulator, document) => {
      const current = accumulator[document.type];
      if (!current || document.uploadedAt > current.uploadedAt) {
        accumulator[document.type] = document;
      }
      return accumulator;
    },
    {},
  );
}

function documentStatus(document?: ProviderDocumentRecord): DocumentStatus {
  if (!document) return "missing";
  if (document.status === "approved") return "approved";
  if (
    document.status === "rejected" ||
    document.status === "changes_requested"
  ) {
    return "rejected";
  }
  return "pending";
}

function getGalleryReviewStats(images: ProviderMediaRecord[]) {
  return {
    total: images.length,
    approved: images.filter((image) => image.status === "approved").length,
    pending: images.filter((image) => image.status === "pending_review").length,
    rejected: images.filter((image) => image.status === "rejected").length,
  };
}

function listingMatchesService(
  listing: AdminListingRecord,
  service: ServiceProviderCategoryId,
) {
  if (listing.metadata?.serviceCategory === service) return true;

  const serviceLabel = serviceProviderCategoryLabels[service];
  const normalizedService = normalizeListingText(serviceLabel);
  const normalizedCategory = normalizeListingText(listing.category);
  const normalizedType = normalizeListingText(listing.listingType);

  return (
    normalizedCategory === normalizedService ||
    normalizedType === normalizedService ||
    normalizedType ===
      normalizeListingText(LISTING_SERVICE_CONFIG[service].defaultListingType)
  );
}

function getListingServiceSummary(service: ServiceProviderCategoryId) {
  switch (service) {
    case "stays":
      return "Rooms, suites, lodges, campsites, prices per night, inclusions, and house rules.";
    case "events":
      return "Event type, ticket price, capacity, included items, and attendance rules.";
    case "bus":
      return "Routes, fares, seat capacity, luggage allowance, and passenger rules.";
    case "flight":
      return "Flight routes, fares, seat capacity, baggage rules, and service notes.";
    case "things_to_do":
    default:
      return "Activities, tour prices, group sizes, inclusions, and safety rules.";
  }
}

function getListingServiceFieldLabels(service: ServiceProviderCategoryId) {
  switch (service) {
    case "stays":
      return [
        "Room type",
        "Price / night",
        "Guests",
        "Included",
        "Not allowed",
      ];
    case "events":
      return [
        "Event type",
        "Ticket price",
        "Capacity",
        "Included",
        "Restrictions",
      ];
    case "bus":
      return ["Route type", "Fare", "Seats", "Included", "Luggage rules"];
    case "flight":
      return ["Flight type", "Fare", "Seats", "Included", "Baggage rules"];
    case "things_to_do":
    default:
      return [
        "Activity type",
        "Price",
        "Group size",
        "Included",
        "Not allowed",
      ];
  }
}

function toListingEditForm(
  listing: AdminListingRecord,
  displayName = listing.title,
): ListingEditForm {
  const stayDetails = getStayDetailsRecord(listing.metadata);

  return {
    title: displayName,
    shortDescription: listing.shortDescription || "",
    status: listing.status,
    visibility: listing.visibility,
    location: listing.location,
    bookingMode: listing.bookingMode || "request",
    instantBooking: listing.instantBooking,
    basePrice: listing.basePrice?.toString() || "",
    listingType: listing.listingType || "",
    pricingModel: listing.pricingModel || "",
    capacity: listing.capacity?.toString() || "",
    totalUnits: getMetadataString(stayDetails, "totalUnits"),
    bedrooms: getMetadataString(stayDetails, "bedrooms"),
    beds: getMetadataString(stayDetails, "beds"),
    bathrooms: getMetadataString(stayDetails, "bathrooms"),
    maxAdults:
      getMetadataString(stayDetails, "maxAdults") ||
      listing.capacity?.toString() ||
      "",
    maxChildren: getMetadataString(stayDetails, "maxChildren"),
    maxInfants: getMetadataString(stayDetails, "maxInfants"),
    bedSetup: getMetadataString(stayDetails, "bedSetup"),
    bathroomType: getMetadataString(stayDetails, "bathroomType"),
    roomView: getMetadataString(stayDetails, "roomView"),
    checkInFrom: getMetadataString(stayDetails, "checkInFrom"),
    checkInUntil: getMetadataString(stayDetails, "checkInUntil"),
    checkOutUntil: getMetadataString(stayDetails, "checkOutUntil"),
    minNights: getMetadataString(stayDetails, "minNights"),
    maxNights: getMetadataString(stayDetails, "maxNights"),
    advanceNoticeHours: getMetadataString(stayDetails, "advanceNoticeHours"),
    bookingWindowMonths: getMetadataString(stayDetails, "bookingWindowMonths"),
    cleaningFee: getMetadataString(stayDetails, "cleaningFee"),
    securityDeposit: getMetadataString(stayDetails, "securityDeposit"),
    extraGuestFee: getMetadataString(stayDetails, "extraGuestFee"),
    weeklyDiscount: getMetadataString(stayDetails, "weeklyDiscount"),
    monthlyDiscount: getMetadataString(stayDetails, "monthlyDiscount"),
    cancellationPolicy: getMetadataString(stayDetails, "cancellationPolicy"),
    paymentPolicy: getMetadataString(stayDetails, "paymentPolicy"),
    calendarSyncUrl: getMetadataString(stayDetails, "calendarSyncUrl"),
    blackoutNotes: getMetadataString(stayDetails, "blackoutNotes"),
    accessibilityFeatures: getMetadataArray(
      stayDetails,
      "accessibilityFeatures",
    ),
    safetyFeatures: getMetadataArray(stayDetails, "safetyFeatures"),
    included: listing.amenities,
    notAllowed: getPolicyArrayValue(listing.policies, [
      "notAllowed",
      "not_allowed",
      "safetyRules",
      "rules",
    ]),
  };
}

function getListingTypeOptions(service: ServiceProviderCategoryId) {
  switch (service) {
    case "stays":
      return STAY_ROOM_TYPE_OPTIONS;
    case "events":
      return ["Festival", "Concert", "Conference", "Workshop", "Show"];
    case "bus":
      return ["Intercity route", "Shuttle", "Transfer", "Charter"];
    case "flight":
      return [
        "Scheduled flight",
        "Charter flight",
        "Scenic flight",
        "Transfer",
      ];
    case "things_to_do":
    default:
      return ["Guided tour", "Activity", "Attraction", "Experience", "Package"];
  }
}

function getListingPricingOptions(service: ServiceProviderCategoryId) {
  if (service === "stays") return STAY_PRICING_OPTIONS;

  return [
    { value: "per_person", label: "Per person" },
    { value: "per_ticket", label: "Per ticket" },
    { value: "per_seat", label: "Per seat" },
    { value: "package", label: "Package" },
  ];
}

function getListingIncludedOptions(service: ServiceProviderCategoryId) {
  if (service === "stays") return STAY_INCLUDED_OPTIONS;

  return [
    "Guide",
    "Transport",
    "Equipment",
    "Meals",
    "Entry fees",
    "No inclusions listed",
  ];
}

function getListingNotAllowedOptions(service: ServiceProviderCategoryId) {
  if (service === "stays") return STAY_NOT_ALLOWED_OPTIONS;

  return [
    "No smoking",
    "No alcohol",
    "No pets",
    "Age restrictions apply",
    "Health restrictions apply",
    "No restrictions listed",
  ];
}

function getListingStatusDisplayValue(status: string) {
  if (status === "active" || status === "approved") return "approved";
  if (
    status === "draft" ||
    status === "pending_review" ||
    status === "pending"
  ) {
    return "pending";
  }
  return status;
}

function listingMatchesStatusFilter(
  status: string,
  filter: ListingStatusFilter,
) {
  if (filter === "all") return true;
  return getListingStatusDisplayValue(status) === filter;
}

function getListingStatusStats(listings: AdminListingRecord[]) {
  return {
    all: listings.length,
    approved: listings.filter(
      (listing) => getListingStatusDisplayValue(listing.status) === "approved",
    ).length,
    pending: listings.filter(
      (listing) => getListingStatusDisplayValue(listing.status) === "pending",
    ).length,
    archived: listings.filter(
      (listing) => getListingStatusDisplayValue(listing.status) === "archived",
    ).length,
    rejected: listings.filter(
      (listing) => getListingStatusDisplayValue(listing.status) === "rejected",
    ).length,
  };
}

function getListingDisplayId(
  serviceProviderId: string,
  listing: AdminListingRecord,
  listings: AdminListingRecord[],
) {
  const orderedListings = [...listings].sort((first, second) => {
    const firstCreatedAt = new Date(first.createdAt).getTime();
    const secondCreatedAt = new Date(second.createdAt).getTime();
    if (firstCreatedAt !== secondCreatedAt) {
      return firstCreatedAt - secondCreatedAt;
    }
    return first.id.localeCompare(second.id);
  });
  const listingIndex = orderedListings.findIndex(
    (item) => item.id === listing.id,
  );
  const sequence =
    listingIndex >= 0 ? listingIndex + 1 : orderedListings.length + 1;

  return getProviderListingDisplayId(serviceProviderId, sequence);
}

function canToggleListingArchive(status: string) {
  const displayStatus = getListingStatusDisplayValue(status);
  return displayStatus === "approved" || displayStatus === "archived";
}

function listingEditFormChanged(
  first: ListingEditForm,
  second: ListingEditForm,
) {
  return JSON.stringify(first) !== JSON.stringify(second);
}

function getListingValidationErrors(
  form: ListingEditForm,
  service: ServiceProviderCategoryId,
) {
  const errors = new Set<keyof ListingEditForm>();

  if (!form.location.trim()) errors.add("location");
  if (!form.listingType.trim()) errors.add("listingType");
  if (!form.pricingModel.trim()) errors.add("pricingModel");
  if (!form.basePrice.trim()) errors.add("basePrice");
  if (!form.capacity.trim()) errors.add("capacity");
  if (!form.shortDescription.trim()) errors.add("shortDescription");
  if (form.included.length === 0) errors.add("included");
  if (form.notAllowed.length === 0) errors.add("notAllowed");

  if (service === "stays") {
    if (!form.totalUnits.trim()) errors.add("totalUnits");
  }

  return errors;
}

function toStayDetailsPayload(form: ListingEditForm) {
  return {
    totalUnits: parsePositiveInt(form.totalUnits),
  };
}

function getStayDetailsRecord(metadata: Record<string, unknown>) {
  const value = metadata.stayDetails;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function getMetadataArray(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function parsePositiveInt(value: string) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getStayCalendarMonthCells(
  listing: AdminListingRecord,
  totalUnits: number,
  monthDate: Date,
) {
  const monthStart = getMonthStart(monthDate);
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const leadingBlanks = monthStart.getDay();
  const cells: Array<null | {
    key: string;
    status: string;
    label: string;
    bookedRooms: number;
    availableRooms: number;
    day: string;
  }> = Array.from({ length: leadingBlanks }, () => null);

  for (let index = 0; index < daysInMonth; index += 1) {
    const date = new Date(monthStart);
    date.setDate(index + 1);
    const key = getCalendarDateKey(date);
    const occupancy = getStayDateOccupancy(listing, totalUnits, key);

    cells.push({
      key,
      status: occupancy.status,
      label: occupancy.label,
      bookedRooms: occupancy.bookedRooms,
      availableRooms: occupancy.availableRooms,
      day: String(date.getDate()),
    });
  }

  return cells;
}

function getStayDateOccupancy(
  listing: AdminListingRecord,
  totalUnits: number,
  dateKey: string,
) {
  const date = parseCalendarDateKey(dateKey);
  const roomCount = Math.max(totalUnits, 0);
  const bookings = listing.bookingCalendar.filter((item) =>
    dateFallsWithinRange(date, item.checkIn, item.checkOut),
  );
  const availability = listing.availability.find((item) =>
    dateFallsWithinRange(date, item.startDate, item.endDate),
  );
  const capacityForCount = roomCount || Math.max(bookings.length, 1);
  const bookedRooms = Math.min(capacityForCount, bookings.length);
  const availabilityUnits =
    typeof availability?.unitsAvailable === "number"
      ? Math.max(availability.unitsAvailable, 0)
      : null;
  let availableRooms = roomCount ? Math.max(roomCount - bookedRooms, 0) : 0;
  if (availabilityUnits !== null) {
    availableRooms = roomCount
      ? Math.min(availableRooms, availabilityUnits)
      : availabilityUnits;
  }

  const rawAvailabilityStatus = availability?.status?.toLowerCase() || "";
  const status =
    rawAvailabilityStatus && rawAvailabilityStatus !== "available"
      ? "blocked"
      : roomCount > 0 && availableRooms <= 0
        ? "booked"
        : bookedRooms > 0 || (roomCount > 0 && availableRooms < roomCount)
          ? "limited"
          : "available";
  const label =
    status === "booked"
      ? "Full"
      : status === "limited"
        ? roomCount
          ? `${bookedRooms}/${roomCount}`
          : `${bookedRooms} booked`
        : status === "blocked"
          ? "Blocked"
          : "Open";

  return {
    key: dateKey,
    status,
    label,
    bookings,
    bookedRooms,
    availableRooms,
    totalUnits: roomCount,
  };
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addCalendarMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getDefaultSelectedDate(monthDate: Date, today: Date) {
  return isSameCalendarMonth(monthDate, today) ? today : monthDate;
}

function isSameCalendarMonth(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth()
  );
}

function formatCalendarMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getCalendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCalendarDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  return new Date(year, month - 1, day);
}

function formatCalendarDateLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parseCalendarDateKey(value));
}

function formatBookingDateRange(
  checkIn?: string | null,
  checkOut?: string | null,
) {
  if (!checkIn || !checkOut) return "Dates pending";
  return `${formatCalendarDateLabel(checkIn.slice(0, 10))} - ${formatCalendarDateLabel(checkOut.slice(0, 10))}`;
}

function dateFallsWithinRange(
  date: Date,
  startValue?: string | null,
  endValue?: string | null,
) {
  if (!startValue || !endValue) return false;
  const start = parseCalendarDateKey(startValue.slice(0, 10));
  const end = parseCalendarDateKey(endValue.slice(0, 10));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return date >= start && date < end;
}

function toggleListingOption(
  current: string[],
  option: string,
  exclusiveFallback: string,
) {
  if (option === exclusiveFallback) {
    return current.includes(option) ? [] : [option];
  }

  const withoutFallback = current.filter((item) => item !== exclusiveFallback);
  return withoutFallback.includes(option)
    ? withoutFallback.filter((item) => item !== option)
    : [...withoutFallback, option];
}

function addCustomListingOption(
  current: string[],
  option: string,
  exclusiveFallback: string,
) {
  const trimmed = option.trim();
  if (!trimmed) return current;

  const withoutFallback = current.filter((item) => item !== exclusiveFallback);
  return withoutFallback.some(
    (item) => item.toLowerCase() === trimmed.toLowerCase(),
  )
    ? withoutFallback
    : [...withoutFallback, trimmed];
}

function getVisibleListingOptions(baseOptions: string[], selected: string[]) {
  const normalizedBaseOptions = new Set(
    baseOptions.map((option) => option.toLowerCase()),
  );
  const customOptions = selected.filter(
    (option) => !normalizedBaseOptions.has(option.toLowerCase()),
  );

  return [...baseOptions, ...customOptions];
}

function getPersistedListingStatus(status: string) {
  if (status === "approved") return "active";
  if (status === "pending") return "pending_review";
  if (
    status === "draft" ||
    status === "pending_review" ||
    status === "active" ||
    status === "paused" ||
    status === "archived"
  ) {
    return status;
  }

  return undefined;
}

function getServiceListingDetails(
  service: ServiceProviderCategoryId,
  listing: AdminListingRecord,
) {
  switch (service) {
    case "stays":
      return [
        { label: "Room type", value: listing.listingType || "Not set" },
        { label: "Price / night", value: formatBasePrice(listing, "Not set") },
        { label: "Guests", value: formatCapacity(listing.capacity, "guests") },
        { label: "Included", value: formatListValue(listing.amenities) },
        {
          label: "Not allowed",
          value: formatPolicyValue(listing.policies, [
            "notAllowed",
            "not_allowed",
            "houseRules",
            "rules",
          ]),
        },
      ];
    case "events":
      return [
        { label: "Event type", value: listing.listingType || "Not set" },
        { label: "Ticket price", value: formatBasePrice(listing, "Not set") },
        {
          label: "Capacity",
          value: formatCapacity(listing.capacity, "people"),
        },
        { label: "Included", value: formatListValue(listing.amenities) },
        {
          label: "Restrictions",
          value: formatPolicyValue(listing.policies, [
            "restrictions",
            "notAllowed",
            "rules",
          ]),
        },
      ];
    case "bus":
      return [
        { label: "Route type", value: listing.listingType || "Not set" },
        { label: "Fare", value: formatBasePrice(listing, "Not set") },
        { label: "Seats", value: formatCapacity(listing.capacity, "seats") },
        { label: "Included", value: formatListValue(listing.amenities) },
        {
          label: "Luggage rules",
          value: formatPolicyValue(listing.policies, [
            "luggage",
            "baggage",
            "rules",
          ]),
        },
      ];
    case "flight":
      return [
        { label: "Flight type", value: listing.listingType || "Not set" },
        { label: "Fare", value: formatBasePrice(listing, "Not set") },
        { label: "Seats", value: formatCapacity(listing.capacity, "seats") },
        { label: "Included", value: formatListValue(listing.amenities) },
        {
          label: "Baggage rules",
          value: formatPolicyValue(listing.policies, [
            "baggage",
            "luggage",
            "rules",
          ]),
        },
      ];
    case "things_to_do":
    default:
      return [
        { label: "Activity type", value: listing.listingType || "Not set" },
        { label: "Price", value: formatBasePrice(listing, "Not set") },
        {
          label: "Group size",
          value: formatCapacity(listing.capacity, "people"),
        },
        { label: "Included", value: formatListValue(listing.amenities) },
        {
          label: "Not allowed",
          value: formatPolicyValue(listing.policies, [
            "notAllowed",
            "not_allowed",
            "safetyRules",
            "rules",
          ]),
        },
      ];
  }
}

function normalizeListingText(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function formatBasePrice(listing: AdminListingRecord, fallback: string) {
  return listing.basePrice == null
    ? fallback
    : formatMoney(listing.basePrice, listing.currency);
}

function formatCapacity(value?: number | null, unit = "people") {
  if (!value) return "Not set";
  return `${value.toLocaleString()} ${unit}`;
}

function formatListValue(values?: string[] | null) {
  if (!values || values.length === 0) return "Not set";
  return values.slice(0, 3).join(", ");
}

function formatPolicyValue(
  policies: Record<string, unknown> | undefined,
  keys: string[],
) {
  if (!policies) return "Not set";

  for (const key of keys) {
    const value = policies[key];
    const formatted = formatUnknownValue(value);
    if (formatted) return formatted;
  }

  return "Not set";
}

function getPolicyArrayValue(
  policies: Record<string, unknown> | undefined,
  keys: string[],
) {
  if (!policies) return [];

  for (const key of keys) {
    const value = policies[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
  }

  return [];
}

function formatUnknownValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    const strings = value
      .map((item) => (typeof item === "string" ? item : null))
      .filter((item): item is string => Boolean(item));
    return strings.length > 0 ? strings.slice(0, 3).join(", ") : null;
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === "object") {
    const strings = Object.values(value)
      .map((item) => (typeof item === "string" ? item : null))
      .filter((item): item is string => Boolean(item));
    return strings.length > 0 ? strings.slice(0, 3).join(", ") : null;
  }

  return null;
}

function formatListingPrice(listing: AdminListingRecord) {
  const pricingModel = listing.pricingModel.replace(/_/g, " ");
  if (listing.basePrice == null) {
    return pricingModel;
  }

  return `${formatMoney(listing.basePrice, listing.currency)} ${pricingModel}`;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toLocaleString()}`;
  }
}

function formatDateInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatShortDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}
