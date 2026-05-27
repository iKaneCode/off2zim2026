"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ActionButton, {
  actionButtonVariants,
} from "@/components/admin/ActionButton";
import AdminCard from "@/components/admin/AdminCard";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminShell from "@/components/admin/AdminShell";
import AdminStatGrid from "@/components/admin/AdminStatGrid";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { DisputeRecord } from "@/types/platform";
import { AlertTriangle, Eye, Flag, ShieldCheck } from "lucide-react";

function disputeTone(status: string) {
  if (["resolved", "closed"].includes(status)) return "success" as const;
  if (status === "under_review") return "pending" as const;
  return "danger" as const;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default function AdminDisputesPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminDisputesContent />
    </ProtectedRoute>
  );
}

function AdminDisputesContent() {
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string>("");

  const loadDisputes = async () => {
    try {
      const payload = await apiFetch<{ disputes: DisputeRecord[] }>("/api/admin/disputes");
      setDisputes(payload.disputes);
      setSelectedId((current) => current || payload.disputes[0]?.id || "");
      setResolutionDrafts((current) => {
        const next = { ...current };
        payload.disputes.forEach((dispute) => {
          next[dispute.id] = current[dispute.id] ?? dispute.resolution ?? "";
        });
        return next;
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const filteredDisputes = useMemo(() => {
    const normalized = query.toLowerCase();
    return disputes.filter((dispute) =>
      [
        dispute.bookingConfirmationNumber,
        dispute.reason,
        dispute.status,
        dispute.openedBy.name,
        dispute.openedBy.email,
        dispute.provider?.companyName || "",
        dispute.listing?.title || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [disputes, query]);

  const selectedDispute = useMemo(
    () => disputes.find((dispute) => dispute.id === selectedId) || null,
    [disputes, selectedId]
  );

  const openCount = disputes.filter((dispute) =>
    ["open", "under_review"].includes(dispute.status)
  ).length;
  const resolvedCount = disputes.filter((dispute) =>
    ["resolved", "closed"].includes(dispute.status)
  ).length;

  const handleUpdateDispute = async (
    dispute: DisputeRecord,
    status: "open" | "under_review" | "resolved" | "closed",
    assignToMe = false,
    refundAction: "none" | "full" = "none"
  ) => {
    setUpdatingId(dispute.id);
    try {
      const payload = await apiFetch<{ dispute: DisputeRecord }>(
        `/api/admin/disputes/${dispute.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            resolution: resolutionDrafts[dispute.id] || null,
            assignToMe,
            refundAction,
          }),
        }
      );
      setDisputes((current) =>
        current.map((item) => (item.id === payload.dispute.id ? payload.dispute : item))
      );
      setResolutionDrafts((current) => ({
        ...current,
        [payload.dispute.id]: payload.dispute.resolution ?? "",
      }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update dispute.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <AdminShell
      activePath="/admin/disputes"
      title="Disputes"
      description="Review escalations, assign ownership, and document final resolutions."
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <AdminStatGrid>
        <AdminCard label="Total disputes" value={loading ? "—" : disputes.length} icon={Flag} />
        <AdminCard
          label="Open queue"
          value={loading ? "—" : openCount}
          icon={AlertTriangle}
          tone="danger"
        />
        <AdminCard
          label="Resolved"
          value={loading ? "—" : resolvedCount}
          icon={ShieldCheck}
          tone="success"
        />
      </AdminStatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
          <div className="px-6 pt-5">
            <AdminSectionHeader
              title="Dispute queue"
              description="Search cases and update review status."
            />
          </div>
          <div className="px-6 py-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dispute ID, booking, provider, or traveler"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white dark:placeholder:text-white/25"
            />
          </div>
          <div className="px-6 pb-6">
            <AdminTable
              columns={[
                {
                  key: "id",
                  header: "Dispute ID",
                  cell: (dispute: DisputeRecord) => (
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(dispute.id)}
                        className="font-medium text-slate-950 hover:text-slate-600 dark:text-white dark:hover:text-white/70"
                      >
                        {dispute.bookingConfirmationNumber}
                      </button>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                        {dispute.reason}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "booking",
                  header: "Booking",
                  cell: (dispute: DisputeRecord) =>
                    dispute.listing?.title || "General booking issue",
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (dispute: DisputeRecord) => (
                    <StatusBadge tone={disputeTone(dispute.status)}>
                      {formatStatus(dispute.status)}
                    </StatusBadge>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  cell: (dispute: DisputeRecord) => (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(dispute.id)}
                        className={cn(actionButtonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === dispute.id}
                        onClick={() => handleUpdateDispute(dispute, "resolved")}
                        className={cn(actionButtonVariants({ variant: "primary", size: "sm" }))}
                      >
                        Resolve
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={filteredDisputes}
              rowKey={(dispute) => dispute.id}
              emptyState="No disputes match the current search."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010]">
          <AdminSectionHeader
            title="Dispute details"
            description="Selected case details and resolution workflow."
          />
          <div className="mt-4">
            {!selectedDispute ? (
              <AdminEmptyState
                title="No dispute selected"
                body="Select a dispute from the queue to review details and submit a resolution."
              />
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950 dark:text-white">
                      {selectedDispute.bookingConfirmationNumber}
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-white/45">
                      {selectedDispute.reason}
                    </div>
                  </div>
                  <StatusBadge tone={disputeTone(selectedDispute.status)}>
                    {formatStatus(selectedDispute.status)}
                  </StatusBadge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Traveler" value={selectedDispute.openedBy.name} />
                  <Info label="Traveler email" value={selectedDispute.openedBy.email} />
                  <Info
                    label="Provider"
                    value={selectedDispute.provider?.companyName || "Off2Zim"}
                  />
                  <Info label="Booking status" value={selectedDispute.bookingStatus} />
                  <Info label="Payment status" value={selectedDispute.paymentStatus} />
                  <Info
                    label="Booking value"
                    value={`${selectedDispute.currency} ${selectedDispute.totalAmount.toFixed(2)}`}
                  />
                  <Info
                    label="Assigned admin"
                    value={selectedDispute.assignedAdmin?.name || "Unassigned"}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4 dark:border-white/10">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">
                    Case details
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-700 dark:text-white/80">
                    {selectedDispute.details || "No additional details were provided."}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="text-sm font-medium text-slate-700 dark:text-white/80">
                    Resolution notes
                  </div>
                  <textarea
                    value={resolutionDrafts[selectedDispute.id] || ""}
                    onChange={(event) =>
                      setResolutionDrafts((current) => ({
                        ...current,
                        [selectedDispute.id]: event.target.value,
                      }))
                    }
                    className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
                    placeholder="Document findings, refund decisions, and follow-up actions."
                  />
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      variant="secondary"
                      disabled={updatingId === selectedDispute.id}
                      onClick={() =>
                        handleUpdateDispute(selectedDispute, selectedDispute.status as "open" | "under_review" | "resolved" | "closed", true)
                      }
                    >
                      Assign to me
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      disabled={updatingId === selectedDispute.id}
                      onClick={() => handleUpdateDispute(selectedDispute, "under_review", true)}
                    >
                      Start review
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      disabled={updatingId === selectedDispute.id}
                      onClick={() => handleUpdateDispute(selectedDispute, "resolved")}
                    >
                      Resolve
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      disabled={
                        updatingId === selectedDispute.id ||
                        selectedDispute.paymentStatus === "REFUNDED"
                      }
                      onClick={() =>
                        handleUpdateDispute(selectedDispute, "resolved", true, "full")
                      }
                    >
                      Issue full refund
                    </ActionButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
