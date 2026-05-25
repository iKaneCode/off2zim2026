"use client";

import { ReactNode } from "react";
import ActionButton, {
  actionButtonVariants,
} from "@/components/admin/ActionButton";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";
import type {
  ProviderCompanyRecord,
  ServiceProviderCategoryId,
} from "@/types/platform";
import {
  Building2,
  CalendarDays,
  FileText,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Tags,
} from "lucide-react";

export const serviceProviderCategoryLabels: Record<
  ServiceProviderCategoryId,
  string
> = {
  stays: "Stays",
  events: "Events",
  things_to_do: "Things to do",
  bus: "Bus",
  flight: "Flight",
};

export function providerTone(status: string) {
  if (status === "basic_approved") return "success" as const;
  if (status === "changes_requested") return "danger" as const;
  if (status === "submitted") return "pending" as const;
  return "neutral" as const;
}

export function formatProviderStatus(status: string) {
  return status.replace(/_/g, " ");
}

export function categoriesFor(provider: ProviderCompanyRecord) {
  return Array.isArray(provider.serviceCategories)
    ? provider.serviceCategories
    : [];
}

interface ReviewDecisionProps {
  status: "basic_approved" | "changes_requested" | "verified_premium";
  setStatus: (
    status: "basic_approved" | "changes_requested" | "verified_premium",
  ) => void;
  notes: string;
  setNotes: (notes: string) => void;
  internalSummary: string;
  setInternalSummary: (summary: string) => void;
  saving: boolean;
  submitReview: () => void;
}

export default function ServiceProviderProfile({
  provider,
  reviewDecision,
}: {
  provider: ProviderCompanyRecord;
  reviewDecision?: ReviewDecisionProps;
}) {
  return (
    <div className="space-y-6">
      <ProviderSummary provider={provider} />
      <ProviderDetails provider={provider} />
      <ProviderDocuments provider={provider} />
      <ProviderReviewHistory provider={provider} />
      {reviewDecision ? <ReviewDecision {...reviewDecision} /> : null}
    </div>
  );
}

