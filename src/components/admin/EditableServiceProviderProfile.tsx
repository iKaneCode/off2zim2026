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
import LocationPill, { LocationIconBubble } from "@/components/ui/LocationPill";
import { apiFetch } from "@/lib/client-api";
import { scrollToDetailSection } from "@/lib/detail-scroll";
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
  ProviderListingRecord,
  ProviderRatingReviewRecord,
} from "@/types/platform";
import {
  AlertTriangle,
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
  Power,
  ReceiptText,
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
  submitReview: (
    statusOverride?: ReviewStatus,
    notesOverride?: string,
    internalSummaryOverride?: string,
  ) => void;
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
  ticketType: string;
  totalTickets: string;
  eventDate: string;
  eventStartTime: string;
  activityDate: string;
  activityTimeSlot: string;
  maxParticipants: string;
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

type RequirementSection =
  | "Profile"
  | "Operating Time"
  | "Contact Person"
  | "Listings"
  | "Gallery"
  | "Premium Upgrade"
  | "Company Verification"
  | "ZIMRA and Tax Clearance";

export type ProviderDetailSection =
  | "all"
  | "readiness"
  | "profile"
  | "operating-time"
  | "contact-person"
  | "listings"
  | "gallery"
  | "verification"
  | "admin-review";

interface MissingRequirement {
  key: string;
  section: RequirementSection;
  label: string;
  detail: string;
  state?: "incomplete" | "pending_review";
  blocksActivation?: boolean;
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
  ticketType: "",
  totalTickets: "",
  eventDate: "",
  eventStartTime: "",
  activityDate: "",
  activityTimeSlot: "",
  maxParticipants: "",
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

const EVENT_TICKET_TYPE_OPTIONS = [
  "Early bird",
  "Standard",
  "VIP",
  "VVIP",
  "Group",
  "Child",
  "Student",
];

const ACTIVITY_TYPE_OPTIONS = [
  "Skydiving",
  "Zip line",
  "Bungee jumping",
  "Helicopter ride",
  "Rafting",
  "Game drive",
  "Quad biking",
  "Snorkeling",
  "Cultural tour",
  "Guided tour",
  "Attraction",
  "Package",
];

const ACTIVITY_PRICING_OPTIONS = [
  { value: "per_person", label: "Per person" },
  { value: "per_group", label: "Per group" },
  { value: "private_group", label: "Private group" },
  { value: "package", label: "Package" },
];

const ACTIVITY_TIME_SLOT_OPTIONS = [
  "06:00 - 08:00",
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
  "Sunset slot",
];

const ACTIVITY_CAPACITY_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index + 1),
);

const ADMIN_DRAFT_LISTING_SHORT_DESCRIPTION =
  "Draft listing created from the admin portal.";

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

const REQUIREMENT_SECTION_ORDER: RequirementSection[] = [
  "Profile",
  "Operating Time",
  "Contact Person",
  "Listings",
  "Gallery",
  "Premium Upgrade",
  "Company Verification",
  "ZIMRA and Tax Clearance",
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
    defaultListingType: "",
    defaultPricingModel: "",
  },
  events: {
    label: "Events",
    singular: "event",
    emptyTitle: "No event listings yet",
    emptyBody: "Add an event, ticketed experience, festival, or show.",
    addLabel: "Add event",
    defaultListingType: "",
    defaultPricingModel: "",
  },
  things_to_do: {
    label: "Activities",
    singular: "activity",
    emptyTitle: "No activity listings yet",
    emptyBody: "Add a tour, attraction, activity, or guided experience.",
    addLabel: "Add activity",
    defaultListingType: "",
    defaultPricingModel: "",
  },
  bus: {
    label: "Bus",
    singular: "route",
    emptyTitle: "No bus listings yet",
    emptyBody: "Add a route, shuttle, transfer, or bus service.",
    addLabel: "Add route",
    defaultListingType: "Route",
    defaultPricingModel: "",
  },
  flight: {
    label: "Flight",
    singular: "flight",
    emptyTitle: "No flight listings yet",
    emptyBody: "Add a flight, charter, route, or air transfer.",
    addLabel: "Add flight",
    defaultListingType: "Flight",
    defaultPricingModel: "",
  },
};

const LEGACY_DEFAULT_LISTING_PRICING_MODELS: Record<
  ServiceProviderCategoryId,
  string[]
> = {
  stays: ["per_night", "per_service"],
  events: ["per_ticket", "per_service"],
  things_to_do: ["per_person", "per_service"],
  bus: ["per_seat", "per_service"],
  flight: ["per_seat", "per_service"],
};

