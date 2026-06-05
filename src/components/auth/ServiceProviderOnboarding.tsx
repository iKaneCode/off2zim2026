"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/client-api";
import { curatedZimbabweDestinations } from "@/lib/destination-explorer";
import {
  SERVICE_PROVIDER_FILTERS,
  type ServiceProviderCategoryId,
} from "@/lib/service-provider-categories";
import type {
  ProviderCompanyRecord,
  ProviderDocumentRecord,
  ProviderTier,
} from "@/types/platform";

interface ServiceProviderOnboardingProps {
  initialCompany?: ProviderCompanyRecord | null;
  onComplete?: (company: ProviderCompanyRecord) => void;
}

type StepId = "profile" | "operating-time" | "review";
type OperatingDayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface OperatingDaySchedule {
  enabled: boolean;
  opensAt: string;
  closesAt: string;
}

interface ProfileFormState {
  displayName: string;
  legalCompanyName: string;
  incorporationDate: string;
  businessRegistrationNumber: string;
  businessDescription: string;
  selectedService: ServiceProviderCategoryId | "";
  serviceAreas: string[];
  providerTier: ProviderTier;
  profileImageUrl: string;
  coverImageUrl: string;
  businessPhone: string;
  businessEmail: string;
  physicalAddress: string;
  mainContactPerson: string;
  contactPersonPhone: string;
  contactPersonIdType: string;
  contactPersonIdNumber: string;
  zimraBpNumber: string;
  tinNumber: string;
  taxClearanceExpiresAt: string;
}

interface DocumentDraft {
  type: string;
  title: string;
  helper: string;
  fileName: string;
  fileUrl: string | null;
  status: string;
}

const STEPS: Array<{ id: StepId; title: string; helper: string }> = [
  {
    id: "profile",
    title: "Profile",
    helper: "Business identity, tier, locations, contact, and documents.",
  },
  {
    id: "operating-time",
    title: "Operating time",
    helper: "Optional days and hours for the public profile.",
  },
  {
    id: "review",
    title: "Submit",
    helper: "Send the profile to Off2Zim for approval.",
  },
];

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
    helper: "Upload the certificate for the registered company.",
  },
  {
    type: "contact_person_id",
    title: "Contact person ID / passport",
    helper: "Upload the ID or passport for the main contact person.",
  },
  {
    type: "tax_clearance",
    title: "Tax clearance",
    helper: "Upload the current tax clearance certificate.",
  },
];

function createDefaultSchedule(
  enabledDays: OperatingDayId[] = ["mon", "tue", "wed", "thu", "fri"],
) {
  return DAY_OPTIONS.reduce<Record<OperatingDayId, OperatingDaySchedule>>(
    (accumulator, day) => {
      accumulator[day.id] = {
        enabled: enabledDays.includes(day.id),
        opensAt: "08:00",
        closesAt: "17:00",
      };
      return accumulator;
    },
    {} as Record<OperatingDayId, OperatingDaySchedule>,
  );
}

function parseOperatingHours(value?: string | null) {
  if (!value) {
    return { enabled: true, schedule: createDefaultSchedule() };
  }

  if (value.trim().toLowerCase() === "closed") {
    return { enabled: false, schedule: createDefaultSchedule([]) };
  }

  try {
    const parsed = JSON.parse(value) as {
      enabled?: boolean;
      schedule?: Partial<Record<OperatingDayId, Partial<OperatingDaySchedule>>>;
    };
    const source = parsed.schedule;
    if (source && typeof source === "object") {
      const schedule = createDefaultSchedule([]);
      for (const day of DAY_OPTIONS) {
        const entry = source[day.id];
        if (!entry || typeof entry !== "object") continue;
        schedule[day.id] = {
          enabled: Boolean(entry.enabled),
          opensAt: typeof entry.opensAt === "string" ? entry.opensAt : "08:00",
          closesAt:
            typeof entry.closesAt === "string" ? entry.closesAt : "17:00",
        };
      }
      return {
        enabled:
          typeof parsed.enabled === "boolean"
            ? parsed.enabled
            : Object.values(schedule).some((day) => day.enabled),
        schedule,
      };
    }
  } catch {
    // Fall back to the legacy human-readable operating-hours format.
  }

  const schedule = createDefaultSchedule([]);
  const groups = value
    .split(";")
    .map((group) => group.trim())
    .filter(Boolean);
  let parsed = false;

  for (const group of groups) {
    const match = group.match(/^([a-z, ]+) (\d{2}:\d{2}) - (\d{2}:\d{2})$/i);
    if (!match) continue;

    const days = match[1]
      .split(",")
      .map((day) => day.trim().slice(0, 3).toLowerCase())
      .filter((day): day is OperatingDayId =>
        DAY_OPTIONS.some((option) => option.id === day),
      );

    for (const day of days) {
      schedule[day] = {
        enabled: true,
        opensAt: match[2],
        closesAt: match[3],
      };
      parsed = true;
    }
  }

  return {
    enabled: parsed,
    schedule: parsed ? schedule : createDefaultSchedule(),
  };
}

