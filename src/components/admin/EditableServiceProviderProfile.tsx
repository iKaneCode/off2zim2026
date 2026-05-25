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
import { cn } from "@/lib/utils";
import type {
  AdminListingRecord,
  ProviderCompanyRecord,
  ProviderDocumentRecord,
} from "@/types/platform";
import {
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Contact,
  Hourglass,
  ImagePlus,
  ListPlus,
  MapPin,
  ReceiptText,
  Save,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

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
  "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#ff5630] focus:ring-4 focus:ring-[#ff5630]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white dark:placeholder:text-white/35 dark:disabled:bg-white/[0.04]";

const PREMIUM_PACKAGE_FEATURES = [
  "Listing galleries with admin-reviewed image uploads",
  "Push notification campaigns for discounts, sales, and specials",
  "Advanced booking, listing, and audience analytics",
  "Premium Android service-provider app access",
  "Priority review queue for profile and campaign updates",
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
  const [tierSaving, setTierSaving] = useState(false);
  const [reviewingMediaId, setReviewingMediaId] = useState("");
  const [selectedGalleryListingId, setSelectedGalleryListingId] = useState("");
  const [galleryPanelEnabled, setGalleryPanelEnabled] = useState(
    () => hasGalleryAccess,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const ratingSummary = getProviderRatingSummary(provider);
  const gallerySectionActive = hasGalleryAccess && galleryPanelEnabled;
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

  const updateField = (field: keyof ProviderFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
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
        payload.listings.filter(
          (listing) =>
            listing.companyId === provider.id && listing.status !== "archived",
        ),
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

  const saveProfile = async () => {
    if (!isDirty) return;

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
      await apiFetch<{ listing: AdminListingRecord }>(
        `/api/admin/providers/${provider.id}/listings`,
        {
          method: "POST",
          body: JSON.stringify({
            title: `${form.companyName || provider.companyName} ${config.singular}`,
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
      setMessage("Draft listing added.");
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
        <div className="relative h-64 bg-slate-200 dark:bg-white/[0.06]">
          {provider.coverImageUrl ? (
            <img
              src={provider.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500 dark:text-white/45">
              Cover image
            </div>
          )}
          <label
            className={cn(
              actionButtonVariants({ variant: "secondary", size: "sm" }),
              "absolute right-4 top-4 cursor-pointer bg-white/95 dark:bg-[#151515]/95",
            )}
          >
            <ImagePlus className="h-4 w-4" />
            {uploading === "cover" ? "Uploading..." : "Upload cover"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) =>
                handleFileChange(event, (file) => uploadMedia("cover", file))
              }
            />
          </label>
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm dark:border-[#101010] dark:bg-white/[0.08]">
                {provider.profileImageUrl ? (
                  <img
                    src={provider.profileImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-500 dark:text-white/55">
                    {provider.companyName.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-x-0 bottom-0 flex h-8 cursor-pointer items-center justify-center bg-black/55 text-white">
                  <Camera className="h-4 w-4" />
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
              </div>
              <div className="min-w-0 pb-1">
                <h2 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
                  {provider.companyName}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-white/45">
                  {form.serviceAreas[0] ||
                    provider.headquartersCity ||
                    provider.physicalAddress}
                </p>
              </div>
            </div>
            <div className="pb-1 sm:ml-auto">
              <RatingPill
                average={ratingSummary.average}
                reviewCount={ratingSummary.reviewCount}
              />
            </div>
          </div>
        </div>
      </section>

      <FormPanel title="Business profile">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Trading / public company name"
            value={form.companyName}
            onChange={(value) => updateField("companyName", value)}
          />
          <Field
            label="Display name"
            value={form.tradingName}
            onChange={(value) => updateField("tradingName", value)}
          />
          <TextArea
            label="About us"
            value={form.businessDescription}
            onChange={(value) => updateField("businessDescription", value)}
            className="md:col-span-2"
          />
        </div>

        <SelectorBlock title="Services">
          <select
            value={form.selectedServices[0] || ""}
            onChange={(event) =>
              selectService(
                event.target.value as ServiceProviderCategoryId | "",
              )
            }
            className={inputClassName}
          >
            <option value="">Select service from approved list</option>
            {SERVICE_OPTIONS.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
              </option>
            ))}
          </select>
        </SelectorBlock>

        <SelectorBlock title="Operating locations">
          <select
            value=""
            onChange={(event) => selectLocation(event.target.value)}
            className={inputClassName}
          >
            <option value="">Select location from approved list</option>
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
          <SelectedList
            icon={<LocationPinIcon />}
            empty="No operating locations selected"
            values={form.serviceAreas.map((location) => ({
              id: location,
              label: location,
            }))}
            onRemove={removeLocation}
          />
        </SelectorBlock>

        <SubscriptionTierPanel
          provider={provider}
          saving={tierSaving}
          onTogglePremium={togglePremiumTier}
        />
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
            "grid gap-3 transition",
            !form.operatingTimeEnabled && "pointer-events-none opacity-45",
          )}
        >
          {DAY_OPTIONS.map((day) => {
            const schedule = form.operatingSchedule[day.id];
            const dayDisabled = !form.operatingTimeEnabled;

            return (
              <div
                key={day.id}
                className={cn(
                  "grid gap-3 rounded-xl border p-3 transition sm:grid-cols-[minmax(150px,1fr)_minmax(120px,160px)_minmax(120px,160px)] sm:items-end",
                  schedule.enabled
                    ? "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]"
                    : "border-slate-200 bg-white opacity-70 dark:border-white/10 dark:bg-transparent",
                )}
              >
                <div className="flex items-center gap-3 sm:pb-1">
                  <button
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    aria-pressed={schedule.enabled}
                    disabled={dayDisabled}
                    className={cn(
                      "relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed",
                      schedule.enabled
                        ? "bg-[#ff5630]"
                        : "bg-slate-200 dark:bg-white/10",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                        schedule.enabled ? "left-6" : "left-1",
                      )}
                    />
                    <span className="sr-only">
                      {schedule.enabled ? "Close" : "Open"} {day.fullLabel}
                    </span>
                  </button>
                  <div>
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {day.fullLabel}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-white/45">
                      {schedule.enabled ? "Open" : "Closed"}
                    </div>
                  </div>
                </div>
                <Field
                  label="Opens"
                  type="time"
                  value={schedule.opensAt}
                  onChange={(value) =>
                    updateOperatingTime(day.id, "opensAt", value)
                  }
                  disabled={dayDisabled || !schedule.enabled}
                />
                <Field
                  label="Closes"
                  type="time"
                  value={schedule.closesAt}
                  onChange={(value) =>
                    updateOperatingTime(day.id, "closesAt", value)
                  }
                  disabled={dayDisabled || !schedule.enabled}
                />
              </div>
            );
          })}
        </div>
      </FormPanel>

      <FormPanel title="Contact and operations">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Main contact person"
            value={form.mainContactPerson}
            onChange={(value) => updateField("mainContactPerson", value)}
          />
          <Field
            label="Contact person number"
            value={form.contactPersonPhone}
            onChange={(value) => updateField("contactPersonPhone", value)}
          />
          <Field
            label="Business phone"
            value={form.businessPhone}
            onChange={(value) => updateField("businessPhone", value)}
          />
          <Field
            label="Business email"
            value={form.businessEmail}
            onChange={(value) => updateField("businessEmail", value)}
          />
          <Field
            label="Established year"
            value={form.establishedYear}
            onChange={(value) => updateField("establishedYear", value)}
          />
          <Field
            label="Number of employees"
            value={form.numberOfEmployees}
            onChange={(value) => updateField("numberOfEmployees", value)}
          />
          <TextArea
            label="Physical address"
            value={form.physicalAddress}
            onChange={(value) => updateField("physicalAddress", value)}
            className="md:col-span-2"
          />
        </div>
        <div className="mt-4">
          <DocumentRequirement
            document={documentsByType.contact_person_id}
            definition={REQUIRED_DOCUMENTS[1]}
            editable={form.documents.find(
              (item) => item.type === "contact_person_id",
            )}
            uploading={uploading === "contact_person_id"}
            onUpload={(file) => uploadDocument("contact_person_id", file)}
            onStatusChange={(status) =>
              updateDocument("contact_person_id", { status })
            }
            onNotesChange={(notes) =>
              updateDocument("contact_person_id", { notes })
            }
          />
        </div>
      </FormPanel>

      <FormPanel
        title="Listings"
        action={
          <button
            type="button"
            onClick={addListing}
            disabled={addingListing}
            className={cn(
              actionButtonVariants({ variant: "secondary", size: "sm" }),
            )}
          >
            <ListPlus className="h-4 w-4" />
            {addingListing ? "Adding..." : listingServiceConfig.addLabel}
          </button>
        }
      >
        <ListingsManagerPanel
          listings={serviceListings}
          loading={loadingListings}
          selectedListingId={selectedGalleryListingId}
          deletingListingId={deletingListingId}
          service={selectedService}
          onSelectListing={setSelectedGalleryListingId}
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
            onChange={(value) => updateField("legalCompanyName", value)}
          />
          <Field
            label="Date incorporated"
            value={form.incorporationDate}
            type="date"
            onChange={(value) => updateField("incorporationDate", value)}
            icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
          />
          <Field
            label="Company registration number"
            value={form.businessRegistrationNumber}
            onChange={(value) =>
              updateField("businessRegistrationNumber", value)
            }
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
            onChange={(value) => updateField("zimraBpNumber", value)}
          />
          <Field
            label="TIN number"
            value={form.tinNumber}
            onChange={(value) => updateField("tinNumber", value)}
          />
          <Field
            label="Tax clearance expiry date"
            value={form.taxClearanceExpiresAt}
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
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
              Review decision
            </span>
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
          <Save className="h-4 w-4" />
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

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
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

          <textarea
            value={editable?.notes ?? document?.notes ?? ""}
            onChange={(event) => onNotesChange(event.target.value)}
            disabled={!document}
            placeholder="Document review notes"
            className={cn(inputClassName, "mt-3 min-h-20 resize-y py-3")}
          />
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
        <h3 className="text-base font-semibold text-slate-950 dark:text-white">
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
  const listingStats = {
    total: listings.length,
    active: listings.filter((listing) => listing.status === "active").length,
    draft: listings.filter((listing) => listing.status === "draft").length,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              {config.label} listings
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
              {getListingServiceSummary(service)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {getListingServiceFieldLabels(service).map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm dark:bg-[#151515] dark:text-white/60"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <StatusPill value={serviceProviderCategoryLabels[service]} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total listings" value={listingStats.total} />
        <Metric label="Active" value={listingStats.active} />
        <Metric label="Draft" value={listingStats.draft} />
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
      ) : listings.length === 0 ? (
        <EmptyPanel title={config.emptyTitle} body={config.emptyBody} />
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => {
            const selected = listing.id === selectedListingId;
            const details = getServiceListingDetails(service, listing);

            return (
              <div
                key={listing.id}
                className={cn(
                  "rounded-xl border p-4 transition",
                  selected
                    ? "border-[#ff5630] bg-[#ff5630]/5 dark:border-[#ff5630]/70 dark:bg-[#ff5630]/10"
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
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
            Listing
          </span>
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
                ? "cursor-pointer hover:border-[#ff5630]/50 hover:bg-[#ff5630]/5 dark:hover:bg-[#ff5630]/10"
                : "cursor-not-allowed opacity-70",
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#ff5630] shadow-sm dark:bg-[#1c1c1e]">
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

  return <Hourglass className={cn("h-4 w-4", iconClassName)} />;
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
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-950 dark:text-white">
            Subscription tier:{" "}
            <span className="font-semibold lowercase">
              {provider.providerTier}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 dark:text-white/45">
            Upgrading to premium is charged at $x per month and unlocks
            additional provider tools once Off2Zim confirms the subscription.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:min-w-52 sm:justify-end">
          <span className="text-sm font-medium text-slate-700 dark:text-white/70">
            Upgrade to Premium
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isPremium}
            disabled={saving}
            onClick={() => onTogglePremium(!isPremium)}
            className={cn(
              "relative h-7 w-12 rounded-full transition disabled:cursor-wait disabled:opacity-60",
              isPremium ? "bg-[#d4af37]" : "bg-slate-200 dark:bg-white/10",
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                isPremium ? "left-6" : "left-1",
              )}
            />
            <span className="sr-only">
              {isPremium ? "Downgrade to basic" : "Upgrade to premium"}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b0b0b]">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
          Premium package includes:
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {PREMIUM_PACKAGE_FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-2 text-sm text-slate-700 dark:text-white/65"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 fill-[#d4af37]/15 text-[#d4af37]" />
              <span>{feature}</span>
            </div>
          ))}
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
          checked ? "bg-[#ff5630]" : "bg-slate-200 dark:bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-6" : "left-1",
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
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1c1c1e]">
      <MapPin className="h-3 w-3 fill-[#ff3b30] text-[#ff3b30]" />
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  icon,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClassName, icon ? "pr-10" : "")}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClassName, "min-h-28 resize-y py-3")}
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
  const className =
    value === "active" || value === "approved"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
      : value === "rejected" || value === "archived"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
        className,
      )}
    >
      {normalized}
    </span>
  );
}

function RatingPill({
  average,
  reviewCount,
}: {
  average: number;
  reviewCount: number;
}) {
  return (
    <div
      aria-label={`${formatAverageRating(average)} stars, ${reviewCount} reviews`}
      className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-black/[0.05] px-3.5 py-2 text-sm text-slate-950 dark:bg-white/10 dark:text-white"
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

  return {
    average: Number.isFinite(average) ? average : 0,
    reviewCount: Math.max(0, reviewCount),
  };
}

function formatAverageRating(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return (Math.round(value * 10) / 10).toFixed(1);
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