export default function EditableServiceProviderProfile({
  provider,
  onProviderChange,
  onProviderListingsChange,
  onActivityLogChange,
  reviewDecision: reviewDecisionProp,
  mode = "admin",
  activeSection = "all",
  onReadinessNavigate,
  onReadinessAttentionChange,
}: {
  provider: ProviderCompanyRecord;
  onProviderChange: (provider: ProviderCompanyRecord) => void;
  onProviderListingsChange?: (listings: ProviderListingRecord[]) => void;
  onActivityLogChange?: () => void;
  reviewDecision?: ReviewDecisionProps;
  mode?: "admin" | "provider";
  activeSection?: ProviderDetailSection;
  onReadinessNavigate?: (section: ProviderDetailSection) => void;
  onReadinessAttentionChange?: (sections: ProviderDetailSection[]) => void;
}) {
  const isProviderMode = mode === "provider";
  const showSection = (...sections: ProviderDetailSection[]) =>
    activeSection === "all" || sections.includes(activeSection);
  const reviewDecision = reviewDecisionProp ?? {
    status: "changes_requested" as ReviewStatus,
    setStatus: () => undefined,
    notes: "",
    setNotes: () => undefined,
    internalSummary: "",
    setInternalSummary: () => undefined,
    saving: false,
    submitReview: () => undefined,
  };
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
  const [deleteConfirmationListing, setDeleteConfirmationListing] =
    useState<AdminListingRecord | null>(null);
  const [editingListingId, setEditingListingId] = useState("");
  const [listingEditForm, setListingEditForm] =
    useState<ListingEditForm>(emptyListingEditForm);
  const [savingListingId, setSavingListingId] = useState("");
  const [listingValidationAttemptedIds, setListingValidationAttemptedIds] =
    useState<Set<string>>(new Set());
  const [tierSaving, setTierSaving] = useState(false);
  const [activationSaving, setActivationSaving] = useState(false);
  const [reviewingMediaId, setReviewingMediaId] = useState("");
  const [selectedGalleryListingId, setSelectedGalleryListingId] = useState("");
  const [galleryPanelEnabled, setGalleryPanelEnabled] = useState(
    () => hasGalleryAccess && provider.galleryEnabled !== false,
  );
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  );
  const ratingSummary = getProviderRatingSummary(provider);
  const savedGalleryEnabled =
    hasGalleryAccess && provider.galleryEnabled !== false;
  const gallerySectionActive = hasGalleryAccess && galleryPanelEnabled;
  const isGalleryDirty = galleryPanelEnabled !== savedGalleryEnabled;
  const galleryReadinessAccess =
    hasGalleryAccess && provider.galleryEnabled !== false;
  const coverImageEditable = isProviderMode && hasGalleryAccess;
  const profileImageEditable = isProviderMode;
  const selectedService = form.selectedServices[0] || "things_to_do";
  const listingServiceConfig = LISTING_SERVICE_CONFIG[selectedService];
  const pendingReviewSections = useMemo(
    () => provider.pendingReviewSections ?? [],
    [provider.pendingReviewSections],
  );
  const [reviewingSection, setReviewingSection] = useState<
    RequirementSection | ""
  >("");

  const reviewSection = async (
    section: RequirementSection,
    decision: "accepted" | "rejected",
  ) => {
    if (isProviderMode || section === "Premium Upgrade") return;

    const incompleteItems = missingRequirements.filter(
      (item) =>
        item.section === section &&
        (item.state ?? "incomplete") === "incomplete",
    );
    if (decision === "accepted" && incompleteItems.length > 0) {
      flagRequirements(incompleteItems);
      setError(
        `${section} still has ${incompleteItems.length} missing ${
          incompleteItems.length === 1 ? "requirement" : "requirements"
        }.`,
      );
      return;
    }

    const sectionItems = missingRequirements.filter(
      (item) => item.section === section,
    );
    const note =
      decision === "rejected" && sectionItems.length > 0
        ? `${section} needs changes:\n${sectionItems
            .map((item) => `- ${item.label}: ${item.detail}`)
            .join("\n")}`
        : decision === "rejected"
          ? `${section} needs changes. Please update this section and resubmit for admin review.`
          : `${section} reviewed and accepted.`;

    setReviewingSection(section);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ provider: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}/sections`,
        {
          method: "PATCH",
          body: JSON.stringify({ section, decision, notes: note }),
        },
      );
      onProviderChange(payload.provider);
      clearRequirementFlags(section);
      if (decision === "rejected") {
        reviewDecision.setStatus("changes_requested");
        reviewDecision.setNotes(appendReviewNote(reviewDecision.notes, note));
      }
      setMessage(
        decision === "accepted"
          ? `${section} accepted.`
          : `${section} rejected and returned to the service provider.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to review this section.",
      );
    } finally {
      setReviewingSection("");
    }
  };

  const acceptSection = (section: RequirementSection) => {
    void reviewSection(section, "accepted");
  };

  const rejectSection = (section: RequirementSection) => {
    void reviewSection(section, "rejected");
  };

  const flagRequirements = (requirements: MissingRequirement[]) => {
    setValidationErrors((current) => {
      const next = new Set(current);
      requirements.forEach((requirement) => next.add(requirement.key));
      return next;
    });
    const listingIds = requirements
      .map((requirement) => requirement.key.match(/^listing:([^:]+)/)?.[1])
      .filter((value): value is string => Boolean(value));
    if (listingIds.length > 0) {
      setListingValidationAttemptedIds((current) => {
        const next = new Set(current);
        listingIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearRequirementFlags = (section: RequirementSection) => {
    const sectionKeys = new Set(
      missingRequirements
        .filter((requirement) => requirement.section === section)
        .map((requirement) => requirement.key),
    );
    if (sectionKeys.size === 0) return;
    setValidationErrors((current) => {
      const next = new Set(current);
      sectionKeys.forEach((key) => next.delete(key));
      return next;
    });
  };

  useEffect(() => {
    const nextForm = toForm(provider);
    setForm(nextForm);
    setSavedSnapshot(snapshotPayload(nextForm));
    setValidationErrors(new Set());
    setListingValidationAttemptedIds(new Set());
  }, [provider.id, provider.updatedAt]);

  useEffect(() => {
    setGalleryPanelEnabled(
      hasGalleryAccess && provider.galleryEnabled !== false,
    );
  }, [provider.id, provider.galleryEnabled, hasGalleryAccess]);

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

      return "";
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

  const missingRequirements = useMemo(
    () =>
      getMissingRequirements({
        provider,
        form,
        documentsByType,
        listings,
        gallery,
        hasGalleryAccess: galleryReadinessAccess,
      }),
    [
      provider,
      form,
      documentsByType,
      listings,
      gallery,
      galleryReadinessAccess,
    ],
  );
  const activationRequirementsMet =
    missingRequirements.every(
      (requirement) => requirement.blocksActivation === false,
    ) &&
    pendingReviewSections.length === 0 &&
    !loadingListings &&
    (!galleryReadinessAccess || !loadingGallery);
  const readinessAttentionSections = useMemo(
    () =>
      getReadinessAttentionSections({
        requirements: missingRequirements,
        pendingReviewSections,
        premiumUpgradeStatus: provider.premiumUpgradeStatus,
        hasGalleryAccess: galleryReadinessAccess,
        operatingTimeEnabled: form.operatingTimeEnabled,
      }),
    [
      missingRequirements,
      pendingReviewSections,
      provider.premiumUpgradeStatus,
      galleryReadinessAccess,
      form.operatingTimeEnabled,
    ],
  );
  useEffect(() => {
    onReadinessAttentionChange?.(readinessAttentionSections);
  }, [onReadinessAttentionChange, readinessAttentionSections]);
  const serviceProviderActive = isProviderActivated(provider);
  const sectionHasSubmittedChanges = (section: RequirementSection) =>
    pendingReviewSections.includes(section);
  const sectionNeedsReview = (section: RequirementSection) => {
    if (isProviderMode) return false;
    if (sectionHasSubmittedChanges(section)) return true;

    if (section === "Profile") {
      return provider.premiumUpgradeStatus === "pending";
    }
    if (section === "Contact Person") {
      return isDocumentAwaitingReview(documentsByType.contact_person_id);
    }
    if (section === "Listings") {
      return serviceListings.some((listing) =>
        ["pending", "pending_review"].includes(listing.status),
      );
    }
    if (section === "Gallery") {
      return gallery.some((image) => image.status === "pending_review");
    }
    if (section === "Company Verification") {
      return isDocumentAwaitingReview(
        documentsByType.certificate_of_incorporation,
      );
    }
    if (section === "ZIMRA and Tax Clearance") {
      return isDocumentAwaitingReview(documentsByType.tax_clearance);
    }

    return false;
  };
  const sectionReviewActionEnabled = (section: RequirementSection) => {
    if (sectionHasSubmittedChanges(section)) return true;
    if (section === "Contact Person") {
      return isDocumentAwaitingReview(documentsByType.contact_person_id);
    }
    if (section === "Company Verification") {
      return isDocumentAwaitingReview(
        documentsByType.certificate_of_incorporation,
      );
    }
    if (section === "ZIMRA and Tax Clearance") {
      return isDocumentAwaitingReview(documentsByType.tax_clearance);
    }
    return false;
  };

  const scrollToRequirementSection = (section: RequirementSection) => {
    if (onReadinessNavigate) {
      onReadinessNavigate(requirementSectionDetailSection(section));
      return;
    }

    scrollToDetailSection(requirementSectionTargetId(section));
  };

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
    if (!isProviderMode) return;
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => {
      if (!current.has(field)) return current;
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  };

  const toggleOperatingTime = (enabled: boolean) => {
    if (!isProviderMode) return;
    setForm((current) => ({ ...current, operatingTimeEnabled: enabled }));
  };

  const toggleDay = (day: OperatingDayId) => {
    if (!isProviderMode) return;
    setForm((current) => ({
      ...current,
      operatingSchedule: {
        ...current.operatingSchedule,
        [day]: {
          ...current.operatingSchedule[day],
          enabled: !current.operatingSchedule[day]?.enabled,
        },
      },
    }));
  };

  const selectService = (service: ServiceProviderCategoryId | "") => {
    if (!isProviderMode) return;
    setForm((current) => ({
      ...current,
      selectedServices: service ? [service] : [],
    }));
    setValidationErrors((current) => {
      if (!current.has("selectedServices")) return current;
      const next = new Set(current);
      next.delete("selectedServices");
      return next;
    });
  };

  const updateOperatingTime = (
    day: OperatingDayId,
    field: "opensAt" | "closesAt",
    value: string,
  ) => {
    if (!isProviderMode) return;
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
    const rejectingPendingTierChange =
      !isProviderMode &&
      provider.premiumUpgradeStatus === "pending" &&
      (enabled ? "premium" : "basic") !== provider.tierChangeRequestedTier;
    setTierSaving(true);
    setError("");
    setMessage("");
    try {
      if (isProviderMode) {
        const cancellingRequest =
          provider.premiumUpgradeStatus === "pending";
        const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
          "/api/provider/company",
          {
            method: "PATCH",
            body: JSON.stringify(
              cancellingRequest
                ? {
                    premiumUpgradeStatus: "none",
                    premiumUpgradeRequestedAt: null,
                  }
                : {
                    providerTier: enabled ? "premium" : "basic",
                    premiumUpgradeStatus: "pending",
                    premiumUpgradeRequestedAt: new Date().toISOString(),
                  },
            ),
          },
        );
        onProviderChange(payload.company);
        setMessage(
          cancellingRequest
            ? "Subscription tier change request cancelled."
            : `${
                enabled ? "Premium upgrade" : "Basic tier downgrade"
              } request submitted. Off2Zim must approve it before your tier changes.`,
        );
        return;
      }

      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}/tier`,
        {
          method: "PATCH",
          body: JSON.stringify({
            providerTier: enabled ? "premium" : "basic",
            tierStatus: "active",
            billingCycle: enabled ? "monthly" : null,
          }),
        },
      );
      onProviderChange(payload.company);
      setMessage(
        rejectingPendingTierChange
          ? "Subscription tier change request rejected."
          : enabled
            ? "Premium upgrade approved and unlocked."
            : "Basic tier change approved.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the subscription request right now.",
      );
    } finally {
      setTierSaving(false);
    }
  };

  const selectLocation = (location: string) => {
    if (!isProviderMode || !location) return;
    setForm((current) => {
      if (current.serviceAreas.includes(location)) return current;
      return { ...current, serviceAreas: [...current.serviceAreas, location] };
    });
    setValidationErrors((current) => {
      if (!current.has("serviceAreas")) return current;
      const next = new Set(current);
      next.delete("serviceAreas");
      return next;
    });
  };

  const removeLocation = (location: string) => {
    if (!isProviderMode) return;
    setForm((current) => ({
      ...current,
      serviceAreas: current.serviceAreas.filter((item) => item !== location),
    }));
  };

  const updateDocument = (
    type: string,
    patch: Partial<Pick<EditableDocument, "status" | "notes">>,
  ) => {
    if (!isProviderMode) return;
    setForm((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.type === type ? { ...document, ...patch } : document,
      ),
    }));
  };

  const updateProviderActivation = async (active: boolean) => {
    if (isProviderMode) {
      setMessage(
        active
          ? "Off2Zim activates the profile after every required section is accepted."
          : "Ask Off2Zim support if you need the profile deactivated.",
      );
      return;
    }

    if (active && !activationRequirementsMet) {
      const blockingRequirements = missingRequirements.filter(
        (requirement) => requirement.blocksActivation !== false,
      );
      flagRequirements(blockingRequirements);
      setError(
        pendingReviewSections.length > 0
          ? "Review every submitted section before activating this service provider."
          : `Complete ${blockingRequirements.length} missing ${
              blockingRequirements.length === 1 ? "requirement" : "requirements"
            } before activating this service provider.`,
      );
      return;
    }

    setActivationSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ provider: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}/activation`,
        {
          method: "PATCH",
          body: JSON.stringify({ active }),
        },
      );
      onProviderChange(payload.provider);
      setMessage(
        active
          ? "Service provider activated."
          : "Service provider deactivated.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update service provider activation.",
      );
    } finally {
      setActivationSaving(false);
    }
  };

  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const payload = await apiFetch<{ media: ProviderMediaRecord[] }>(
        isProviderMode
          ? "/api/provider/media"
          : `/api/admin/provider-media?companyId=${encodeURIComponent(
              provider.id,
            )}`,
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
      if (isProviderMode) {
        const payload = await apiFetch<{ listings: ProviderListingRecord[] }>(
          "/api/provider/listings",
        );
        onProviderListingsChange?.(payload.listings);
        setListings(
          payload.listings.map((listing) =>
            providerListingToAdminListing(listing, provider),
          ),
        );
      } else {
        const payload = await apiFetch<{ listings: AdminListingRecord[] }>(
          "/api/admin/listings",
        );
        setListings(
          payload.listings.filter(
            (listing) => listing.companyId === provider.id,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load listings.");
    } finally {
      setLoadingListings(false);
    }
  };

  const uploadMedia = async (slot: "profile" | "cover", file?: File | null) => {
    if (!isProviderMode) {
      setMessage("Images must be updated by the service provider.");
      return;
    }
    if (!file) return;
    if (slot === "cover" && !coverImageEditable) {
      setMessage("Cover images are available on the premium tier.");
      return;
    }

    setUploading(slot);
    setError("");
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("contentType", slot);
      data.append("contentId", provider.id);
      const upload = await apiFetch<{
        asset: { fileUrl: string; fileName: string };
      }>("/api/provider/uploads/content", {
        method: "POST",
        body: data,
      });
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company",
        {
          method: "PATCH",
          body: JSON.stringify(
            slot === "profile"
              ? {
                  profileImageUrl: upload.asset.fileUrl,
                  reviewSection: "Profile",
                }
              : {
                  coverImageUrl: upload.asset.fileUrl,
                  reviewSection: "Profile",
                },
          ),
        },
      );
      onProviderChange(payload.company);
      setMessage(
        slot === "profile"
          ? "Profile picture updated."
          : "Cover image updated.",
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
    if (!isProviderMode) {
      setMessage("Gallery images must be uploaded by the service provider.");
      return;
    }
    if (!listingId || files.length === 0) return;

    setUploading(`gallery:${listingId}`);
    setError("");
    setMessage("");
    try {
      for (const file of files) {
        const data = new FormData();
        data.append("file", file);
        data.append("contentType", "gallery");
        data.append("contentId", listingId);
        const upload = await apiFetch<{
          asset: {
            fileUrl: string;
            fileName: string;
            contentType: string;
            size: number;
          };
        }>("/api/provider/uploads/content", {
          method: "POST",
          body: data,
        });
        await apiFetch("/api/provider/media", {
          method: "POST",
          body: JSON.stringify({
            listingId,
            mediaType: "image",
            title: upload.asset.fileName,
            altText: upload.asset.fileName,
            url: upload.asset.fileUrl,
            thumbnailUrl: upload.asset.fileUrl,
            mimeType: upload.asset.contentType,
            sizeBytes: upload.asset.size,
            visibility: "private",
          }),
        });
      }
      await loadGallery();
      onActivityLogChange?.();
      setMessage("Gallery images uploaded for Off2Zim review.");
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
    if (isProviderMode) {
      void image;
      void status;
      setMessage("Off2Zim reviews gallery images before they go live.");
      return;
    }

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
      onActivityLogChange?.();
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

  const saveGallerySettings = async () => {
    if (!isProviderMode) {
      setMessage("Gallery availability is controlled by the service provider.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company",
        {
          method: "PATCH",
          body: JSON.stringify({
            galleryEnabled: galleryPanelEnabled,
            reviewSection: "Gallery",
          }),
        },
      );
      onProviderChange(payload.company);
      setMessage(
        galleryPanelEnabled
          ? "Gallery enabled."
          : "Gallery disabled and marked unavailable.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update gallery settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (type: string, file?: File | null) => {
    if (!isProviderMode) {
      setMessage("Documents must be uploaded by the service provider.");
      return;
    }
    if (!file) return;

    setUploading(type);
    setError("");
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("documentType", type);
      const upload = await apiFetch<{
        asset: {
          type: string;
          fileName: string;
          fileUrl?: string | null;
        };
      }>("/api/provider/uploads/documents", {
        method: "POST",
        body: data,
      });
      const existingDocuments = provider.documents.filter(
        (document) => document.type !== type,
      );
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company",
        {
          method: "PATCH",
          body: JSON.stringify({
            documents: [
              ...existingDocuments.map((document) => ({
                type: document.type,
                fileName: document.fileName,
                fileUrl: document.fileUrl ?? null,
                status: document.status || "uploaded",
                notes: document.notes ?? null,
              })),
              {
                type,
                fileName: upload.asset.fileName,
                fileUrl: upload.asset.fileUrl ?? null,
                status: "uploaded",
                notes: null,
              },
            ],
            reviewSection: reviewSectionForDocumentType(type),
          }),
        },
      );
      onProviderChange(payload.company);
      setValidationErrors((current) => {
        if (!current.has(type)) return current;
        const next = new Set(current);
        next.delete(type);
        return next;
      });
      setMessage("Document uploaded for Off2Zim review.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to upload document.",
      );
    } finally {
      setUploading("");
    }
  };

  const deleteDocument = async (type: string) => {
    if (!isProviderMode) {
      setMessage("Documents must be changed by the service provider.");
      return;
    }

    setUploading(type);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company",
        {
          method: "PATCH",
          body: JSON.stringify({
            documents: provider.documents
              .filter((document) => document.type !== type)
              .map((document) => ({
                type: document.type,
                fileName: document.fileName,
                fileUrl: document.fileUrl ?? null,
                status: document.status || "uploaded",
                notes: document.notes ?? null,
              })),
            reviewSection: reviewSectionForDocumentType(type),
          }),
        },
      );
      onProviderChange(payload.company);
      setMessage("Document removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove document.",
      );
    } finally {
      setUploading("");
    }
  };

  const saveCompanySection = async (section: RequirementSection) => {
    if (!isProviderMode) {
      setMessage("Only the service provider can edit submitted information.");
      return;
    }

    const sectionErrors = getProviderSaveErrors({
      section,
      provider,
      form,
      documentsByType,
    });
    if (sectionErrors.size > 0) {
      setValidationErrors((current) => new Set([...current, ...sectionErrors]));
      setError(
        `${section} still has missing required ${
          sectionErrors.size === 1 ? "field" : "fields"
        }.`,
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company",
        {
          method: "PATCH",
          body: JSON.stringify({
            ...formToProviderPayload(form),
            reviewSection: section,
          }),
        },
      );
      onProviderChange(payload.company);
      setSavedSnapshot(snapshotPayload(toForm(payload.company)));
      clearRequirementFlags(section);
      setMessage(`${section} saved and submitted for Off2Zim review.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this section right now.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    await saveCompanySection("Profile");
  };

  const cancelChanges = () => {
    if (isProviderMode) {
      const nextForm = toForm(provider);
      setForm(nextForm);
      setListingEditForm(emptyListingEditForm);
      setEditingListingId("");
      setValidationErrors(new Set());
      setListingValidationAttemptedIds(new Set());
      setMessage("Changes cancelled.");
      return;
    }

    setMessage(
      "No admin edits to discard. Use Reject to request provider changes.",
    );
  };

  const addListing = async () => {
    if (!isProviderMode) {
      setMessage("Listings must be created by the service provider.");
      return;
    }

    if (provider.onboardingStatus !== "basic_approved") {
      setError(
        "Listings unlock after Off2Zim approves the service provider profile.",
      );
      return;
    }

    if (!form.selectedServices[0]) {
      setValidationErrors((current) =>
        new Set(current).add("selectedServices"),
      );
      setError(
        "Select one service in the Profile section before adding a listing.",
      );
      return;
    }

    setAddingListing(true);
    setError("");
    setMessage("");
    try {
      const service = form.selectedServices[0];
      const config = LISTING_SERVICE_CONFIG[service];
      const location = form.serviceAreas[0] || "";
      const destination = curatedZimbabweDestinations.find(
        (item) => item.name === location,
      );
      const title = `${getProviderDisplayName(provider, form)} ${config.singular}`;
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        "/api/provider/listings",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            category: serviceProviderCategoryLabels[service],
            listingType: config.defaultListingType || config.singular,
            shortDescription: "",
            description: `${title} listing submitted from the provider dashboard.`,
            location,
            pricingModel: config.defaultPricingModel || "per_service",
            basePrice: null,
            currency: "USD",
            bookingMode: "request",
            instantBooking: false,
            status: "pending_review",
            visibility: "private",
            capacity: null,
            images: [],
            tags: [],
            amenities: [],
            policies: {},
            metadata: {
              serviceCategory: service,
              ...(destination
                ? {
                    destinationId: destination.id,
                    destinationName: destination.name,
                    destinationLocation: destination.location,
                  }
                : {}),
            },
            availability: [],
          }),
        },
      );
      const nextListing = providerListingToAdminListing(
        payload.listing,
        provider,
      );
      setListings((current) => [nextListing, ...current]);
      void loadListings();
      onActivityLogChange?.();
      startEditListing(nextListing);
      setMessage("Listing created. Complete the required fields and save it.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create listing.",
      );
    } finally {
      setAddingListing(false);
    }
  };

  const deleteListing = (listing: AdminListingRecord) => {
    if (!isProviderMode) {
      setMessage("Listings must be removed by the service provider.");
      return;
    }
    setDeleteConfirmationListing(listing);
  };

  const confirmDeleteListing = async () => {
    if (!deleteConfirmationListing) return;

    setDeletingListingId(deleteConfirmationListing.id);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ archived: boolean; deleted: boolean }>(
        isProviderMode
          ? `/api/provider/listings/${encodeURIComponent(
              deleteConfirmationListing.id,
            )}`
          : `/api/admin/listings/${deleteConfirmationListing.id}`,
        { method: "DELETE" },
      );
      await loadListings();
      onActivityLogChange?.();
      setDeleteConfirmationListing(null);
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
      toListingEditForm(
        listing,
        getProviderDisplayName(provider, form),
        form.serviceAreas,
      ),
    );
  };

  const updateListingEdit = (
    listing: AdminListingRecord,
    patch: Partial<ListingEditForm>,
  ) => {
    setSelectedGalleryListingId(listing.id);
    setEditingListingId(listing.id);
    if (!isProviderMode) return;
    setListingEditForm((current) => {
      const base =
        editingListingId === listing.id
          ? current
          : toListingEditForm(
              listing,
              getProviderDisplayName(provider, form),
              form.serviceAreas,
            );
      return { ...base, ...patch };
    });
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

  const saveListingEdit = async (listing?: AdminListingRecord) => {
    if (!isProviderMode) {
      await reviewListing(listing, "active");
      return;
    }

    const target =
      listing ??
      listings.find((item) => item.id === editingListingId) ??
      listings[0];
    if (!target) return;
    const values =
      target.id === editingListingId
        ? listingEditForm
        : toListingEditForm(
            target,
            getProviderDisplayName(provider, form),
            form.serviceAreas,
          );
    const errors = getListingValidationErrors(
      values,
      selectedService,
      form.serviceAreas,
    );
    if (errors.size > 0) {
      setListingValidationAttemptedIds((current) =>
        new Set(current).add(target.id),
      );
      setError(
        `${getListingDisplayId(
          getServiceProviderDisplayId(provider),
          target,
          listings,
        )} still has missing required fields.`,
      );
      return;
    }

    setSavingListingId(target.id);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ listing: ProviderListingRecord }>(
        `/api/provider/listings/${target.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(
            listingFormToProviderPayload(values, selectedService, target),
          ),
        },
      );
      const updated = providerListingToAdminListing(payload.listing, provider);
      setListings((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      void loadListings();
      onActivityLogChange?.();
      setEditingListingId("");
      setListingEditForm(emptyListingEditForm);
      setListingValidationAttemptedIds((current) => {
        const next = new Set(current);
        next.delete(target.id);
        return next;
      });
      setMessage("Listing saved and submitted for Off2Zim review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save listing.");
    } finally {
      setSavingListingId("");
    }
  };

  const reviewListing = async (
    listing: AdminListingRecord | undefined,
    status: "active" | "rejected",
  ) => {
    if (isProviderMode) return;
    const target =
      listing ?? listings.find((item) => item.id === editingListingId);
    if (!target) return;

    setSavingListingId(target.id);
    setError("");
    setMessage("");
    try {
      const payload = await apiFetch<{ listing: AdminListingRecord }>(
        `/api/admin/listings/${target.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            visibility: status === "active" ? "public" : "private",
          }),
        },
      );
      setListings((current) =>
        current.map((item) =>
          item.id === payload.listing.id ? payload.listing : item,
        ),
      );
      void loadListings();
      onActivityLogChange?.();
      setMessage(
        status === "active"
          ? "Listing accepted and published."
          : "Listing rejected and returned to the service provider.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to review listing.",
      );
    } finally {
      setSavingListingId("");
    }
  };

  const blockApprovalIfMissing = () => {
    const blockingRequirements = missingRequirements.filter(
      (requirement) => requirement.blocksActivation !== false,
    );
    if (blockingRequirements.length === 0) return false;
    flagRequirements(blockingRequirements);
    setError(
      `Resolve ${blockingRequirements.length} missing ${
        blockingRequirements.length === 1 ? "requirement" : "requirements"
      } before accepting this service provider.`,
    );
    return true;
  };

  const submitAdminReviewDecision = () => {
    if (
      reviewDecision.status !== "changes_requested" &&
      blockApprovalIfMissing()
    ) {
      return;
    }
    reviewDecision.submitReview();
  };

  const acceptOverall = () => {
    if (blockApprovalIfMissing()) return;
    reviewDecision.submitReview(
      provider.providerTier === "premium"
        ? "verified_premium"
        : "basic_approved",
      reviewDecision.notes || "Service provider profile reviewed and accepted.",
      reviewDecision.internalSummary,
    );
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

      {deleteConfirmationListing ? (
        <AlertModal
          tone="warning"
          title="Delete listing?"
          message={`Delete ${deleteConfirmationListing.title}? Booking records stay in history, but this listing will be removed from the service provider.`}
          confirmLabel={
            deletingListingId === deleteConfirmationListing.id
              ? "Deleting..."
              : "Delete"
          }
          cancelLabel="Cancel"
          confirming={deletingListingId === deleteConfirmationListing.id}
          onConfirm={confirmDeleteListing}
          onClose={() => {
            if (!deletingListingId) {
              setDeleteConfirmationListing(null);
            }
          }}
        />
      ) : null}

      {reviewsOpen ? (
        <ReviewsModal
          provider={provider}
          onClose={() => setReviewsOpen(false)}
        />
      ) : null}

      {showSection("profile") ? (
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
                    coverImageEditable
                      ? "cursor-pointer"
                      : "cursor-not-allowed",
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
                    handleFileChange(event, (file) =>
                      uploadMedia("cover", file),
                    )
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
                  aria-disabled={!profileImageEditable}
                  className={cn(
                    "relative flex h-32 w-32 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border-[3px] bg-white bg-cover bg-center bg-no-repeat text-center transition dark:bg-[#101010]",
                    profileImageEditable
                      ? "cursor-pointer hover:scale-[1.01]"
                      : "cursor-not-allowed",
                    validationErrors.has("profileImageUrl")
                      ? "border-rose-400 dark:border-rose-500"
                      : "border-slate-300 dark:border-white/25",
                  )}
                  style={
                    provider.profileImageUrl
                      ? {
                          backgroundImage: `url("${provider.profileImageUrl}")`,
                        }
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
                    disabled={!profileImageEditable}
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
                  {form.serviceAreas[0] ||
                  provider.headquartersCity ||
                  provider.physicalAddress ? (
                    <div className="mt-2">
                      <LocationPill
                        location={
                          form.serviceAreas[0] ||
                          provider.headquartersCity ||
                          provider.physicalAddress
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              {!isProviderMode ? (
                <div className="pb-1 sm:ml-auto">
                  <RatingPill
                    average={ratingSummary.average}
                    reviewCount={ratingSummary.reviewCount}
                    onClick={() => setReviewsOpen(true)}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {showSection("readiness") ? (
        <ReadinessSummaryPanel
          requirements={missingRequirements}
          pendingReviewSections={pendingReviewSections}
          premiumUpgradeStatus={provider.premiumUpgradeStatus}
          hasGalleryAccess={galleryReadinessAccess}
          operatingTimeEnabled={form.operatingTimeEnabled}
          serviceProviderActive={serviceProviderActive}
          activationReady={activationRequirementsMet}
          activationSaving={activationSaving}
          checkingRequirements={
            loadingListings || (hasGalleryAccess && loadingGallery)
          }
          canManageActivation={!isProviderMode}
          onToggleActivation={updateProviderActivation}
          onNavigateSection={scrollToRequirementSection}
        />
      ) : null}

      {showSection("profile") ? (
        <FormPanel
          id="profile"
          title="Profile"
          attention={!isProviderMode && sectionNeedsReview("Profile")}
        >
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
            canApprovePending={!isProviderMode}
            onTogglePremium={togglePremiumTier}
          />

          {isProviderMode ? (
            <ProviderSectionActions
              changed={isProfileDirty}
              saving={saving}
              onCancel={cancelChanges}
              onSave={saveProfile}
            />
          ) : (
            <SectionReviewActions
              section="Profile"
              saving={reviewDecision.saving || reviewingSection === "Profile"}
              enabled={sectionReviewActionEnabled("Profile")}
              onAccept={acceptSection}
              onReject={rejectSection}
            />
          )}
        </FormPanel>
      ) : null}

      {showSection("operating-time") ? (
        <FormPanel
          id="operating-time"
          title="Operating Time"
          attention={!isProviderMode && sectionNeedsReview("Operating Time")}
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
                            updateOperatingTime(
                              day.id,
                              "opensAt",
                              e.target.value,
                            )
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
          {isProviderMode ? (
            <ProviderSectionActions
              changed={isOperatingTimeDirty}
              saving={saving}
              onCancel={cancelChanges}
              onSave={() => saveCompanySection("Operating Time")}
            />
          ) : (
            <SectionReviewActions
              section="Operating Time"
              saving={
                reviewDecision.saving || reviewingSection === "Operating Time"
              }
              enabled={sectionReviewActionEnabled("Operating Time")}
              onAccept={acceptSection}
              onReject={rejectSection}
            />
          )}
        </FormPanel>
      ) : null}

      {showSection("contact-person") ? (
        <FormPanel
          id="contact-person"
          title="Contact Person"
          attention={!isProviderMode && sectionNeedsReview("Contact Person")}
        >
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
                  validationErrors.has("contactPersonIdType")
                    ? "border-rose-400 focus:border-rose-400 dark:border-rose-500 dark:focus:border-rose-500"
                    : form.contactPersonIdType &&
                        form.contactPersonIdType !==
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
                <span className="text-xs font-bold text-rose-500">
                  Required
                </span>
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
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
                  validationErrors.has("contact_person_id")
                    ? "border-rose-400 hover:border-rose-500 hover:bg-rose-50/30 dark:border-rose-500/50 dark:hover:border-rose-500/70 dark:hover:bg-rose-500/[0.03]"
                    : "border-slate-200 hover:border-slate-400/50 hover:bg-slate-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[0.04]",
                )}
              >
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
                        disabled={isProviderMode}
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-xs font-medium transition disabled:pointer-events-none",
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
                {!isProviderMode ? (
                  <label className="block">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                        Review notes
                      </span>
                    </div>
                    <textarea
                      value={
                        form.documents.find(
                          (d) => d.type === "contact_person_id",
                        )?.notes ??
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
                ) : documentsByType.contact_person_id.notes ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
                    {documentsByType.contact_person_id.notes}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          {isProviderMode ? (
            <ProviderSectionActions
              changed={isContactDirty}
              saving={saving}
              onCancel={cancelChanges}
              onSave={() => saveCompanySection("Contact Person")}
            />
          ) : (
            <SectionReviewActions
              section="Contact Person"
              saving={
                reviewDecision.saving || reviewingSection === "Contact Person"
              }
              enabled={sectionReviewActionEnabled("Contact Person")}
              onAccept={acceptSection}
              onReject={rejectSection}
            />
          )}
        </FormPanel>
      ) : null}

      {showSection("listings") ? (
        <FormPanel
          id="listings"
          title="Listings"
          attention={!isProviderMode && sectionNeedsReview("Listings")}
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
            providerMode={isProviderMode}
            onEditListing={updateListingEdit}
            onCancelListing={
              isProviderMode
                ? cancelEditListing
                : (listing) => reviewListing(listing, "rejected")
            }
            onSaveListing={saveListingEdit}
            onDeleteListing={deleteListing}
          />
        </FormPanel>
      ) : null}

      {showSection("gallery") ? (
        <FormPanel
          id="gallery"
          title="Gallery"
          attention={!isProviderMode && sectionNeedsReview("Gallery")}
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
            serviceProviderId={getServiceProviderDisplayId(provider)}
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
            canReview={!isProviderMode}
          />
          {isProviderMode ? (
            <ProviderSectionActions
              changed={isGalleryDirty}
              saving={saving || uploading.startsWith("gallery:")}
              onCancel={() => setGalleryPanelEnabled(savedGalleryEnabled)}
              onSave={saveGallerySettings}
            />
          ) : (
            <SectionReviewActions
              section="Gallery"
              saving={reviewDecision.saving || reviewingSection === "Gallery"}
              enabled={sectionReviewActionEnabled("Gallery")}
              onAccept={acceptSection}
              onReject={rejectSection}
            />
          )}
        </FormPanel>
      ) : null}

      {showSection("verification") ? (
        <>
          <FormPanel
            id="company-verification"
            title="Company verification"
            attention={
              !isProviderMode && sectionNeedsReview("Company Verification")
            }
          >
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
                hasError={validationErrors.has("incorporationDate")}
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
                hasError={validationErrors.has("certificate_of_incorporation")}
                editable={form.documents.find(
                  (item) => item.type === "certificate_of_incorporation",
                )}
                uploading={uploading === "certificate_of_incorporation"}
                canEditReview={!isProviderMode}
                showMissingStatus={!isProviderMode}
                highlightUploaded={isProviderMode}
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
            {isProviderMode ? (
              <ProviderSectionActions
                changed={isDirty}
                saving={saving}
                onCancel={cancelChanges}
                onSave={() => saveCompanySection("Company Verification")}
              />
            ) : (
              <SectionReviewActions
                section="Company Verification"
                saving={
                  reviewDecision.saving ||
                  reviewingSection === "Company Verification"
                }
                enabled={sectionReviewActionEnabled("Company Verification")}
                onAccept={acceptSection}
                onReject={rejectSection}
              />
            )}
          </FormPanel>

          <FormPanel
            id="zimra-tax"
            title="ZIMRA and tax clearance"
            attention={
              !isProviderMode && sectionNeedsReview("ZIMRA and Tax Clearance")
            }
          >
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
                onChange={(value) =>
                  updateField("taxClearanceExpiresAt", value)
                }
                icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                hasError={validationErrors.has("taxClearanceExpiresAt")}
              />
            </div>
            <div className="mt-4">
              <DocumentRequirement
                document={documentsByType.tax_clearance}
                definition={REQUIRED_DOCUMENTS[2]}
                hasError={validationErrors.has("tax_clearance")}
                editable={form.documents.find(
                  (item) => item.type === "tax_clearance",
                )}
                uploading={uploading === "tax_clearance"}
                canEditReview={!isProviderMode}
                showMissingStatus={!isProviderMode}
                highlightUploaded={isProviderMode}
                onUpload={(file) => uploadDocument("tax_clearance", file)}
                onStatusChange={(status) =>
                  updateDocument("tax_clearance", { status })
                }
                onNotesChange={(notes) =>
                  updateDocument("tax_clearance", { notes })
                }
              />
            </div>
            {isProviderMode ? (
              <ProviderSectionActions
                changed={isDirty}
                saving={saving}
                onCancel={cancelChanges}
                onSave={() => saveCompanySection("ZIMRA and Tax Clearance")}
              />
            ) : (
              <SectionReviewActions
                section="ZIMRA and Tax Clearance"
                saving={
                  reviewDecision.saving ||
                  reviewingSection === "ZIMRA and Tax Clearance"
                }
                enabled={sectionReviewActionEnabled("ZIMRA and Tax Clearance")}
                onAccept={acceptSection}
                onReject={rejectSection}
              />
            )}
          </FormPanel>
        </>
      ) : null}

      {!isProviderMode && showSection("admin-review") ? (
        <>
          <FormPanel id="admin-review" title="Admin review">
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
                  onClick={submitAdminReviewDecision}
                  disabled={reviewDecision.saving}
                  className={cn(
                    actionButtonVariants({ variant: "primary", size: "lg" }),
                  )}
                >
                  {reviewDecision.saving
                    ? "Submitting..."
                    : "Submit review decision"}
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
              onClick={() => {
                flagRequirements(missingRequirements);
                reviewDecision.setStatus("changes_requested");
                reviewDecision.submitReview(
                  "changes_requested",
                  reviewDecision.notes ||
                    "Changes requested. Please review the rejected sections and resubmit.",
                  reviewDecision.internalSummary,
                );
              }}
              disabled={reviewDecision.saving}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-45 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
              )}
            >
              Reject and request changes
            </button>
            <button
              type="button"
              onClick={acceptOverall}
              disabled={reviewDecision.saving}
              className={cn(
                actionButtonVariants({ variant: "primary", size: "lg" }),
              )}
            >
              {reviewDecision.saving ? "Accepting..." : "Accept overall"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DocumentRequirement({
  document,
  definition,
  hasError = false,
  editable,
  uploading,
  canEditReview = true,
  showMissingStatus = true,
  highlightUploaded = false,
  onUpload,
  onStatusChange,
  onNotesChange,
}: {
  document?: ProviderDocumentRecord;
  definition: (typeof REQUIRED_DOCUMENTS)[number];
  hasError?: boolean;
  editable?: EditableDocument;
  uploading: boolean;
  canEditReview?: boolean;
  showMissingStatus?: boolean;
  highlightUploaded?: boolean;
  onUpload: (file?: File | null) => void;
  onStatusChange: (status: string) => void;
  onNotesChange: (notes: string) => void;
}) {
  const Icon = definition.icon;
  const status = documentStatus(document);
  const showStatusIcon =
    Boolean(document) || hasError || canEditReview || showMissingStatus;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        hasError
          ? "border-rose-300 dark:border-rose-500/60"
          : highlightUploaded && document && status !== "rejected"
            ? "border-emerald-400 dark:border-emerald-400/70"
            : "border-slate-200 dark:border-white/10",
      )}
    >
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
            {hasError ? (
              <span className="text-xs font-bold text-rose-500">Required</span>
            ) : null}
            {showStatusIcon ? <DocumentStatusIcon status={status} /> : null}
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
                disabled={!document || !canEditReview}
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

          {canEditReview ? (
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
          ) : document?.notes ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
              {document.notes}
            </div>
          ) : null}
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
  id,
  title,
  action,
  attention = false,
  children,
}: {
  id?: string;
  title: string;
  action?: ReactNode;
  attention?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 rounded-2xl border bg-white p-5 dark:bg-[#101010]",
        attention
          ? "border-amber-300 shadow-[0_0_0_4px_rgba(245,158,11,0.08)] dark:border-amber-400/40"
          : "border-slate-200 dark:border-white/10",
      )}
    >
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

function SectionReviewActions({
  section,
  saving,
  enabled = true,
  onAccept,
  onReject,
}: {
  section: RequirementSection;
  saving: boolean;
  enabled?: boolean;
  onAccept: (section: RequirementSection) => void;
  onReject: (section: RequirementSection) => void;
}) {
  return (
    <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-center">
      <button
        type="button"
        onClick={() => onReject(section)}
        disabled={saving || !enabled}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-rose-50 px-5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() => onAccept(section)}
        disabled={saving || !enabled}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        Accept
      </button>
    </div>
  );
}

function ProviderSectionActions({
  changed,
  saving,
  onCancel,
  onSave,
}: {
  changed: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-center">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving || !changed}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-rose-50 px-5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !changed}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function ReadinessSummaryPanel({
  requirements,
  pendingReviewSections,
  premiumUpgradeStatus,
  hasGalleryAccess,
  operatingTimeEnabled,
  serviceProviderActive,
  activationReady,
  activationSaving,
  checkingRequirements,
  canManageActivation,
  onToggleActivation,
  onNavigateSection,
}: {
  requirements: MissingRequirement[];
  pendingReviewSections: string[];
  premiumUpgradeStatus?: string | null;
  hasGalleryAccess: boolean;
  operatingTimeEnabled: boolean;
  serviceProviderActive: boolean;
  activationReady: boolean;
  activationSaving: boolean;
  checkingRequirements: boolean;
  canManageActivation: boolean;
  onToggleActivation: (active: boolean) => void;
  onNavigateSection: (section: RequirementSection) => void;
}) {
  const grouped = REQUIREMENT_SECTION_ORDER.filter(
    (section) =>
      section !== "Premium Upgrade" || premiumUpgradeStatus === "pending",
  ).map((section) => {
    const items = requirements.filter((item) => item.section === section);
    const incompleteItems = items.filter(
      (item) => (item.state ?? "incomplete") === "incomplete",
    );
    const pendingItems = items.filter(
      (item) => item.state === "pending_review",
    );
    const availability =
      (section === "Gallery" && !hasGalleryAccess) ||
      (section === "Operating Time" && !operatingTimeEnabled)
        ? "unavailable"
        : "available";
    const pending =
      availability === "available" &&
      (pendingItems.length > 0 ||
        pendingReviewSections.includes(section) ||
        (section === "Premium Upgrade" && premiumUpgradeStatus === "pending"));

    return {
      section,
      items,
      incompleteItems,
      pendingItems,
      availability,
      pending,
    };
  });
  const totalMissing = requirements.filter(
    (requirement) => (requirement.state ?? "incomplete") === "incomplete",
  ).length;
  const totalPending = grouped.filter((group) => group.pending).length;
  const readinessSections = grouped.filter(
    (group) =>
      group.availability === "available" && group.section !== "Premium Upgrade",
  );
  const completeSections = readinessSections.filter(
    (group) => group.incompleteItems.length === 0 && !group.pending,
  );
  const readinessPercent = Math.round(
    readinessSections.length > 0
      ? (completeSections.length / readinessSections.length) * 100
      : 100,
  );
  const canActivate = activationReady && !checkingRequirements;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101010]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ReadinessProgressCircle value={readinessPercent} />
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Readiness summary
            </h3>
            <div className="mt-1 text-sm text-slate-500 dark:text-white/50">
              {completeSections.length}/{readinessSections.length} readiness
              sections complete
              {totalMissing > 0
                ? ` - ${totalMissing} ${
                    totalMissing === 1 ? "field" : "fields"
                  } missing`
                : totalPending > 0
                  ? ` - ${totalPending} ${
                      totalPending === 1 ? "section" : "sections"
                    } pending review`
                  : " - ready for activation"}
            </div>
          </div>
        </div>

        {canManageActivation ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04] lg:min-w-[300px]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Service provider
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    serviceProviderActive ? "bg-emerald-500" : "bg-slate-400",
                  )}
                />
                {serviceProviderActive ? "Active" : "Inactive"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-right text-xs font-medium leading-5 text-slate-500 dark:text-white/45">
                  {checkingRequirements
                    ? "Checking"
                    : canActivate
                      ? "Ready"
                      : serviceProviderActive
                        ? "Can deactivate"
                        : "Locked"}
                </div>
              </div>
              <ActivationToggle
                checked={serviceProviderActive}
                disabled={
                  activationSaving || (!canActivate && !serviceProviderActive)
                }
                onChange={onToggleActivation}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        {grouped.map(
          ({
            section,
            items,
            incompleteItems,
            pendingItems,
            availability,
            pending,
          }) => {
            const isUnavailable = availability === "unavailable";
            const isIncomplete = incompleteItems.length > 0;

            return (
              <button
                type="button"
                key={section}
                onClick={() => onNavigateSection(section)}
                className={cn(
                  "block w-full border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]",
                  isUnavailable
                    ? "bg-slate-50/70 dark:bg-white/[0.02]"
                    : isIncomplete
                      ? "bg-rose-50/45 dark:bg-rose-400/[0.04]"
                      : pending
                        ? "bg-amber-50/45 dark:bg-amber-400/[0.04]"
                        : "bg-white dark:bg-transparent",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex min-w-[180px] flex-1 items-center gap-2">
                    <SectionReadinessIcon
                      missing={incompleteItems.length}
                      pending={pending}
                      inactive={isUnavailable}
                    />
                    <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {section}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      isUnavailable
                        ? "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-white/45"
                        : isIncomplete
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
                          : pending
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
                    )}
                  >
                    {isUnavailable
                      ? "Unavailable"
                      : isIncomplete
                        ? "Incomplete"
                        : pending
                          ? "Pending review"
                          : "Complete"}
                  </span>
                </div>

                {items.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                    {items.map((item) => (
                      <span
                        key={item.key}
                        title={item.detail}
                        className={cn(
                          "rounded-full border bg-white px-2.5 py-1 text-xs font-medium dark:bg-[#0b0b0b]",
                          item.state === "pending_review"
                            ? "border-amber-200 text-amber-700 dark:border-amber-300/25 dark:text-amber-300"
                            : "border-rose-200 text-rose-700 dark:border-rose-300/25 dark:text-rose-300",
                        )}
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {section === "Premium Upgrade" &&
                premiumUpgradeStatus === "pending" &&
                pendingItems.length === 0 ? (
                  <div className="mt-2 pl-7 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Requested upgrade awaiting Off2Zim approval
                  </div>
                ) : null}
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}

function ReadinessProgressCircle({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color =
    clamped === 100 ? "#10b981" : clamped >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(148,163,184,0.2) 0deg)`,
      }}
      aria-label={`${clamped}% ready`}
    >
      <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-[#101010]">
        <div className="text-lg font-black leading-none text-slate-950 dark:text-white">
          {clamped}%
        </div>
      </div>
    </div>
  );
}

function SectionReadinessIcon({
  missing,
  pending = false,
  inactive = false,
}: {
  missing: number;
  pending?: boolean;
  inactive?: boolean;
}) {
  if (inactive) {
    return <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />;
  }

  if (missing > 0) {
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  }

  if (pending) {
    return <IonHourglassOutline className="h-5 w-5 text-amber-500" />;
  }

  return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
}

function ActivationToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
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
        "relative inline-flex h-9 w-16 items-center rounded-full transition",
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/15",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <span
        className={cn(
          "absolute top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition",
          checked ? "left-8 text-emerald-600" : "left-1",
        )}
      >
        <Power className="h-3.5 w-3.5" />
      </span>
      <span className="sr-only">
        {checked ? "Deactivate provider" : "Activate provider"}
      </span>
    </button>
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
  providerMode = false,
  onEditListing,
  onCancelListing,
  onSaveListing,
  onDeleteListing,
}: {
  listings: AdminListingRecord[];
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
  providerMode?: boolean;
  onEditListing: (
    listing: AdminListingRecord,
    patch: Partial<ListingEditForm>,
  ) => void;
  onCancelListing: (listing?: AdminListingRecord) => void;
  onSaveListing: (listing?: AdminListingRecord) => void;
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
              listings,
            );
            const editing = listing.id === editingListingId;
            const values = editing
              ? listingEditForm
              : toListingEditForm(listing, displayName, operatingLocations);
            const initialValues = toListingEditForm(
              listing,
              displayName,
              operatingLocations,
            );
            const statusValue = values.status || listing.status;
            const displayStatus = getListingStatusDisplayValue(statusValue);
            const listingNeedsReview =
              !providerMode && displayStatus === "pending";
            const isStayListing = service === "stays";
            const isEventListing = service === "events";
            const isActivityListing = service === "things_to_do";
            const useFiveColumnListingGrid =
              isStayListing || isEventListing || isActivityListing;
            const isActive = displayStatus === "approved";
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
                className={cn(
                  "relative rounded-xl border bg-white p-3 transition dark:bg-[#0b0b0b]",
                  listingNeedsReview
                    ? "border-amber-300 shadow-[0_0_0_4px_rgba(245,158,11,0.08)] dark:border-amber-400/40"
                    : "border-slate-200 dark:border-white/10",
                )}
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

                <div className="grid gap-3 pr-12 md:grid-cols-[220px_minmax(0,280px)] lg:grid-cols-[220px_minmax(0,280px)_minmax(0,300px)] lg:items-end">
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
                    <div className="w-full sm:w-auto">
                      <ListingFieldLabel>Listing Status</ListingFieldLabel>
                      <div className="flex items-center gap-3">
                        <div className="w-full sm:w-[220px]">
                          <StatusPill value={displayStatus} size="field" />
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
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-3 grid gap-3 md:grid-cols-2",
                    useFiveColumnListingGrid
                      ? "xl:grid-cols-5"
                      : "xl:grid-cols-4",
                  )}
                >
                  <label className="block">
                    <ListingFieldLabel
                      required={showRequiredState && !values.listingType}
                    >
                      {service === "stays"
                        ? "Room type"
                        : service === "events"
                          ? "Event type"
                          : service === "things_to_do"
                            ? "Activity"
                            : "Listing type"}
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

                  {isEventListing ? (
                    <label className="block">
                      <ListingFieldLabel
                        required={showRequiredState && !values.ticketType}
                      >
                        Ticket type
                      </ListingFieldLabel>
                      <select
                        value={values.ticketType}
                        onChange={(event) =>
                          edit({ ticketType: event.target.value })
                        }
                        className={cn(
                          inputClassName,
                          getListingRequiredFieldClass(
                            values.ticketType,
                            showRequiredState,
                          ),
                        )}
                      >
                        <option value="">Select</option>
                        {EVENT_TICKET_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {isEventListing ? (
                    <label className="block">
                      <ListingFieldLabel
                        required={showRequiredState && !values.totalTickets}
                      >
                        Total tickets
                      </ListingFieldLabel>
                      <input
                        type="number"
                        min="1"
                        value={values.totalTickets}
                        onChange={(event) =>
                          edit({ totalTickets: event.target.value })
                        }
                        className={cn(
                          inputClassName,
                          getListingRequiredFieldClass(
                            values.totalTickets,
                            showRequiredState,
                          ),
                        )}
                        placeholder="Add"
                      />
                    </label>
                  ) : null}

                  {isActivityListing ? (
                    <ListingSelectControl
                      label="Max participants"
                      value={values.maxParticipants}
                      options={ACTIVITY_CAPACITY_OPTIONS}
                      required
                      showRequiredState={showRequiredState}
                      onChange={(value) =>
                        edit({ maxParticipants: value, capacity: value })
                      }
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
                      {service === "stays"
                        ? "Price / night"
                        : service === "events"
                          ? "Price / ticket"
                          : service === "things_to_do" &&
                              (values.pricingModel === "per_group" ||
                                values.pricingModel === "private_group")
                            ? "Group price"
                            : service === "things_to_do"
                              ? "Price / person"
                              : "Price"}
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

                  {!isEventListing && !isActivityListing ? (
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
                  ) : null}

                  <label
                    className={cn(
                      "block md:col-span-2",
                      useFiveColumnListingGrid
                        ? "xl:col-span-5"
                        : "xl:col-span-4",
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

                  <div
                    className={cn(
                      "md:col-span-2",
                      useFiveColumnListingGrid
                        ? "xl:col-span-5"
                        : "xl:col-span-4",
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
                      useFiveColumnListingGrid
                        ? "xl:col-span-5"
                        : "xl:col-span-4",
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

                  {isStayListing ? (
                    <StaysListingCalendarPanel
                      listing={listing}
                      values={values}
                    />
                  ) : null}

                  {isEventListing ? (
                    <EventListingCalendarPanel
                      values={values}
                      showRequiredState={showRequiredState}
                      onChange={(patch) => edit(patch)}
                    />
                  ) : null}

                  {isActivityListing ? (
                    <ActivityListingCalendarPanel
                      values={values}
                      showRequiredState={showRequiredState}
                      onChange={(patch) => edit(patch)}
                    />
                  ) : null}
                </div>

                <div className="mt-3 flex flex-col-reverse items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => onCancelListing(listing)}
                    disabled={
                      savingListingId !== "" ||
                      (!providerMode && !listingNeedsReview)
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-45 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
                  >
                    {providerMode ? "Cancel" : "Reject"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveListing(listing)}
                    disabled={
                      savingListingId !== "" ||
                      (!providerMode && !listingNeedsReview)
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-45 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  >
                    {savingListingId === listing.id
                      ? providerMode
                        ? "Saving..."
                        : "Accepting..."
                      : providerMode
                        ? "Save"
                        : "Accept"}
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

function EventListingCalendarPanel({
  values,
  showRequiredState,
  onChange,
}: {
  values: ListingEditForm;
  showRequiredState: boolean;
  onChange: (patch: Partial<ListingEditForm>) => void;
}) {
  const today = useMemo(
    () => parseCalendarDateKey(getCalendarDateKey(new Date())),
    [],
  );
  const eventDate = values.eventDate.trim();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(eventDate ? parseCalendarDateKey(eventDate) : today),
  );
  const days = getEventCalendarMonthCells(visibleMonth, eventDate, today);
  const monthLabel = formatCalendarMonthLabel(visibleMonth);

  useEffect(() => {
    if (!eventDate) return;
    setVisibleMonth(getMonthStart(parseCalendarDateKey(eventDate)));
  }, [eventDate]);

  const moveMonth = (direction: -1 | 1) => {
    setVisibleMonth((current) =>
      getMonthStart(addCalendarMonths(current, direction)),
    );
  };

  return (
    <div className="md:col-span-2 xl:col-span-5">
      <ListingFieldLabel required={showRequiredState && !eventDate}>
        Calendar & Event Date
      </ListingFieldLabel>
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b0b0b]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
          <label className="block">
            <ListingFieldLabel required={showRequiredState && !eventDate}>
              Event date
            </ListingFieldLabel>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => onChange({ eventDate: event.target.value })}
              className={cn(
                inputClassName,
                getListingRequiredFieldClass(eventDate, showRequiredState),
              )}
            />
          </label>
          <label className="block">
            <ListingFieldLabel>Start time</ListingFieldLabel>
            <input
              type="time"
              value={values.eventStartTime}
              onChange={(event) =>
                onChange({ eventStartTime: event.target.value })
              }
              className={inputClassName}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-white/60">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">
                {eventDate
                  ? formatCalendarDateLabel(eventDate)
                  : "Select event date"}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-white/45">
                Click a date or use the field above.
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-white/10 dark:bg-white/[0.04] sm:min-w-56">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
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
                onClick={() => onChange({ eventDate: day.key })}
                className={cn(
                  "min-h-14 rounded-lg border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                  getEventCalendarDayClass(day.isSelected, day.isPast),
                )}
              >
                <div className="text-sm font-bold">{day.day}</div>
                <div className="mt-2 truncate text-[10px] font-semibold">
                  {day.isSelected ? "Event" : day.isPast ? "Past" : ""}
                </div>
              </button>
            ) : (
              <div key={`blank-${index}`} className="min-h-14 rounded-lg" />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityListingCalendarPanel({
  values,
  showRequiredState,
  onChange,
}: {
  values: ListingEditForm;
  showRequiredState: boolean;
  onChange: (patch: Partial<ListingEditForm>) => void;
}) {
  const today = useMemo(
    () => parseCalendarDateKey(getCalendarDateKey(new Date())),
    [],
  );
  const activityDate = values.activityDate.trim();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(activityDate ? parseCalendarDateKey(activityDate) : today),
  );
  const days = getEventCalendarMonthCells(visibleMonth, activityDate, today);
  const monthLabel = formatCalendarMonthLabel(visibleMonth);
  const pricingLabel =
    ACTIVITY_PRICING_OPTIONS.find(
      (option) => option.value === values.pricingModel,
    )?.label || "N/A";

  useEffect(() => {
    if (!activityDate) return;
    setVisibleMonth(getMonthStart(parseCalendarDateKey(activityDate)));
  }, [activityDate]);

  const moveMonth = (direction: -1 | 1) => {
    setVisibleMonth((current) =>
      getMonthStart(addCalendarMonths(current, direction)),
    );
  };

  return (
    <div className="md:col-span-2 xl:col-span-5">
      <ListingFieldLabel
        required={
          showRequiredState && (!activityDate || !values.activityTimeSlot)
        }
      >
        Calendar & Availability
      </ListingFieldLabel>
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b0b0b]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
          <label className="block">
            <ListingFieldLabel required={showRequiredState && !activityDate}>
              Activity date
            </ListingFieldLabel>
            <input
              type="date"
              value={activityDate}
              onChange={(event) =>
                onChange({ activityDate: event.target.value })
              }
              className={cn(
                inputClassName,
                getListingRequiredFieldClass(activityDate, showRequiredState),
              )}
            />
          </label>
          <label className="block">
            <ListingFieldLabel
              required={showRequiredState && !values.activityTimeSlot}
            >
              Time slot
            </ListingFieldLabel>
            <select
              value={values.activityTimeSlot}
              onChange={(event) =>
                onChange({ activityTimeSlot: event.target.value })
              }
              className={cn(
                inputClassName,
                getListingRequiredFieldClass(
                  values.activityTimeSlot,
                  showRequiredState,
                ),
              )}
            >
              <option value="">Select</option>
              {ACTIVITY_TIME_SLOT_OPTIONS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <StayCalendarMetric
            label="Activity"
            value={values.listingType || "N/A"}
          />
          <StayCalendarMetric
            label="Time slot"
            value={values.activityTimeSlot || "N/A"}
          />
          <StayCalendarMetric
            label="Max participants"
            value={values.maxParticipants || "N/A"}
          />
          <StayCalendarMetric label="Pricing" value={pricingLabel} />
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-white/60">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">
                {activityDate
                  ? formatCalendarDateLabel(activityDate)
                  : "Select activity date"}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-white/45">
                Select the date tourists will book for this activity.
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-white/10 dark:bg-white/[0.04] sm:min-w-56">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
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
                onClick={() => onChange({ activityDate: day.key })}
                className={cn(
                  "min-h-14 rounded-lg border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                  getEventCalendarDayClass(day.isSelected, day.isPast),
                )}
              >
                <div className="text-sm font-bold">{day.day}</div>
                <div className="mt-2 truncate text-[10px] font-semibold">
                  {day.isSelected ? "Activity" : day.isPast ? "Past" : ""}
                </div>
              </button>
            ) : (
              <div key={`blank-${index}`} className="min-h-14 rounded-lg" />
            ),
          )}
        </div>
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
  const configuredRoomType = values.listingType.trim();
  const hasCalendarSetup = Boolean(configuredRoomType) && totalUnits > 0;
  const days = getStayCalendarMonthCells(
    listing,
    totalUnits,
    visibleMonth,
    hasCalendarSetup,
    today,
  );
  const selectedDay = getStayDateOccupancy(
    listing,
    totalUnits,
    selectedDate,
    hasCalendarSetup,
  );
  const roomType = configuredRoomType || "N/A";
  const visibleBookings = selectedDay.bookings.slice(0, 4);
  const monthLabel = formatCalendarMonthLabel(visibleMonth);

  const moveMonth = (direction: -1 | 1) => {
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
            aria-label="Previous month"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
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
          value={hasCalendarSetup ? String(totalUnits) : "N/A"}
        />
        <StayCalendarMetric
          label="Booked"
          value={hasCalendarSetup ? String(selectedDay.bookedRooms) : "N/A"}
        />
        <StayCalendarMetric
          label="Available"
          value={hasCalendarSetup ? String(selectedDay.availableRooms) : "N/A"}
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
                getStayCalendarDayClass(day.status, day.isPast),
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
              {hasCalendarSetup
                ? `${selectedDay.bookedRooms} of ${totalUnits} ${roomType} rooms booked`
                : "Select a room type and total rooms to calculate availability."}
            </div>
          </div>
          <StatusPill value={selectedDay.status} />
        </div>

        {!hasCalendarSetup ? (
          <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-500 dark:bg-[#0b0b0b] dark:text-white/45">
            Select a room type and total rooms to view availability.
          </div>
        ) : visibleBookings.length > 0 ? (
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
  serviceProviderId,
  selectedListingId,
  selectedListing,
  gallery,
  loading,
  uploading,
  reviewingMediaId,
  canReview = true,
  onSelectListing,
  onUpload,
  onReview,
}: {
  active: boolean;
  listings: AdminListingRecord[];
  serviceProviderId: string;
  selectedListingId: string;
  selectedListing: AdminListingRecord | null;
  gallery: ProviderMediaRecord[];
  loading: boolean;
  uploading: boolean;
  reviewingMediaId: string;
  canReview?: boolean;
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
            ) : (
              <option value="">Select listing</option>
            )}
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {getListingDisplayId(serviceProviderId, listing, listings)}
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
                  {getListingDisplayId(
                    serviceProviderId,
                    selectedListing,
                    listings,
                  )}
                </div>
                <StatusPill value={selectedListing.status} />
                <StatusPill value={selectedListing.visibility} />
              </div>
              <label className="mt-3 block max-w-sm">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                  Listing location
                </span>
                <input
                  type="text"
                  value={selectedListing.location || "Not set"}
                  readOnly
                  className={inputClassName}
                />
              </label>
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
              canReview={canReview}
              onReview={onReview}
            />
            <GalleryReviewGroup
              title="Approved"
              body="These images are public and can be displayed on the listing gallery."
              empty="No approved images yet."
              images={approvedImages}
              status="approved"
              reviewingMediaId={reviewingMediaId}
              canReview={canReview}
              onReview={onReview}
            />
            <GalleryReviewGroup
              title="Rejected"
              body="These images are blocked from the listing gallery until replaced or reviewed again."
              empty="No rejected images."
              images={rejectedImages}
              status="rejected"
              reviewingMediaId={reviewingMediaId}
              canReview={canReview}
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
  canReview = true,
  onReview,
}: {
  title: string;
  body: string;
  empty: string;
  images: ProviderMediaRecord[];
  status: "pending_review" | "approved" | "rejected";
  reviewingMediaId: string;
  canReview?: boolean;
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
              canReview={canReview}
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
  canReview = true,
  onReview,
}: {
  image: ProviderMediaRecord;
  index: number;
  reviewingMediaId: string;
  canReview?: boolean;
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

        {canReview ? (
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
        ) : null}
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
  canApprovePending = false,
  onTogglePremium,
}: {
  provider: ProviderCompanyRecord;
  saving: boolean;
  canApprovePending?: boolean;
  onTogglePremium: (enabled: boolean) => void;
}) {
  const isPremium =
    provider.providerTier === "premium" &&
    ["active", "trialing"].includes(provider.tierStatus);
  const tierChangePending = provider.premiumUpgradeStatus === "pending";
  const requestedTier = provider.tierChangeRequestedTier;
  const upgradePending = tierChangePending && requestedTier === "premium";
  const downgradePending = tierChangePending && requestedTier === "basic";
  const canSelectPremium = tierChangePending
    ? canApprovePending || isPremium
    : !isPremium;
  const canSelectBasic = tierChangePending
    ? canApprovePending || !isPremium
    : isPremium;

  return (
    <div className="mt-6">
      <span className="mb-3 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
        Subscription tier
      </span>
      <div className="grid grid-cols-2 gap-3">
        {/* Basic card */}
        <div
          role="button"
          tabIndex={saving || !canSelectBasic ? -1 : 0}
          aria-pressed={!isPremium}
          onClick={() => !saving && canSelectBasic && onTogglePremium(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!saving && canSelectBasic) {
                onTogglePremium(false);
              }
            }
          }}
          className={cn(
            "overflow-hidden rounded-xl border transition-all duration-200",
            downgradePending
              ? "border-amber-300/70 shadow-sm dark:border-amber-400/30"
              : !isPremium
                ? "border-blue-300/60 shadow-md dark:border-blue-400/25"
                : "cursor-pointer border-slate-200 opacity-50 hover:opacity-75 dark:border-white/10",
            saving && "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 transition-colors duration-200",
              downgradePending
                ? "bg-amber-500/[0.06] dark:bg-amber-400/[0.08]"
                : !isPremium
                  ? "bg-blue-500/[0.05] dark:bg-blue-400/[0.06]"
                  : "bg-slate-50 dark:bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                  downgradePending
                    ? "border-amber-400 bg-amber-400"
                    : !isPremium
                      ? "border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400"
                      : "border-slate-300 dark:border-white/20",
                )}
              >
                {(!isPremium || downgradePending) && (
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
            {(!isPremium || downgradePending) && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  downgradePending
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                    : "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
                )}
              >
                {downgradePending ? "Requested" : "Current"}
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
          tabIndex={saving || !canSelectPremium ? -1 : 0}
          aria-pressed={isPremium || upgradePending}
          onClick={() => !saving && canSelectPremium && onTogglePremium(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!saving && canSelectPremium) {
                onTogglePremium(true);
              }
            }
          }}
          className={cn(
            "overflow-hidden rounded-xl border transition-all duration-200",
            isPremium
              ? "border-yellow-400/50 shadow-md dark:border-yellow-500/25"
              : upgradePending
                ? "border-amber-300/70 shadow-sm dark:border-amber-400/30"
                : "cursor-pointer border-slate-200 opacity-50 hover:opacity-75 dark:border-white/10",
            canSelectPremium &&
              upgradePending &&
              "cursor-pointer hover:opacity-90",
            saving && "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 transition-colors duration-200",
              isPremium
                ? "bg-[#d4af37]/[0.06] dark:bg-[#d4af37]/[0.07]"
                : upgradePending
                  ? "bg-amber-500/[0.06] dark:bg-amber-400/[0.08]"
                  : "bg-slate-50 dark:bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                  isPremium
                    ? "border-[#b8960c] bg-[#d4af37]"
                    : upgradePending
                      ? "border-amber-400 bg-amber-400"
                      : "border-slate-300 dark:border-white/20",
                )}
              >
                {(isPremium || upgradePending) && (
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
            {isPremium ? (
              <span className="rounded-full bg-[#d4af37]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9a7a0a] dark:bg-[#d4af37]/10 dark:text-[#d4af37]">
                Current
              </span>
            ) : upgradePending ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                Requested
              </span>
            ) : null}
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
  const borderOverride = hasError
    ? "border-rose-400 focus:border-rose-400 dark:border-rose-500 dark:focus:border-rose-500"
    : initialValue !== undefined
      ? value.trim() !== "" && value !== initialValue
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
  const borderOverride = hasError
    ? "border-rose-400 focus:border-rose-400 dark:border-rose-500 dark:focus:border-rose-500"
    : initialValue !== undefined
      ? value.trim() !== "" && value !== initialValue
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

function StatusPill({
  value,
  size = "compact",
}: {
  value: string;
  size?: "compact" | "field";
}) {
  const normalizedValue = value.trim().toLowerCase();
  const normalized =
    normalizedValue === "n/a" || normalizedValue === "not applicable"
      ? "N/A"
      : value.replace(/_/g, " ");
  let className = "";
  if (normalizedValue === "pending") {
    className =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300";
  } else if (
    normalizedValue === "approved" ||
    normalizedValue === "active" ||
    normalizedValue === "online" ||
    normalizedValue === "available"
  ) {
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";
  } else if (normalizedValue === "limited") {
    className =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300";
  } else if (
    normalizedValue === "archived" ||
    normalizedValue === "blocked" ||
    normalizedValue === "n/a" ||
    normalizedValue === "not applicable"
  ) {
    className =
      "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/60";
  } else if (normalizedValue === "rejected" || normalizedValue === "booked") {
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
        size === "field" ? "h-11 w-full text-sm" : "h-7 w-28",
        className,
      )}
      style={size === "compact" ? { minWidth: 72, maxWidth: 112 } : undefined}
    >
      {normalized}
    </span>
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
  onConfirm,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  confirming = false,
}: {
  tone: "error" | "success" | "warning";
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
}) {
  const isError = tone === "error";
  const isWarning = tone === "warning";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white p-5 text-center shadow-2xl dark:border-white/10 dark:bg-[#101010]">
        <div
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            isError
              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
              : isWarning
                ? "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
          )}
        >
          {isError ? (
            <XCircle className="h-7 w-7" />
          ) : isWarning ? (
            <Trash2 className="h-7 w-7" />
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
        {onConfirm ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className={cn(
                actionButtonVariants({ variant: "secondary", size: "lg" }),
                "justify-center",
              )}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className={cn(
                actionButtonVariants({
                  variant: isWarning ? "danger" : "primary",
                  size: "lg",
                }),
                "justify-center",
              )}
            >
              {confirmLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              actionButtonVariants({ variant: "primary", size: "lg" }),
              "mt-5 w-full justify-center",
            )}
          >
            {confirmLabel}
          </button>
        )}
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
  const selectedServices: ServiceProviderCategoryId[] =
    provider.serviceCategories.length > 0
      ? [provider.serviceCategories[0]]
      : [];

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
    operatingHours: formatOperatingHours(
      form.operatingSchedule,
      form.operatingTimeEnabled,
    ),
    socialMediaLinks: {},
    servicesOffered: serviceLabels,
    serviceAreas: form.serviceAreas,
    zimraBpNumber: form.zimraBpNumber || null,
    tinNumber: form.tinNumber || null,
    taxClearanceExpiresAt: form.taxClearanceExpiresAt || null,
    documents: form.documents,
  };
}

function formToProviderPayload(form: ProviderFormState) {
  const serviceLabels = form.selectedServices.map(
    (service) => serviceProviderCategoryLabels[service],
  );

  return {
    companyName: form.tradingName || form.companyName,
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
    operatingHours: formatOperatingHours(
      form.operatingSchedule,
      form.operatingTimeEnabled,
    ),
    socialMediaLinks: {},
    servicesOffered: serviceLabels,
    serviceAreas: form.serviceAreas,
    zimraBpNumber: form.zimraBpNumber || null,
    tinNumber: form.tinNumber || null,
    taxClearanceExpiresAt: form.taxClearanceExpiresAt || null,
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
    return parsedSchedule;
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
      enabled?: boolean;
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

    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : Object.values(schedule).some((day) => day.enabled),
      schedule,
    };
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
  enabled = true,
) {
  return JSON.stringify({ enabled, schedule });
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

function reviewSectionForDocumentType(type: string): RequirementSection {
  if (type === "contact_person_id") return "Contact Person";
  if (type === "certificate_of_incorporation") {
    return "Company Verification";
  }
  return "ZIMRA and Tax Clearance";
}

function requirementSectionTargetId(section: RequirementSection) {
  if (section === "Operating Time") return "operating-time";
  if (section === "Contact Person") return "contact-person";
  if (section === "Listings") return "listings";
  if (section === "Gallery") return "gallery";
  if (section === "Company Verification") return "company-verification";
  if (section === "ZIMRA and Tax Clearance") return "zimra-tax";
  return "profile";
}

function requirementSectionDetailSection(
  section: RequirementSection,
): ProviderDetailSection {
  if (section === "Operating Time") return "operating-time";
  if (section === "Contact Person") return "contact-person";
  if (section === "Listings") return "listings";
  if (section === "Gallery") return "gallery";
  if (
    section === "Company Verification" ||
    section === "ZIMRA and Tax Clearance"
  ) {
    return "verification";
  }
  return "profile";
}

function getReadinessAttentionSections({
  requirements,
  pendingReviewSections,
  premiumUpgradeStatus,
  hasGalleryAccess,
  operatingTimeEnabled,
}: {
  requirements: MissingRequirement[];
  pendingReviewSections: string[];
  premiumUpgradeStatus?: string | null;
  hasGalleryAccess: boolean;
  operatingTimeEnabled: boolean;
}) {
  const attentionSections = REQUIREMENT_SECTION_ORDER.filter((section) => {
    const unavailable =
      (section === "Gallery" && !hasGalleryAccess) ||
      (section === "Operating Time" && !operatingTimeEnabled) ||
      (section === "Premium Upgrade" &&
        !["pending", "approved"].includes(premiumUpgradeStatus ?? "none"));
    if (unavailable) return false;

    const hasIncompleteRequirement = requirements.some(
      (requirement) =>
        requirement.section === section &&
        (requirement.state ?? "incomplete") === "incomplete",
    );
    const pending =
      requirements.some(
        (requirement) =>
          requirement.section === section &&
          requirement.state === "pending_review",
      ) ||
      pendingReviewSections.includes(section) ||
      (section === "Premium Upgrade" && premiumUpgradeStatus === "pending");

    return hasIncompleteRequirement || pending;
  }).map(requirementSectionDetailSection);

  return Array.from(new Set(attentionSections));
}

function getMissingRequirements({
  provider,
  form,
  documentsByType,
  listings,
  gallery,
  hasGalleryAccess,
}: {
  provider: ProviderCompanyRecord;
  form: ProviderFormState;
  documentsByType: Record<string, ProviderDocumentRecord>;
  listings: AdminListingRecord[];
  gallery: ProviderMediaRecord[];
  hasGalleryAccess: boolean;
}) {
  const requirements: MissingRequirement[] = [];
  const add = (
    section: RequirementSection,
    key: string,
    label: string,
    detail: string,
    options: Pick<MissingRequirement, "state" | "blocksActivation"> = {},
  ) => requirements.push({ section, key, label, detail, ...options });

  if (!provider.profileImageUrl) {
    add(
      "Profile",
      "profileImageUrl",
      "Profile picture",
      "Upload a profile picture.",
    );
  }
  if (!form.tradingName.trim()) {
    add(
      "Profile",
      "tradingName",
      "Display name",
      "Add the public display name.",
    );
  }
  if (!form.businessPhone.trim()) {
    add(
      "Profile",
      "businessPhone",
      "Business phone",
      "Add a business phone number.",
    );
  }
  if (!form.businessEmail.trim()) {
    add(
      "Profile",
      "businessEmail",
      "Business email",
      "Add a business email address.",
    );
  }
  if (!form.businessDescription.trim()) {
    add(
      "Profile",
      "businessDescription",
      "About us",
      "Add the service provider profile description.",
    );
  }
  if (form.serviceAreas.length === 0) {
    add(
      "Profile",
      "serviceAreas",
      "Operating locations",
      "Select at least one operating location.",
    );
  }
  if (form.selectedServices.length === 0) {
    add(
      "Profile",
      "selectedServices",
      "Service",
      "Select the service category.",
    );
  }

  const enabledDays = DAY_OPTIONS.filter(
    (day) => form.operatingSchedule[day.id]?.enabled,
  );
  const incompleteDay = enabledDays.find((day) => {
    const schedule = form.operatingSchedule[day.id];
    return !schedule?.opensAt || !schedule?.closesAt;
  });
  if (form.operatingTimeEnabled && enabledDays.length === 0) {
    add(
      "Operating Time",
      "operatingHours",
      "Operating days",
      "Select at least one operating day.",
    );
  } else if (form.operatingTimeEnabled && incompleteDay) {
    add(
      "Operating Time",
      "operatingHours",
      `${incompleteDay.fullLabel} hours`,
      "Add opening and closing times.",
    );
  }

  if (!form.mainContactPerson.trim()) {
    add(
      "Contact Person",
      "mainContactPerson",
      "Contact person",
      "Add the main contact person.",
    );
  }
  if (!form.contactPersonPhone.trim()) {
    add(
      "Contact Person",
      "contactPersonPhone",
      "Contact number",
      "Add the contact person's phone number.",
    );
  }
  if (!form.businessEmail.trim()) {
    add(
      "Contact Person",
      "businessEmail",
      "Contact email",
      "Add the contact person's email address.",
    );
  }
  if (!form.physicalAddress.trim()) {
    add(
      "Contact Person",
      "physicalAddress",
      "Physical address",
      "Add the physical address.",
    );
  }
  if (!form.contactPersonIdType.trim()) {
    add(
      "Contact Person",
      "contactPersonIdType",
      "ID type",
      "Select ID or passport.",
    );
  }
  if (!form.contactPersonIdNumber.trim()) {
    add(
      "Contact Person",
      "contactPersonIdNumber",
      "ID / passport number",
      "Add the ID or passport number.",
    );
  }
  addDocumentRequirement(
    requirements,
    documentsByType.contact_person_id,
    "Contact Person",
    "contact_person_id",
    "ID document",
  );

  const selectedService = form.selectedServices[0];
  const relevantListings = selectedService
    ? listings.filter((listing) =>
        listingMatchesService(listing, selectedService),
      )
    : listings;
  const publishableListings = relevantListings.filter((listing) =>
    ["active", "approved"].includes(
      getListingStatusDisplayValue(listing.status),
    ),
  );
  if (relevantListings.length === 0) {
    add("Listings", "listings", "Listing", "Create at least one listing.");
  }
  relevantListings.forEach((listing) => {
    const listingForm = toListingEditForm(
      listing,
      getProviderDisplayName(provider, form),
      form.serviceAreas,
    );
    const listingErrors = getListingValidationErrors(
      listingForm,
      selectedService || "things_to_do",
      form.serviceAreas,
    );
    const displayId = getListingDisplayId(
      getServiceProviderDisplayId(provider),
      listing,
      listings,
    );
    const displayStatus = getListingStatusDisplayValue(listing.status);
    if (
      listingErrors.size > 0 ||
      ["draft", "rejected", "archived"].includes(displayStatus)
    ) {
      add(
        "Listings",
        `listing:${listing.id}`,
        `${displayId} incomplete`,
        "Complete and approve this listing before publishing.",
      );
    } else if (!["active", "approved"].includes(displayStatus)) {
      add(
        "Listings",
        `listing:${listing.id}`,
        `${displayId} pending review`,
        "This listing is complete and awaiting Off2Zim approval.",
        { state: "pending_review" },
      );
    }
  });

  if (hasGalleryAccess) {
    if (publishableListings.length === 0) {
      add(
        "Gallery",
        "gallery",
        "Gallery",
        "Approve a listing before adding gallery images.",
      );
    } else {
      publishableListings.forEach((listing) => {
        const hasApprovedImage = gallery.some(
          (image) =>
            image.listingId === listing.id && image.status === "approved",
        );
        if (!hasApprovedImage) {
          const hasPendingImage = gallery.some(
            (image) =>
              image.listingId === listing.id &&
              image.status === "pending_review",
          );
          add(
            "Gallery",
            `gallery:${listing.id}`,
            `${listing.title} gallery`,
            hasPendingImage
              ? "Gallery images are awaiting Off2Zim approval."
              : "Upload at least one gallery image for this listing.",
            hasPendingImage ? { state: "pending_review" } : undefined,
          );
        }
      });
    }
  }

  if (!form.legalCompanyName.trim()) {
    add(
      "Company Verification",
      "legalCompanyName",
      "Registered company name",
      "Add the name from the certificate of incorporation.",
    );
  }
  if (!form.incorporationDate.trim()) {
    add(
      "Company Verification",
      "incorporationDate",
      "Date incorporated",
      "Add the date of incorporation.",
    );
  }
  if (!form.businessRegistrationNumber.trim()) {
    add(
      "Company Verification",
      "businessRegistrationNumber",
      "Company registration number",
      "Add the company registration number.",
    );
  }
  addDocumentRequirement(
    requirements,
    documentsByType.certificate_of_incorporation,
    "Company Verification",
    "certificate_of_incorporation",
    "Certificate of incorporation",
  );

  if (!form.zimraBpNumber.trim()) {
    add(
      "ZIMRA and Tax Clearance",
      "zimraBpNumber",
      "ZIMRA BP number",
      "Add the ZIMRA BP number.",
    );
  }
  if (!form.tinNumber.trim()) {
    add(
      "ZIMRA and Tax Clearance",
      "tinNumber",
      "TIN number",
      "Add the TIN number.",
    );
  }
  if (!form.taxClearanceExpiresAt.trim()) {
    add(
      "ZIMRA and Tax Clearance",
      "taxClearanceExpiresAt",
      "Tax clearance expiry",
      "Add the tax clearance expiry date.",
    );
  } else if (isPastDate(form.taxClearanceExpiresAt)) {
    add(
      "ZIMRA and Tax Clearance",
      "taxClearanceExpiresAt",
      "Tax clearance expired",
      "Upload a current tax clearance and update the expiry date.",
    );
  }
  addDocumentRequirement(
    requirements,
    documentsByType.tax_clearance,
    "ZIMRA and Tax Clearance",
    "tax_clearance",
    "Tax clearance document",
  );

  if (provider.premiumUpgradeStatus === "pending") {
    add(
      "Premium Upgrade",
      "premiumUpgrade",
      "Subscription tier change",
      `Requested ${
        provider.tierChangeRequestedTier || "subscription"
      } tier change is awaiting Off2Zim approval.`,
      { state: "pending_review", blocksActivation: false },
    );
  }

  return dedupeRequirements(requirements);
}

function addDocumentRequirement(
  requirements: MissingRequirement[],
  document: ProviderDocumentRecord | undefined,
  section: RequirementSection,
  key: string,
  label: string,
) {
  const status = documentStatus(document);
  if (status === "approved") return;
  requirements.push({
    section,
    key,
    label,
    state: status === "pending" ? "pending_review" : "incomplete",
    detail:
      status === "missing"
        ? "Upload the required document."
        : status === "pending"
          ? "Document is uploaded but still awaiting admin approval."
          : "Document was rejected and needs to be replaced or reviewed.",
  });
}

function dedupeRequirements(requirements: MissingRequirement[]) {
  const seen = new Set<string>();
  return requirements.filter((requirement) => {
    if (seen.has(requirement.key)) return false;
    seen.add(requirement.key);
    return true;
  });
}

function isPastDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function isProviderActivated(provider: ProviderCompanyRecord) {
  return (
    provider.onboardingStatus === "basic_approved" &&
    ["active", "trialing"].includes(provider.tierStatus)
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

function isDocumentAwaitingReview(document?: ProviderDocumentRecord) {
  return Boolean(
    document &&
      ["uploaded", "pending", "pending_review"].includes(document.status),
  );
}

function getProviderSaveErrors({
  section,
  provider,
  form,
  documentsByType,
}: {
  section: RequirementSection;
  provider: ProviderCompanyRecord;
  form: ProviderFormState;
  documentsByType: Record<string, ProviderDocumentRecord>;
}) {
  const errors = new Set<string>();
  const requireField = (key: keyof ProviderFormState, value: string) => {
    if (!value.trim()) errors.add(key);
  };

  if (section === "Profile") {
    if (!provider.profileImageUrl) errors.add("profileImageUrl");
    requireField("tradingName", form.tradingName);
    requireField("businessPhone", form.businessPhone);
    requireField("businessEmail", form.businessEmail);
    requireField("businessDescription", form.businessDescription);
    if (form.serviceAreas.length === 0) errors.add("serviceAreas");
    if (form.selectedServices.length === 0) errors.add("selectedServices");
  }

  if (section === "Operating Time" && form.operatingTimeEnabled) {
    const enabledDays = DAY_OPTIONS.filter(
      (day) => form.operatingSchedule[day.id]?.enabled,
    );
    const missingHours = enabledDays.some((day) => {
      const schedule = form.operatingSchedule[day.id];
      return !schedule?.opensAt || !schedule?.closesAt;
    });
    if (enabledDays.length === 0 || missingHours) {
      errors.add("operatingHours");
    }
  }

  if (section === "Contact Person") {
    requireField("mainContactPerson", form.mainContactPerson);
    requireField("contactPersonPhone", form.contactPersonPhone);
    requireField("businessEmail", form.businessEmail);
    requireField("physicalAddress", form.physicalAddress);
    requireField("contactPersonIdType", form.contactPersonIdType);
    requireField("contactPersonIdNumber", form.contactPersonIdNumber);
    if (!documentsByType.contact_person_id) errors.add("contact_person_id");
  }

  if (section === "Company Verification") {
    requireField("legalCompanyName", form.legalCompanyName);
    requireField("incorporationDate", form.incorporationDate);
    requireField("businessRegistrationNumber", form.businessRegistrationNumber);
    if (!documentsByType.certificate_of_incorporation) {
      errors.add("certificate_of_incorporation");
    }
  }

  if (section === "ZIMRA and Tax Clearance") {
    requireField("zimraBpNumber", form.zimraBpNumber);
    requireField("tinNumber", form.tinNumber);
    requireField("taxClearanceExpiresAt", form.taxClearanceExpiresAt);
    if (!documentsByType.tax_clearance) errors.add("tax_clearance");
  }

  return errors;
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
  const normalizedDefaultType = normalizeListingText(
    LISTING_SERVICE_CONFIG[service].defaultListingType,
  );

  return (
    normalizedCategory === normalizedService ||
    normalizedType === normalizedService ||
    (service === "things_to_do" && normalizedType === "activity") ||
    (normalizedDefaultType.length > 0 &&
      normalizedType === normalizedDefaultType)
  );
}

function getListingServiceSummary(service: ServiceProviderCategoryId) {
  switch (service) {
    case "stays":
      return "Rooms, suites, lodges, campsites, prices per night, inclusions, and house rules.";
    case "events":
      return "Event type, ticket type, ticket totals, event date, included items, and attendance rules.";
    case "bus":
      return "Routes, fares, seat capacity, luggage allowance, and passenger rules.";
    case "flight":
      return "Flight routes, fares, seat capacity, baggage rules, and service notes.";
    case "things_to_do":
    default:
      return "Activities, dates, time slots, participant limits, group pricing, inclusions, and safety rules.";
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
        "Ticket type",
        "Total tickets",
        "Ticket price",
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
        "Activity",
        "Date",
        "Time slot",
        "Max participants",
        "Included",
        "Not allowed",
      ];
  }
}

function isServiceProviderCategoryId(
  value: string,
): value is ServiceProviderCategoryId {
  return value in LISTING_SERVICE_CONFIG;
}

function toListingEditForm(
  listing: AdminListingRecord,
  displayName = listing.title,
  operatingLocations: string[] = [],
): ListingEditForm {
  const stayDetails = getStayDetailsRecord(listing.metadata);
  const eventDetails = getEventDetailsRecord(listing.metadata);
  const activityDetails = getActivityDetailsRecord(listing.metadata);
  const serviceCategory =
    typeof listing.metadata?.serviceCategory === "string"
      ? listing.metadata.serviceCategory
      : "";
  const serviceId = isServiceProviderCategoryId(serviceCategory)
    ? serviceCategory
    : null;
  const listingType =
    (serviceCategory === "stays" && listing.listingType === "Room") ||
    (serviceCategory === "events" && listing.listingType === "Event") ||
    (serviceCategory === "things_to_do" && listing.listingType === "Activity")
      ? ""
      : listing.listingType || "";
  const shortDescription =
    listing.shortDescription === ADMIN_DRAFT_LISTING_SHORT_DESCRIPTION
      ? ""
      : listing.shortDescription || "";
  const totalUnits = getMetadataString(stayDetails, "totalUnits");
  const ticketType = getMetadataString(eventDetails, "ticketType");
  const totalTickets =
    getMetadataString(eventDetails, "totalTickets") ||
    (serviceCategory === "events" && listing.capacity
      ? listing.capacity.toString()
      : "");
  const eventDate = getMetadataString(eventDetails, "eventDate");
  const eventStartTime = getMetadataString(eventDetails, "eventStartTime");
  const activityDate = getMetadataString(activityDetails, "activityDate");
  const activityTimeSlot =
    getMetadataString(activityDetails, "activityTimeSlot") ||
    getMetadataString(activityDetails, "timeSlot");
  const maxParticipants =
    getMetadataString(activityDetails, "maxParticipants") ||
    (serviceCategory === "things_to_do" && listing.capacity
      ? listing.capacity.toString()
      : "");
  const isAdminDraft =
    listing.status === "draft" &&
    listing.metadata?.source === "admin_service_provider_detail";
  const hasEventDetails =
    Boolean(ticketType) ||
    Boolean(totalTickets) ||
    Boolean(eventDate) ||
    Boolean(eventStartTime);
  const hasActivityDetails =
    Boolean(activityDate) ||
    Boolean(activityTimeSlot) ||
    Boolean(maxParticipants);
  const hasServiceDetails = hasEventDetails || hasActivityDetails;
  const shouldRequireLocationSelection =
    isAdminDraft &&
    operatingLocations[0] === listing.location &&
    !hasServiceDetails &&
    !shortDescription &&
    !listing.basePrice &&
    !listing.capacity &&
    !totalUnits;
  const shouldRequirePricingModelSelection =
    isAdminDraft &&
    serviceId !== null &&
    LEGACY_DEFAULT_LISTING_PRICING_MODELS[serviceId].includes(
      listing.pricingModel,
    ) &&
    !shortDescription &&
    !listing.basePrice &&
    !listing.capacity &&
    !totalUnits &&
    !hasServiceDetails;

  return {
    title: displayName,
    shortDescription,
    status: listing.status,
    visibility: listing.visibility,
    location: shouldRequireLocationSelection ? "" : listing.location,
    bookingMode: listing.bookingMode || "request",
    instantBooking: listing.instantBooking,
    basePrice: listing.basePrice?.toString() || "",
    listingType,
    pricingModel: shouldRequirePricingModelSelection
      ? ""
      : listing.pricingModel || "",
    capacity: listing.capacity?.toString() || "",
    ticketType,
    totalTickets,
    eventDate,
    eventStartTime,
    activityDate,
    activityTimeSlot,
    maxParticipants,
    totalUnits,
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

function providerListingToAdminListing(
  listing: ProviderListingRecord,
  provider: ProviderCompanyRecord,
): AdminListingRecord {
  return {
    ...listing,
    bookingCalendar: [],
    availabilityCount: listing.availability.length,
    bookingsCount: listing.bookingsCount ?? 0,
    disputesCount: 0,
    provider: {
      id: provider.id,
      companyName: provider.companyName,
      verificationTier: provider.verificationTier,
      onboardingStatus: provider.onboardingStatus,
    },
  };
}

function listingFormToProviderPayload(
  form: ListingEditForm,
  service: ServiceProviderCategoryId,
  listing: AdminListingRecord,
) {
  const destination = curatedZimbabweDestinations.find(
    (item) => item.name === form.location,
  );
  const capacity =
    service === "events"
      ? parsePositiveInt(form.totalTickets)
      : service === "things_to_do"
        ? parsePositiveInt(form.maxParticipants)
        : parsePositiveInt(form.capacity);
  const metadata = {
    ...listing.metadata,
    serviceCategory: service,
    included: form.included,
    notAllowed: form.notAllowed,
    ...(service === "stays" ? { stayDetails: toStayDetailsPayload(form) } : {}),
    ...(service === "events"
      ? { eventDetails: toEventDetailsPayload(form) }
      : {}),
    ...(service === "things_to_do"
      ? { activityDetails: toActivityDetailsPayload(form) }
      : {}),
    ...(destination
      ? {
          destinationId: destination.id,
          destinationName: destination.name,
          destinationLocation: destination.location,
        }
      : {}),
  };

  return {
    title: form.title.trim() || listing.title,
    category: serviceProviderCategoryLabels[service],
    listingType: form.listingType.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.shortDescription.trim() || listing.description,
    location: destination?.name || form.location.trim(),
    pricingModel: form.pricingModel.trim(),
    basePrice: parseMoneyValue(form.basePrice),
    currency: "USD",
    bookingMode: form.bookingMode || "request",
    instantBooking: form.instantBooking,
    status: form.status === "approved" ? "active" : form.status,
    visibility: form.visibility || "private",
    capacity,
    amenities: form.included,
    policies: {
      ...listing.policies,
      notAllowed: form.notAllowed,
    },
    metadata,
    availability:
      service === "stays" && form.totalUnits
        ? [
            {
              startDate: new Date().toISOString(),
              endDate: new Date(
                new Date().setMonth(new Date().getMonth() + 12),
              ).toISOString(),
              unitsAvailable: parsePositiveInt(form.totalUnits),
              status: "available",
              notes: "Availability submitted from provider dashboard.",
            },
          ]
        : listing.availability.map((slot) => ({
            startDate: slot.startDate,
            endDate: slot.endDate,
            unitsAvailable: slot.unitsAvailable ?? null,
            status: slot.status,
            notes: slot.notes ?? null,
          })),
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
      return ACTIVITY_TYPE_OPTIONS;
  }
}

function getListingPricingOptions(service: ServiceProviderCategoryId) {
  if (service === "stays") return STAY_PRICING_OPTIONS;
  if (service === "events") {
    return [
      { value: "per_ticket", label: "Per ticket" },
      { value: "package", label: "Package" },
    ];
  }
  if (service === "things_to_do") return ACTIVITY_PRICING_OPTIONS;

  return [
    { value: "per_person", label: "Per person" },
    { value: "per_ticket", label: "Per ticket" },
    { value: "per_seat", label: "Per seat" },
    { value: "package", label: "Package" },
  ];
}

function getListingIncludedOptions(service: ServiceProviderCategoryId) {
  if (service === "stays") return STAY_INCLUDED_OPTIONS;
  if (service === "things_to_do") {
    return [
      "Guide",
      "Safety briefing",
      "Equipment",
      "Transport",
      "Entry fees",
      "Refreshments",
      "No inclusions listed",
    ];
  }

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
  if (service === "things_to_do") {
    return [
      "No smoking",
      "No alcohol",
      "No unattended children",
      "Age restrictions apply",
      "Health restrictions apply",
      "No restrictions listed",
    ];
  }

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
  const storedDisplayId =
    typeof listing.metadata?.listingDisplayId === "string"
      ? listing.metadata.listingDisplayId
      : typeof listing.metadata?.displayListingId === "string"
        ? listing.metadata.displayListingId
        : "";

  if (storedDisplayId) return storedDisplayId;

  const providerListings = listings.filter(
    (item) => item.companyId === listing.companyId,
  );
  const orderedListings = [...providerListings].sort((first, second) => {
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
  operatingLocations: string[] = [],
) {
  const errors = new Set<keyof ListingEditForm>();

  const hasValidLocation =
    form.location.trim().length > 0 &&
    (operatingLocations.length === 0 ||
      operatingLocations.includes(form.location));
  if (!hasValidLocation) errors.add("location");
  if (!form.listingType.trim()) errors.add("listingType");
  if (!form.pricingModel.trim()) errors.add("pricingModel");
  if (!form.basePrice.trim()) errors.add("basePrice");
  if (service === "things_to_do") {
    if (!form.maxParticipants.trim()) errors.add("maxParticipants");
  } else if (service !== "events" && !form.capacity.trim()) {
    errors.add("capacity");
  }
  if (!form.shortDescription.trim()) errors.add("shortDescription");
  if (form.included.length === 0) errors.add("included");
  if (form.notAllowed.length === 0) errors.add("notAllowed");

  if (service === "stays") {
    if (!form.totalUnits.trim()) errors.add("totalUnits");
  }

  if (service === "events") {
    if (!form.ticketType.trim()) errors.add("ticketType");
    if (!form.totalTickets.trim()) errors.add("totalTickets");
    if (!form.eventDate.trim()) errors.add("eventDate");
  }

  if (service === "things_to_do") {
    if (!form.activityDate.trim()) errors.add("activityDate");
    if (!form.activityTimeSlot.trim()) errors.add("activityTimeSlot");
  }

  return errors;
}

function toStayDetailsPayload(form: ListingEditForm) {
  return {
    totalUnits: parsePositiveInt(form.totalUnits),
  };
}

function toEventDetailsPayload(form: ListingEditForm) {
  return {
    ticketType: form.ticketType.trim(),
    totalTickets: parsePositiveInt(form.totalTickets),
    eventDate: form.eventDate.trim(),
    eventStartTime: form.eventStartTime.trim(),
  };
}

function toActivityDetailsPayload(form: ListingEditForm) {
  return {
    activityType: form.listingType.trim(),
    activityDate: form.activityDate.trim(),
    activityTimeSlot: form.activityTimeSlot.trim(),
    maxParticipants: parsePositiveInt(form.maxParticipants),
    pricingModel: form.pricingModel.trim(),
  };
}

function getStayDetailsRecord(metadata: Record<string, unknown>) {
  const value = metadata.stayDetails;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getEventDetailsRecord(metadata: Record<string, unknown>) {
  const value = metadata.eventDetails;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getActivityDetailsRecord(metadata: Record<string, unknown>) {
  const value = metadata.activityDetails;
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

function parseMoneyValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function getStayCalendarMonthCells(
  listing: AdminListingRecord,
  totalUnits: number,
  monthDate: Date,
  hasCalendarSetup = true,
  today = new Date(),
) {
  const monthStart = getMonthStart(monthDate);
  const todayStart = parseCalendarDateKey(getCalendarDateKey(today));
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
    isPast: boolean;
    day: string;
  }> = Array.from({ length: leadingBlanks }, () => null);

  for (let index = 0; index < daysInMonth; index += 1) {
    const date = new Date(monthStart);
    date.setDate(index + 1);
    const key = getCalendarDateKey(date);
    const occupancy = getStayDateOccupancy(
      listing,
      totalUnits,
      key,
      hasCalendarSetup,
    );

    cells.push({
      key,
      status: occupancy.status,
      label: occupancy.label,
      bookedRooms: occupancy.bookedRooms,
      availableRooms: occupancy.availableRooms,
      isPast: date < todayStart,
      day: String(date.getDate()),
    });
  }

  return cells;
}

function getEventCalendarMonthCells(
  monthDate: Date,
  selectedDate: string,
  today = new Date(),
) {
  const monthStart = getMonthStart(monthDate);
  const todayStart = parseCalendarDateKey(getCalendarDateKey(today));
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const leadingBlanks = monthStart.getDay();
  const cells: Array<null | {
    key: string;
    isSelected: boolean;
    isPast: boolean;
    day: string;
  }> = Array.from({ length: leadingBlanks }, () => null);

  for (let index = 0; index < daysInMonth; index += 1) {
    const date = new Date(monthStart);
    date.setDate(index + 1);
    const key = getCalendarDateKey(date);
    cells.push({
      key,
      isSelected: key === selectedDate,
      isPast: date < todayStart,
      day: String(date.getDate()),
    });
  }

  return cells;
}

function getStayDateOccupancy(
  listing: AdminListingRecord,
  totalUnits: number,
  dateKey: string,
  hasCalendarSetup = true,
) {
  const date = parseCalendarDateKey(dateKey);
  const roomCount = Math.max(totalUnits, 0);

  if (!hasCalendarSetup) {
    return {
      key: dateKey,
      status: "n/a",
      label: "N/A",
      bookings: [],
      bookedRooms: 0,
      availableRooms: 0,
      totalUnits: 0,
    };
  }

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
  const availabilityRatio = roomCount > 0 ? availableRooms / roomCount : 0;
  const status =
    rawAvailabilityStatus && rawAvailabilityStatus !== "available"
      ? "blocked"
      : roomCount > 0 && availableRooms <= 0
        ? "booked"
        : availabilityRatio >= 0.5
          ? "available"
          : "limited";
  const label =
    status === "booked"
      ? "Full"
      : status === "limited" ||
          (status === "available" && availableRooms < roomCount)
        ? roomCount
          ? `${availableRooms}/${roomCount}`
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

function getEventCalendarDayClass(isSelected: boolean, isPast: boolean) {
  if (isSelected) {
    return "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950";
  }

  return isPast
    ? "border-slate-100 bg-slate-50/55 text-slate-400 dark:border-white/5 dark:bg-white/[0.03] dark:text-white/30"
    : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70";
}

function getStayCalendarDayClass(status: string, isPast: boolean) {
  if (status === "booked") {
    return isPast
      ? "border-rose-100 bg-rose-50/45 text-rose-500 dark:border-rose-400/10 dark:bg-rose-400/[0.05] dark:text-rose-300/70"
      : "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-400/35 dark:bg-rose-400/15 dark:text-rose-200";
  }

  if (status === "limited") {
    return isPast
      ? "border-amber-100 bg-amber-50/45 text-amber-500 dark:border-amber-400/10 dark:bg-amber-400/[0.05] dark:text-amber-300/70"
      : "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-200";
  }

  if (status === "blocked" || status === "n/a") {
    return "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/45";
  }

  return isPast
    ? "border-emerald-100 bg-emerald-50/45 text-emerald-500 dark:border-emerald-400/10 dark:bg-emerald-400/[0.05] dark:text-emerald-300/70"
    : "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-200";
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
      const eventDetails = getEventDetailsRecord(listing.metadata);
      return [
        { label: "Event type", value: listing.listingType || "Not set" },
        {
          label: "Ticket type",
          value: getMetadataString(eventDetails, "ticketType") || "Not set",
        },
        { label: "Ticket price", value: formatBasePrice(listing, "Not set") },
        {
          label: "Total tickets",
          value:
            getMetadataString(eventDetails, "totalTickets") ||
            (listing.capacity ? listing.capacity.toLocaleString() : "Not set"),
        },
        {
          label: "Event date",
          value: formatEventDateValue(
            getMetadataString(eventDetails, "eventDate"),
            getMetadataString(eventDetails, "eventStartTime"),
          ),
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
      const activityDetails = getActivityDetailsRecord(listing.metadata);
      return [
        { label: "Activity", value: listing.listingType || "Not set" },
        {
          label: "Activity date",
          value: formatEventDateValue(
            getMetadataString(activityDetails, "activityDate"),
            "",
          ),
        },
        {
          label: "Time slot",
          value:
            getMetadataString(activityDetails, "activityTimeSlot") ||
            getMetadataString(activityDetails, "timeSlot") ||
            "Not set",
        },
        { label: "Price", value: formatBasePrice(listing, "Not set") },
        {
          label: "Max participants",
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

function formatEventDateValue(dateValue: string, timeValue: string) {
  if (!dateValue) return "Not set";
  const label = formatCalendarDateLabel(dateValue);
  return timeValue ? `${label}, ${timeValue}` : label;
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

function appendReviewNote(current: string, addition: string) {
  return [current.trim(), addition.trim()].filter(Boolean).join("\n\n");
}