function formatOperatingHours(
  enabled: boolean,
  schedule: Record<OperatingDayId, OperatingDaySchedule>,
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

function createDocuments(company?: ProviderCompanyRecord | null) {
  const documentsByType = mapDocumentsByType(company?.documents ?? []);

  return REQUIRED_DOCUMENTS.map<DocumentDraft>((document) => {
    const uploaded = documentsByType[document.type];
    return {
      ...document,
      fileName: uploaded?.fileName ?? "",
      fileUrl: uploaded?.fileUrl ?? null,
      status: uploaded?.status ?? "missing",
    };
  });
}

function createProfileState(
  company?: ProviderCompanyRecord | null,
  userEmail = "",
): ProfileFormState {
  const selectedService = SERVICE_OPTIONS.find((option) =>
    company?.serviceCategories.includes(option.id),
  );

  return {
    displayName: company?.tradingName ?? "",
    legalCompanyName: company?.legalCompanyName ?? "",
    incorporationDate: company?.incorporationDate ?? "",
    businessRegistrationNumber: company?.businessRegistrationNumber ?? "",
    businessDescription: company?.businessDescription ?? "",
    selectedService: selectedService?.id ?? "",
    serviceAreas: company?.serviceAreas ?? [],
    providerTier:
      company?.tierChangeRequestedTier ?? company?.providerTier ?? "basic",
    profileImageUrl: company?.profileImageUrl ?? "",
    coverImageUrl: company?.coverImageUrl ?? "",
    businessPhone: company?.businessPhone ?? "",
    businessEmail: company?.businessEmail ?? userEmail,
    physicalAddress: company?.physicalAddress ?? "",
    mainContactPerson: company?.mainContactPerson ?? "",
    contactPersonPhone: company?.contactPersonPhone ?? "",
    contactPersonIdType: company?.contactPersonIdType ?? "",
    contactPersonIdNumber: company?.contactPersonIdNumber ?? "",
    zimraBpNumber: company?.zimraBpNumber ?? "",
    tinNumber: company?.tinNumber ?? "",
    taxClearanceExpiresAt: company?.taxClearanceExpiresAt ?? "",
  };
}

function getProfileMissingFields(
  profile: ProfileFormState,
  documents: DocumentDraft[],
) {
  const missing: string[] = [];
  const requiredTextFields: Array<[keyof ProfileFormState, string]> = [
    ["profileImageUrl", "Profile picture"],
    ["displayName", "Display name"],
    ["legalCompanyName", "Company name as per certificate"],
    ["incorporationDate", "Incorporation date"],
    ["businessRegistrationNumber", "Company registration number"],
    ["businessDescription", "About us"],
    ["selectedService", "Service"],
    ["businessPhone", "Business phone"],
    ["businessEmail", "Business email"],
    ["physicalAddress", "Physical address"],
    ["mainContactPerson", "Contact person"],
    ["contactPersonPhone", "Contact person phone"],
    ["contactPersonIdType", "ID type"],
    ["contactPersonIdNumber", "ID / passport number"],
    ["zimraBpNumber", "ZIMRA BP number"],
    ["tinNumber", "TIN number"],
    ["taxClearanceExpiresAt", "Tax clearance expiry"],
  ];

  for (const [field, label] of requiredTextFields) {
    const value = profile[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      missing.push(label);
    }
  }

  if (profile.serviceAreas.length === 0) {
    missing.push("Operating locations");
  }

  for (const document of documents) {
    if (!document.fileUrl || document.status === "rejected") {
      missing.push(document.title);
    }
  }

  return missing;
}

function getOperatingMissingFields(
  enabled: boolean,
  schedule: Record<OperatingDayId, OperatingDaySchedule>,
) {
  if (!enabled) return [];

  const enabledDays = DAY_OPTIONS.filter((day) => schedule[day.id]?.enabled);
  if (enabledDays.length === 0) {
    return ["Select at least one operating day"];
  }

  const incompleteDay = enabledDays.find((day) => {
    const entry = schedule[day.id];
    return !entry.opensAt || !entry.closesAt || entry.closesAt <= entry.opensAt;
  });

  return incompleteDay ? [`Check ${incompleteDay.fullLabel} hours`] : [];
}

function statusTone(status: string) {
  if (status === "approved" || status === "verified") {
    return "bg-[#0f2a1e] text-[#4ade80]";
  }
  if (status === "uploaded" || status === "pending") {
    return "bg-[#332913] text-[#ffca74]";
  }
  if (status === "rejected") {
    return "bg-[#2a0f0a] text-[#ff8a78]";
  }
  return "bg-black/[0.05] text-slate-500 dark:bg-white/[0.06] dark:text-white/45";
}

function fieldClass(hasError: boolean) {
  return `theme-input min-h-12 w-full rounded-2xl px-4 text-sm ${
    hasError
      ? "border-rose-300 ring-4 ring-rose-500/10 dark:border-rose-500/40"
      : ""
  }`;
}

export default function ServiceProviderOnboarding({
  initialCompany,
  onComplete,
}: ServiceProviderOnboardingProps) {
  const { user } = useAuth();
  const [company, setCompany] = useState<ProviderCompanyRecord | null>(
    initialCompany ?? null,
  );
  const [loading, setLoading] = useState(!initialCompany);
  const [currentStep, setCurrentStep] = useState<StepId>("profile");
  const [profile, setProfile] = useState<ProfileFormState>(() =>
    createProfileState(initialCompany, user?.email ?? ""),
  );
  const operatingHours = parseOperatingHours(initialCompany?.operatingHours);
  const [operatingEnabled, setOperatingEnabled] = useState(
    operatingHours.enabled,
  );
  const [schedule, setSchedule] = useState(operatingHours.schedule);
  const [documents, setDocuments] = useState<DocumentDraft[]>(() =>
    createDocuments(initialCompany),
  );
  const [showProfileErrors, setShowProfileErrors] = useState(false);
  const [showOperatingErrors, setShowOperatingErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCompany) {
      setCompany(initialCompany);
      setProfile(createProfileState(initialCompany, user?.email ?? ""));
      const parsedHours = parseOperatingHours(initialCompany.operatingHours);
      setOperatingEnabled(parsedHours.enabled);
      setSchedule(parsedHours.schedule);
      setDocuments(createDocuments(initialCompany));
      setLoading(false);
      return;
    }

    let active = true;
    apiFetch<{ company: ProviderCompanyRecord }>("/api/provider/company")
      .then((payload) => {
        if (!active) return;
        setCompany(payload.company);
        setProfile(createProfileState(payload.company, user?.email ?? ""));
        const parsedHours = parseOperatingHours(payload.company.operatingHours);
        setOperatingEnabled(parsedHours.enabled);
        setSchedule(parsedHours.schedule);
        setDocuments(createDocuments(payload.company));
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your company profile.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialCompany, user?.email]);

  const stepIndex = STEPS.findIndex((step) => step.id === currentStep);
  const profileMissing = useMemo(
    () => getProfileMissingFields(profile, documents),
    [documents, profile],
  );
  const operatingMissing = useMemo(
    () => getOperatingMissingFields(operatingEnabled, schedule),
    [operatingEnabled, schedule],
  );
  const selectedServiceLabel =
    SERVICE_OPTIONS.find((option) => option.id === profile.selectedService)
      ?.label ?? "";

  const updateProfileField = <T extends keyof ProfileFormState>(
    field: T,
    value: ProfileFormState[T],
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const uploadImage = async (
    field: "profileImageUrl" | "coverImageUrl",
    file: File,
  ) => {
    setUploading(field);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "contentType",
        field === "profileImageUrl" ? "profile" : "cover",
      );
      formData.append("contentId", company?.id ?? user?.id ?? "provider");

      const payload = await apiFetch<{
        asset: { fileName: string; fileUrl: string };
      }>("/api/provider/uploads/content", {
        method: "POST",
        body: formData,
      });

      updateProfileField(field, payload.asset.fileUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload this image.",
      );
    } finally {
      setUploading(null);
    }
  };

  const uploadDocument = async (documentType: string, file: File) => {
    setUploading(documentType);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const payload = await apiFetch<{
        asset: {
          fileName: string;
          fileUrl: string;
        };
      }>("/api/provider/uploads/documents", {
        method: "POST",
        body: formData,
      });

      setDocuments((current) =>
        current.map((document) =>
          document.type === documentType
            ? {
                ...document,
                fileName: payload.asset.fileName,
                fileUrl: payload.asset.fileUrl,
                status: "uploaded",
              }
            : document,
        ),
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload this document.",
      );
    } finally {
      setUploading(null);
    }
  };

  const buildCompanyPayload = () => ({
    companyName:
      profile.legalCompanyName.trim() ||
      profile.displayName.trim() ||
      company?.companyName ||
      user?.email ||
      "Service provider",
    tradingName: profile.displayName.trim(),
    legalCompanyName: profile.legalCompanyName.trim(),
    incorporationDate: profile.incorporationDate,
    profileImageUrl: profile.profileImageUrl,
    coverImageUrl: profile.coverImageUrl,
    businessRegistrationNumber: profile.businessRegistrationNumber.trim(),
    mainContactPerson: profile.mainContactPerson.trim(),
    contactPersonPhone: profile.contactPersonPhone.trim(),
    contactPersonIdType: profile.contactPersonIdType,
    contactPersonIdNumber: profile.contactPersonIdNumber.trim(),
    businessPhone: profile.businessPhone.trim(),
    businessEmail: profile.businessEmail.trim(),
    physicalAddress: profile.physicalAddress.trim(),
    headquartersCity: profile.serviceAreas[0] || null,
    businessCategory: selectedServiceLabel || null,
    businessDescription: profile.businessDescription.trim(),
    operatingHours: formatOperatingHours(operatingEnabled, schedule),
    socialMediaLinks: {},
    servicesOffered: selectedServiceLabel ? [selectedServiceLabel] : [],
    serviceAreas: profile.serviceAreas,
    zimraBpNumber: profile.zimraBpNumber.trim(),
    tinNumber: profile.tinNumber.trim(),
    taxClearanceExpiresAt: profile.taxClearanceExpiresAt,
    providerTier: profile.providerTier,
    documents: documents
      .filter((document) => document.fileUrl)
      .map((document) => ({
        type: document.type,
        fileName: document.fileName || document.title,
        fileUrl: document.fileUrl,
        status: document.status === "missing" ? "uploaded" : document.status,
      })),
  });

  const saveCompany = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company",
        {
          method: "PATCH",
          body: JSON.stringify(buildCompanyPayload()),
        },
      );
      setCompany(payload.company);
      return payload.company;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your profile.",
      );
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const continueFromProfile = async () => {
    setShowProfileErrors(true);
    if (profileMissing.length > 0) return;

    await saveCompany();
    setCurrentStep("operating-time");
  };

  const continueFromOperating = async () => {
    setShowOperatingErrors(true);
    if (operatingMissing.length > 0) return;

    await saveCompany();
    setCurrentStep("review");
  };

  const submitForReview = async () => {
    setShowProfileErrors(true);
    setShowOperatingErrors(true);

    if (profileMissing.length > 0 || operatingMissing.length > 0) {
      setError("Complete the highlighted items before submitting for review.");
      setCurrentStep(profileMissing.length > 0 ? "profile" : "operating-time");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await saveCompany();
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        "/api/provider/company/review",
        {
          method: "POST",
        },
      );
      setCompany(payload.company);
      onComplete?.(payload.company);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your profile for review.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="theme-page flex min-h-screen items-center justify-center px-4">
        <div className="theme-panel rounded-[28px] px-8 py-6 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#ff5630]" />
          <p className="theme-muted mt-3 text-sm">Loading provider setup...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="theme-panel rounded-[28px] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="theme-chip inline-flex rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.24em]">
              Service provider setup
            </div>
            <h1 className="theme-heading mt-4 text-2xl font-semibold sm:text-3xl">
              Complete your business profile
            </h1>
            <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">
              Off2Zim reviews this information before your listings and gallery
              become available.
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 px-4 py-3 text-sm dark:border-white/10">
            <span className="theme-muted">Status</span>
            <div className="theme-heading mt-1 font-semibold">
              {company?.onboardingStatus?.replace(/_/g, " ") || "draft"}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const active = step.id === currentStep;
            const complete = index < stepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (index <= stepIndex) setCurrentStep(step.id);
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[#ff5630] bg-[#ff5630]/10"
                    : complete
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="theme-heading text-sm font-semibold">
                    {step.title}
                  </span>
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4 text-[#4ade80]" />
                  ) : (
                    <span className="theme-muted text-xs">0{index + 1}</span>
                  )}
                </div>
                <p className="theme-muted mt-2 text-xs leading-5">
                  {step.helper}
                </p>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8">
          {currentStep === "profile" && (
            <ProfileStep
              documents={documents}
              profile={profile}
              showErrors={showProfileErrors}
              uploading={uploading}
              onDocumentUpload={uploadDocument}
              onImageUpload={uploadImage}
              onProfileChange={updateProfileField}
            />
          )}

          {currentStep === "operating-time" && (
            <OperatingTimeStep
              enabled={operatingEnabled}
              schedule={schedule}
              showErrors={showOperatingErrors}
              onEnabledChange={setOperatingEnabled}
              onScheduleChange={setSchedule}
            />
          )}

          {currentStep === "review" && (
            <ReviewStep
              documents={documents}
              operatingEnabled={operatingEnabled}
              profile={profile}
              selectedServiceLabel={selectedServiceLabel}
              missing={[...profileMissing, ...operatingMissing]}
            />
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-black/10 pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              const previous = STEPS[Math.max(0, stepIndex - 1)];
              setCurrentStep(previous.id);
            }}
            disabled={stepIndex === 0 || saving}
            className="theme-button-secondary inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={saveCompany}
              disabled={saving}
              className="theme-button-secondary inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>

            {currentStep === "profile" ? (
              <PrimaryButton onClick={continueFromProfile} disabled={saving}>
                Continue
                <ChevronRight className="h-4 w-4" />
              </PrimaryButton>
            ) : currentStep === "operating-time" ? (
              <PrimaryButton onClick={continueFromOperating} disabled={saving}>
                Continue
                <ChevronRight className="h-4 w-4" />
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={submitForReview} disabled={saving}>
                {saving ? "Submitting..." : "Submit for review"}
                <ShieldCheck className="h-4 w-4" />
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ff5630] px-6 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function ProfileStep({
  documents,
  profile,
  showErrors,
  uploading,
  onDocumentUpload,
  onImageUpload,
  onProfileChange,
}: {
  documents: DocumentDraft[];
  profile: ProfileFormState;
  showErrors: boolean;
  uploading: string | null;
  onDocumentUpload: (documentType: string, file: File) => void;
  onImageUpload: (
    field: "profileImageUrl" | "coverImageUrl",
    file: File,
  ) => void;
  onProfileChange: <T extends keyof ProfileFormState>(
    field: T,
    value: ProfileFormState[T],
  ) => void;
}) {
  const missing = new Set(getProfileMissingFields(profile, documents));
  const isPremium = profile.providerTier === "premium";

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <ImageUploader
          title="Profile picture"
          imageUrl={profile.profileImageUrl}
          field="profileImageUrl"
          uploading={uploading}
          hasError={showErrors && missing.has("Profile picture")}
          onUpload={onImageUpload}
          shape="circle"
        />
        <ImageUploader
          title={isPremium ? "Cover image" : "Cover image unlocks on Premium"}
          imageUrl={profile.coverImageUrl}
          field="coverImageUrl"
          uploading={uploading}
          disabled={!isPremium}
          onUpload={onImageUpload}
          shape="cover"
        />
      </div>

      <FormSection
        icon={<Building2 className="h-5 w-5 text-[#8dc9ff]" />}
        title="Business profile"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Display name"
            value={profile.displayName}
            placeholder="Add"
            error={showErrors && missing.has("Display name")}
            onChange={(value) => onProfileChange("displayName", value)}
          />
          <TextField
            label="Company name as per certificate"
            value={profile.legalCompanyName}
            placeholder="Add"
            error={showErrors && missing.has("Company name as per certificate")}
            onChange={(value) => onProfileChange("legalCompanyName", value)}
          />
          <TextField
            label="Date incorporated"
            type="date"
            value={profile.incorporationDate}
            error={showErrors && missing.has("Incorporation date")}
            onChange={(value) => onProfileChange("incorporationDate", value)}
          />
          <TextField
            label="Company registration number"
            value={profile.businessRegistrationNumber}
            placeholder="Add"
            error={showErrors && missing.has("Company registration number")}
            onChange={(value) =>
              onProfileChange("businessRegistrationNumber", value)
            }
          />
          <label className="md:col-span-2">
            <span className="theme-muted mb-2 block text-sm font-medium">
              About us
            </span>
            <textarea
              value={profile.businessDescription}
              onChange={(event) =>
                onProfileChange("businessDescription", event.target.value)
              }
              placeholder="Add"
              className={`${fieldClass(
                showErrors && missing.has("About us"),
              )} min-h-28 py-3`}
            />
            {showErrors && missing.has("About us") ? <RequiredText /> : null}
          </label>
          <label>
            <span className="theme-muted mb-2 block text-sm font-medium">
              Service
            </span>
            <select
              value={profile.selectedService}
              onChange={(event) =>
                onProfileChange(
                  "selectedService",
                  event.target.value as ServiceProviderCategoryId | "",
                )
              }
              className={fieldClass(showErrors && missing.has("Service"))}
            >
              <option value="">Select</option>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {showErrors && missing.has("Service") ? <RequiredText /> : null}
          </label>
          <LocationPicker
            selected={profile.serviceAreas}
            showError={showErrors && missing.has("Operating locations")}
            onChange={(next) => onProfileChange("serviceAreas", next)}
          />
        </div>
      </FormSection>

      <FormSection
        icon={<ShieldCheck className="h-5 w-5 text-[#ffca74]" />}
        title="Subscription tier"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(["basic", "premium"] as ProviderTier[]).map((tier) => {
            const selected = profile.providerTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => onProfileChange("providerTier", tier)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[#ff5630] bg-[#ff5630]/10"
                    : "border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]"
                }`}
              >
                <div className="theme-heading font-semibold capitalize">
                  {tier}
                </div>
                <p className="theme-muted mt-2 text-sm leading-6">
                  {tier === "basic"
                    ? "Core profile, listings, calendar, and basic analytics."
                    : "Adds gallery, push campaigns, advanced visuals, and premium provider app features."}
                </p>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection
        icon={<MapPin className="h-5 w-5 text-[#ff5630]" />}
        title="Contact person and operations"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Business phone"
            value={profile.businessPhone}
            placeholder="Add"
            error={showErrors && missing.has("Business phone")}
            onChange={(value) => onProfileChange("businessPhone", value)}
          />
          <TextField
            label="Business email"
            type="email"
            value={profile.businessEmail}
            placeholder="Add"
            error={showErrors && missing.has("Business email")}
            onChange={(value) => onProfileChange("businessEmail", value)}
          />
          <TextField
            label="Physical address"
            value={profile.physicalAddress}
            placeholder="Add"
            error={showErrors && missing.has("Physical address")}
            onChange={(value) => onProfileChange("physicalAddress", value)}
          />
          <TextField
            label="Contact person"
            value={profile.mainContactPerson}
            placeholder="Add"
            error={showErrors && missing.has("Contact person")}
            onChange={(value) => onProfileChange("mainContactPerson", value)}
          />
          <TextField
            label="Contact person phone"
            value={profile.contactPersonPhone}
            placeholder="Add"
            error={showErrors && missing.has("Contact person phone")}
            onChange={(value) => onProfileChange("contactPersonPhone", value)}
          />
          <label>
            <span className="theme-muted mb-2 block text-sm font-medium">
              ID type
            </span>
            <select
              value={profile.contactPersonIdType}
              onChange={(event) =>
                onProfileChange("contactPersonIdType", event.target.value)
              }
              className={fieldClass(showErrors && missing.has("ID type"))}
            >
              <option value="">Select</option>
              <option value="id">ID</option>
              <option value="passport">Passport</option>
            </select>
            {showErrors && missing.has("ID type") ? <RequiredText /> : null}
          </label>
          <TextField
            label="ID / passport number"
            value={profile.contactPersonIdNumber}
            placeholder="Add"
            error={showErrors && missing.has("ID / passport number")}
            onChange={(value) =>
              onProfileChange("contactPersonIdNumber", value)
            }
          />
          <TextField
            label="ZIMRA BP number"
            value={profile.zimraBpNumber}
            placeholder="Add"
            error={showErrors && missing.has("ZIMRA BP number")}
            onChange={(value) => onProfileChange("zimraBpNumber", value)}
          />
          <TextField
            label="TIN number"
            value={profile.tinNumber}
            placeholder="Add"
            error={showErrors && missing.has("TIN number")}
            onChange={(value) => onProfileChange("tinNumber", value)}
          />
          <TextField
            label="Tax clearance expiry"
            type="date"
            value={profile.taxClearanceExpiresAt}
            error={showErrors && missing.has("Tax clearance expiry")}
            onChange={(value) =>
              onProfileChange("taxClearanceExpiresAt", value)
            }
          />
        </div>
      </FormSection>

      <FormSection
        icon={<FileText className="h-5 w-5 text-[#4ade80]" />}
        title="Required documents"
      >
        <div className="grid gap-3">
          {documents.map((document) => (
            <DocumentUploadRow
              key={document.type}
              document={document}
              hasError={showErrors && missing.has(document.title)}
              uploading={uploading === document.type}
              onUpload={onDocumentUpload}
            />
          ))}
        </div>
      </FormSection>
    </div>
  );
}

function FormSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.05]">
          {icon}
        </div>
        <h2 className="theme-heading text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TextField({
  error,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  error?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label>
      <span className="theme-muted mb-2 block text-sm font-medium">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass(Boolean(error))}
      />
      {error ? <RequiredText /> : null}
    </label>
  );
}

function RequiredText() {
  return (
    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-300">Required</p>
  );
}

function ImageUploader({
  disabled,
  field,
  hasError,
  imageUrl,
  onUpload,
  shape,
  title,
  uploading,
}: {
  disabled?: boolean;
  field: "profileImageUrl" | "coverImageUrl";
  hasError?: boolean;
  imageUrl: string;
  onUpload: (field: "profileImageUrl" | "coverImageUrl", file: File) => void;
  shape: "circle" | "cover";
  title: string;
  uploading: string | null;
}) {
  const isUploading = uploading === field;

  return (
    <label
      className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border transition ${
        shape === "circle"
          ? "aspect-square rounded-full"
          : "min-h-[190px] rounded-[24px]"
      } ${
        hasError
          ? "border-rose-300 ring-4 ring-rose-500/10 dark:border-rose-500/40"
          : "border-black/10 dark:border-white/10"
      } ${
        disabled
          ? "cursor-not-allowed bg-black/[0.04] opacity-55 dark:bg-white/[0.03]"
          : "bg-black/[0.03] hover:border-[#ff5630]/50 dark:bg-white/[0.03]"
      }`}
      style={
        imageUrl
          ? {
              backgroundImage: `url("${imageUrl}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      <input
        type="file"
        accept="image/*"
        disabled={disabled || isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(field, file);
          event.currentTarget.value = "";
        }}
        className="sr-only"
      />
      <div
        className={`flex flex-col items-center justify-center gap-2 text-center ${
          imageUrl
            ? "absolute inset-0 bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
            : "theme-muted"
        }`}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <ImagePlus className="h-7 w-7" />
        )}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {hasError ? (
        <span className="absolute bottom-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
          Required
        </span>
      ) : null}
    </label>
  );
}

function LocationPicker({
  onChange,
  selected,
  showError,
}: {
  onChange: (locations: string[]) => void;
  selected: string[];
  showError: boolean;
}) {
  const availableOptions = LOCATION_OPTIONS.filter(
    (option) => !selected.includes(option.value),
  );

  return (
    <div>
      <span className="theme-muted mb-2 block text-sm font-medium">
        Operating locations
      </span>
      <select
        value=""
        onChange={(event) => {
          if (!event.target.value) return;
          onChange([...selected, event.target.value]);
        }}
        className={fieldClass(showError)}
      >
        <option value="">Select</option>
        {availableOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showError ? <RequiredText /> : null}
      {selected.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((location) => (
            <span
              key={location}
              className="inline-flex items-center gap-2 rounded-full bg-[#0f2a1e] px-3 py-1.5 text-xs font-semibold text-[#4ade80]"
            >
              <MapPin className="h-3.5 w-3.5 fill-[#ff5630] text-[#ff5630]" />
              {location}
              <button
                type="button"
                onClick={() =>
                  onChange(selected.filter((item) => item !== location))
                }
                aria-label={`Remove ${location}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DocumentUploadRow({
  document,
  hasError,
  onUpload,
  uploading,
}: {
  document: DocumentDraft;
  hasError: boolean;
  onUpload: (documentType: string, file: File) => void;
  uploading: boolean;
}) {
  return (
    <div
      className={`grid gap-4 rounded-2xl border p-4 md:grid-cols-[1fr_auto] md:items-center ${
        hasError
          ? "border-rose-300 bg-rose-50/70 dark:border-rose-500/40 dark:bg-rose-500/10"
          : "border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="theme-heading text-sm font-semibold">
            {document.title}
          </h3>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusTone(
              document.status,
            )}`}
          >
            {document.status.replace(/_/g, " ")}
          </span>
        </div>
        <p className="theme-muted mt-1 text-sm">{document.helper}</p>
        {document.fileName ? (
          <p className="theme-heading mt-2 text-xs">{document.fileName}</p>
        ) : null}
        {hasError ? <RequiredText /> : null}
      </div>

      <label className="theme-button-secondary inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold">
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Upload
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(document.type, file);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </label>
    </div>
  );
}

function OperatingTimeStep({
  enabled,
  onEnabledChange,
  onScheduleChange,
  schedule,
  showErrors,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onScheduleChange: (
    schedule: Record<OperatingDayId, OperatingDaySchedule>,
  ) => void;
  schedule: Record<OperatingDayId, OperatingDaySchedule>;
  showErrors: boolean;
}) {
  const missing = getOperatingMissingFields(enabled, schedule);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[24px] border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#13283a]">
            <Clock3 className="h-5 w-5 text-[#8dc9ff]" />
          </div>
          <div>
            <h2 className="theme-heading text-lg font-semibold">
              Operating time
            </h2>
            <p className="theme-muted mt-1 text-sm leading-6">
              This is optional. Switch it off if hours change too often or are
              handled per listing.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className={`relative h-8 w-14 rounded-full transition ${
            enabled ? "bg-[#ff5630]" : "bg-black/20 dark:bg-white/20"
          }`}
          aria-label="Toggle operating time"
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
              enabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      {showErrors && missing.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
          {missing.join(", ")}
        </div>
      ) : null}

      <div
        className={`grid gap-3 transition ${
          enabled ? "" : "pointer-events-none opacity-45 grayscale"
        }`}
      >
        {DAY_OPTIONS.map((day) => {
          const entry = schedule[day.id];
          return (
            <div
              key={day.id}
              className="grid gap-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02] md:grid-cols-[160px_1fr_1fr]"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(event) =>
                    onScheduleChange({
                      ...schedule,
                      [day.id]: {
                        ...entry,
                        enabled: event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-black/20 text-[#ff5630] dark:border-white/20"
                />
                <span className="theme-heading text-sm font-semibold">
                  {day.fullLabel}
                </span>
              </label>
              <input
                type="time"
                value={entry.opensAt}
                disabled={!entry.enabled}
                onChange={(event) =>
                  onScheduleChange({
                    ...schedule,
                    [day.id]: { ...entry, opensAt: event.target.value },
                  })
                }
                className="theme-input h-11 rounded-2xl px-4 text-sm"
              />
              <input
                type="time"
                value={entry.closesAt}
                disabled={!entry.enabled}
                onChange={(event) =>
                  onScheduleChange({
                    ...schedule,
                    [day.id]: { ...entry, closesAt: event.target.value },
                  })
                }
                className="theme-input h-11 rounded-2xl px-4 text-sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep({
  documents,
  missing,
  operatingEnabled,
  profile,
  selectedServiceLabel,
}: {
  documents: DocumentDraft[];
  missing: string[];
  operatingEnabled: boolean;
  profile: ProfileFormState;
  selectedServiceLabel: string;
}) {
  const ready = missing.length === 0;

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="theme-heading text-xl font-semibold">
              {ready ? "Ready for review" : "Finish the required items"}
            </h2>
            <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">
              Off2Zim will review the company profile before listings and
              gallery uploads are enabled.
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              ready
                ? "bg-[#0f2a1e] text-[#4ade80]"
                : "bg-[#332913] text-[#ffca74]"
            }`}
          >
            {ready ? "Complete" : `${missing.length} item(s) missing`}
          </span>
        </div>
      </div>

      {missing.length > 0 ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/25 dark:bg-rose-500/10">
          <h3 className="font-semibold text-rose-700 dark:text-rose-200">
            Missing before submission
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 dark:bg-white/10 dark:text-rose-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <SummaryTile
          label="Display name"
          value={profile.displayName || "N/A"}
        />
        <SummaryTile label="Service" value={selectedServiceLabel || "N/A"} />
        <SummaryTile label="Subscription tier" value={profile.providerTier} />
        <SummaryTile
          label="Operating time"
          value={operatingEnabled ? "Configured" : "Switched off"}
        />
        <SummaryTile
          label="Locations"
          value={
            profile.serviceAreas.length > 0
              ? profile.serviceAreas.join(", ")
              : "N/A"
          }
        />
        <SummaryTile
          label="Documents"
          value={`${documents.filter((document) => document.fileUrl).length} of ${documents.length} uploaded`}
        />
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="theme-muted text-xs uppercase tracking-[0.18em]">
        {label}
      </div>
      <div className="theme-heading mt-2 text-sm font-semibold capitalize">
        {value}
      </div>
    </div>
  );
}