function ProviderSummary({ provider }: { provider: ProviderCompanyRecord }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-semibold text-slate-950 dark:text-white">
            {provider.companyName}
          </div>
          {provider.tradingName ? (
            <div className="mt-1 text-sm text-slate-500 dark:text-white/45">
              Trading as {provider.tradingName}
            </div>
          ) : null}
          <div className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-white/55">
            {provider.businessDescription ||
              "No business description provided."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={providerTone(provider.onboardingStatus)}>
            {formatProviderStatus(provider.onboardingStatus)}
          </StatusBadge>
          <StatusBadge
            tone={provider.providerTier === "premium" ? "success" : "neutral"}
          >
            {formatProviderStatus(provider.providerTier)}
          </StatusBadge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Listings" value={provider.listingStats?.total ?? 0} />
        <Metric label="Active" value={provider.listingStats?.active ?? 0} />
        <Metric label="Bookings" value={provider.bookingStats?.total ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {categoriesFor(provider).length === 0 ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-white/[0.08] dark:text-white/45">
            No service category assigned
          </span>
        ) : (
          categoriesFor(provider).map((category) => (
            <span
              key={category}
              className="rounded-full bg-[#ff5630]/10 px-3 py-1 text-xs font-medium text-[#b73216] dark:bg-[#ff5630]/15 dark:text-[#ffb49f]"
            >
              {serviceProviderCategoryLabels[category]}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function ProviderDetails({ provider }: { provider: ProviderCompanyRecord }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Detail
          icon={Mail}
          label="Business email"
          value={provider.businessEmail}
        />
        <Detail
          icon={Phone}
          label="Business phone"
          value={provider.businessPhone}
        />
        <Detail
          icon={Building2}
          label="Contact person"
          value={provider.mainContactPerson}
        />
        <Detail
          icon={FileText}
          label="Registration number"
          value={provider.businessRegistrationNumber}
        />
        <Detail
          icon={MapPin}
          label="Address"
          value={provider.physicalAddress}
        />
        <Detail
          icon={Tags}
          label="Business category"
          value={provider.businessCategory || "Not provided"}
        />
        <Detail
          icon={CalendarDays}
          label="Operating hours"
          value={provider.operatingHours || "Not provided"}
        />
        <Detail
          icon={ShieldCheck}
          label="Verification tier"
          value={formatProviderStatus(provider.verificationTier)}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <InfoGroup title="Services offered" values={provider.servicesOffered} />
        <InfoGroup title="Service areas" values={provider.serviceAreas} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <InfoGroup
          title="Platform features"
          values={provider.tierFeatures.map(formatProviderStatus)}
        />
        <InfoGroup
          title="Digital presence"
          values={[
            provider.websiteUrl,
            ...Object.entries(provider.socialMediaLinks).map(
              ([network, url]) => `${network}: ${url}`,
            ),
          ].filter(Boolean)}
        />
      </div>
    </div>
  );
}

function ProviderDocuments({ provider }: { provider: ProviderCompanyRecord }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-700 dark:text-white/80">
        Documents
      </div>
      {provider.documents.length === 0 ? (
        <AdminEmptyState title="No documents uploaded" />
      ) : (
        provider.documents.map((document) => (
          <div
            key={document.id}
            className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-950 dark:text-white">
                  {document.type}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500 dark:text-white/45">
                  {document.fileName}
                </div>
              </div>
              <StatusBadge tone={providerTone(document.status)}>
                {formatProviderStatus(document.status)}
              </StatusBadge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ProviderReviewHistory({
  provider,
}: {
  provider: ProviderCompanyRecord;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-700 dark:text-white/80">
        Review history
      </div>
      {provider.verificationReviews.length === 0 ? (
        <AdminEmptyState title="No review history" />
      ) : (
        provider.verificationReviews.slice(0, 4).map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-950 dark:text-white">
                {formatProviderStatus(review.reviewType)}
              </div>
              <StatusBadge tone={providerTone(review.status)}>
                {formatProviderStatus(review.status)}
              </StatusBadge>
            </div>
            {review.notes ? (
              <div className="mt-2 text-sm text-slate-600 dark:text-white/55">
                {review.notes}
              </div>
            ) : null}
            <div className="mt-2 text-xs text-slate-500 dark:text-white/40">
              {review.reviewedAt
                ? new Date(review.reviewedAt).toLocaleString()
                : new Date(review.createdAt).toLocaleString()}
              {review.reviewedBy ? ` by ${review.reviewedBy.name}` : ""}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ReviewDecision({
  status,
  setStatus,
  notes,
  setNotes,
  internalSummary,
  setInternalSummary,
  saving,
  submitReview,
}: ReviewDecisionProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <div className="text-sm font-medium text-slate-700 dark:text-white/80">
        Review decision
      </div>
      <select
        value={status}
        onChange={(event) =>
          setStatus(
            event.target.value as
              | "basic_approved"
              | "changes_requested"
              | "verified_premium",
          )
        }
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
      >
        <option value="basic_approved">Approve</option>
        <option value="changes_requested">Reject / request changes</option>
        <option value="verified_premium">Approve verified / premium</option>
      </select>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
        placeholder="Review notes"
      />
      <textarea
        value={internalSummary}
        onChange={(event) => setInternalSummary(event.target.value)}
        className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
        placeholder="Internal summary"
      />
      <div className="flex flex-wrap gap-2">
        <ActionButton
          variant="primary"
          onClick={submitReview}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save decision"}
        </ActionButton>
        <button
          type="button"
          onClick={() => {
            setNotes("");
            setInternalSummary("");
          }}
          disabled={saving}
          className={cn(actionButtonVariants({ variant: "secondary" }))}
        >
          Clear notes
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm text-slate-900 dark:text-white">
        {value || "Not provided"}
      </div>
    </div>
  );
}

function InfoGroup({ title, values }: { title: string; values: unknown[] }) {
  const normalizedValues = values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">
        {title}
      </div>
      {normalizedValues.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500 dark:text-white/45">
          Not provided
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {normalizedValues.map((value) => (
            <span
              key={value}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/[0.08] dark:text-white/60"
            >
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
