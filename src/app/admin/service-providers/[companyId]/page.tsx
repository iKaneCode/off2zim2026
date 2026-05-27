"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { actionButtonVariants } from "@/components/admin/ActionButton";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminShell from "@/components/admin/AdminShell";
import EditableServiceProviderProfile from "@/components/admin/EditableServiceProviderProfile";
import { formatProviderStatus } from "@/components/admin/ServiceProviderProfile";
import { apiFetch } from "@/lib/client-api";
import { getSurfaceHref } from "@/lib/app-surface";
import { cn } from "@/lib/utils";
import type { ProviderCompanyRecord } from "@/types/platform";
import { ChevronLeft, XCircle } from "lucide-react";

export default function AdminProviderDetailPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminProviderDetailContent />
    </ProtectedRoute>
  );
}

function AdminProviderDetailContent() {
  const params = useParams<{ companyId: string }>();
  const companyId = params?.companyId;
  const [provider, setProvider] = useState<ProviderCompanyRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [internalSummary, setInternalSummary] = useState("");
  const [status, setStatus] = useState<
    "basic_approved" | "changes_requested" | "verified_premium"
  >("basic_approved");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProvider = async () => {
      if (!companyId) {
        return;
      }

      try {
        const payload = await apiFetch<{ provider: ProviderCompanyRecord }>(
          `/api/admin/providers/${companyId}`,
        );
        setProvider(payload.provider);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the service provider.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProvider();
  }, [companyId]);

  const submitReview = async () => {
    if (!provider || !notes.trim()) {
      setError("Add review notes before saving.");
      return;
    }

    setSaving(true);
    try {
      const payload = await apiFetch<{ company: ProviderCompanyRecord }>(
        `/api/admin/providers/${provider.id}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            notes,
            internalSummary,
          }),
        },
      );

      setProvider(payload.company);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      activePath="/admin/service-providers"
      title={
        provider?.tradingName || provider?.companyName || "Service Providers"
      }
      description={
        provider ? (
          <div className="flex flex-col gap-3">
            <ProviderHeaderStatus provider={provider} />
            <Link
              href={getSurfaceHref("admin", "/admin/service-providers")}
              aria-label="Back to service providers"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-900/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus:ring-white/15"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </div>
        ) : undefined
      }
      actions={
        provider ? (
          <div className="text-right text-sm text-slate-500 dark:text-white/45">
            <div>
              <span className="font-medium text-slate-700 dark:text-white/70">
                Registration Date:
              </span>{" "}
              <span>{formatDisplayDate(provider.createdAt)}</span>
            </div>
            <div className="mt-1">
              <span className="font-medium text-slate-700 dark:text-white/70">
                Subscription Tier:
              </span>{" "}
              <span className="font-semibold text-slate-950 dark:text-white">
                {formatDisplayLabel(provider.providerTier)}
              </span>
            </div>
          </div>
        ) : null
      }
    >
      {error ? (
        <PageAlertModal
          title="Attention required"
          message={error}
          onClose={() => setError("")}
        />
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
          <div className="grid gap-5 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]"
              />
            ))}
          </div>
        </div>
      ) : !provider ? (
        <AdminEmptyState
          title="Service provider not found"
          body="Return to the list and choose another service provider."
        />
      ) : (
        <EditableServiceProviderProfile
          provider={provider}
          onProviderChange={setProvider}
          reviewDecision={{
            status,
            setStatus,
            notes,
            setNotes,
            internalSummary,
            setInternalSummary,
            saving,
            submitReview,
          }}
        />
      )}
    </AdminShell>
  );
}

function PageAlertModal({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white p-5 text-center shadow-2xl dark:border-white/10 dark:bg-[#101010]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <XCircle className="h-7 w-7" />
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

function ProviderHeaderStatus({
  provider,
}: {
  provider: ProviderCompanyRecord;
}) {
  const needsAttention =
    ["changes_requested", "draft", "submitted"].includes(
      provider.onboardingStatus,
    ) ||
    provider.documents.some((document) =>
      ["rejected", "changes_requested"].includes(document.status),
    ) ||
    !["active", "trialing"].includes(provider.tierStatus);
  const label = needsAttention ? "Attention Required" : "Online";

  return (
    <div className="inline-flex items-center gap-2 text-sm font-medium">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          needsAttention
            ? "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]"
            : "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]",
        )}
      />
      <span
        className={
          needsAttention
            ? "text-rose-700 dark:text-rose-300"
            : "text-emerald-700 dark:text-emerald-300"
        }
      >
        {label}
      </span>
    </div>
  );
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDisplayLabel(value: string) {
  return formatProviderStatus(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
