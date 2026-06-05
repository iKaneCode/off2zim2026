"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminShell from "@/components/admin/AdminShell";
import { useSoftRefresh } from "@/hooks/useSoftRefresh";
import { apiFetch } from "@/lib/client-api";
import type { AdminActivityLogRecord } from "@/types/platform";

type ActivityFilter =
  | "all"
  | "signups"
  | "approvals"
  | "edits"
  | "deletes"
  | "uploads"
  | "admin"
  | "provider";

const filterOptions: Array<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "all activity" },
  { value: "signups", label: "signups" },
  { value: "approvals", label: "approvals / reviews" },
  { value: "edits", label: "edits" },
  { value: "deletes", label: "deletes / archives" },
  { value: "uploads", label: "uploads" },
  { value: "admin", label: "admin users" },
  { value: "provider", label: "service-provider super admins" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function formatContext(log: AdminActivityLogRecord) {
  if (!log.company) {
    return "-";
  }

  const serviceProviderId = log.company.serviceProviderId || log.company.id;
  return `${serviceProviderId} ${log.company.companyName}`;
}

function formatRole(value: string) {
  if (value === "provider") return "Super admin";
  if (value === "admin") return "Off2Zim admin";
  return value.replace(/_/g, " ");
}

function formatDetails(log: AdminActivityLogRecord) {
  const metadata = log.metadata ?? {};
  const displayId =
    readActivityString(metadata.listingDisplayId) ||
    readActivityString(metadata.targetDisplayId) ||
    log.targetDisplayId ||
    "";
  const title =
    readActivityString(metadata.title) ||
    readActivityString(metadata.listingTitle);
  const fields = Array.isArray(metadata.updatedFields)
    ? metadata.updatedFields
        .filter((field): field is string => typeof field === "string")
        .map(formatActivityField)
        .filter(Boolean)
    : [];

  switch (log.action) {
    case "user_signed_up":
      return "Created a new account.";
    case "provider_logged_in":
      return "Signed in.";
    case "provider_logged_out":
      return "Signed out.";
    case "provider_profile_updated":
      return fields.length > 0
        ? `Updated profile details: ${fields.join(", ")}.`
        : "Updated profile details.";
    case "provider_profile_image_updated":
      return "Updated profile picture.";
    case "provider_cover_image_updated":
      return "Updated cover image.";
    case "provider_operating_time_enabled":
      return "Enabled operating time.";
    case "provider_operating_time_disabled":
      return "Disabled operating time.";
    case "provider_operating_time_updated":
      return "Updated operating time.";
    case "provider_gallery_enabled":
      return "Enabled listing gallery.";
    case "provider_gallery_disabled":
      return "Disabled listing gallery.";
    case "provider_premium_upgrade_requested":
      return "Requested upgrade to Premium.";
    case "provider_payout_method_updated":
      return "Updated payout method.";
    case "provider_listing_created":
      return `Created listing ${displayId || title || ""}`.trim() + ".";
    case "provider_listing_updated":
      return fields.length > 0
        ? `Updated listing ${displayId || title || ""}: ${fields.join(", ")}.`
        : `Updated listing ${displayId || title || ""}.`;
    case "provider_listing_deleted":
      return `Deleted listing ${displayId || title || ""}`.trim() + ".";
    case "listing_updated":
      return `Reviewed listing ${displayId || title || ""}`.trim() + ".";
    case "provider_media_uploaded":
      return `Uploaded gallery image for ${displayId || "a listing"} for Off2Zim review.`;
    case "provider_media_reviewed":
      return `Reviewed gallery image for ${displayId || "a listing"}.`;
    case "provider_review_updated":
      return `Reviewed service provider profile${
        readActivityString(metadata.status)
          ? `: ${formatActivityField(readActivityString(metadata.status))}`
          : ""
      }.`;
    case "provider_section_reviewed":
      return `${formatActivityField(
        readActivityString(metadata.section) || "Provider section",
      )} was ${formatActivityField(
        readActivityString(metadata.decision) || "reviewed",
      )}.`;
    case "admin_message_sent":
      return `Sent a message to ${
        readActivityString(metadata.participantEmail) || "a platform user"
      }.`;
    case "provider_message_sent":
      return "Sent a message to Off2Zim.";
    default:
      return sanitizeSummary(log.summary);
  }
}

function readActivityString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatActivityField(value: string) {
  const clean = value
    .replace(/^__off2zim_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return clean
    ? clean
        .split(" ")
        .filter(Boolean)
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(" ")
    : "";
}

function sanitizeSummary(value: string) {
  const clean = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean
    ? `${clean.charAt(0).toUpperCase()}${clean.slice(1)}`
    : "Activity recorded.";
}

function matchesFilter(log: AdminActivityLogRecord, filter: ActivityFilter) {
  const action = log.action.toLowerCase();

  if (filter === "all") return true;
  if (filter === "admin") return log.actor.role === "admin";
  if (filter === "provider") return log.actor.role === "provider";
  if (filter === "signups") return action.includes("sign");
  if (filter === "approvals") {
    return (
      action.includes("approve") ||
      action.includes("review") ||
      action.includes("verified")
    );
  }
  if (filter === "edits") {
    return action.includes("update") || action.includes("edit");
  }
  if (filter === "deletes") {
    return (
      action.includes("delete") ||
      action.includes("archive") ||
      action.includes("remove")
    );
  }
  if (filter === "uploads") {
    return action.includes("upload") || action.includes("media");
  }

  return true;
}

export default function AdminActivityLogPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminActivityLogContent />
    </ProtectedRoute>
  );
}

function AdminActivityLogContent() {
  const [logs, setLogs] = useState<AdminActivityLogRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const payload = await apiFetch<{ logs: AdminActivityLogRecord[] }>(
        "/api/admin/activity-log?take=500",
      );
      setLogs(payload.logs);
      setError("");
    } catch (err) {
      if (!quiet) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the activity log.",
        );
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);
  useSoftRefresh(() => loadLogs(true));

  const filteredLogs = useMemo(() => {
    const normalized = query.toLowerCase();

    return logs.filter((log) => {
      const searchable = [
        log.createdAt,
        log.action,
        log.summary,
        log.targetType,
        log.targetId,
        log.targetDisplayId || "",
        log.actor.name,
        log.actor.email,
        log.actor.role,
        formatContext(log),
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter(log, filter) && searchable.includes(normalized);
    });
  }, [filter, logs, query]);

  return (
    <AdminShell
      activePath="/admin/activity-log"
      title={<span className="font-mono">Activity Log</span>}
      description={
        <span className="font-mono">
          Append-only audit trail for Off2Zim admin and service-provider
          operations.
        </span>
      }
    >
      <section className="overflow-hidden rounded-lg border border-slate-300 bg-white font-mono text-slate-900 dark:border-white/15 dark:bg-[#0b0b0b] dark:text-white">
        <div className="flex flex-col gap-3 border-b border-slate-300 px-4 py-4 dark:border-white/15 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
              platform activity
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/45">
              signups, approvals, edits, deletes, uploads, reviews, and provider
              changes
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="search"
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white/15 dark:bg-[#050505] dark:focus:border-white sm:w-72"
            />
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as ActivityFilter)
              }
              className="h-9 rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white/15 dark:bg-[#050505] dark:focus:border-white"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadLogs()}
              disabled={loading}
              className="h-9 rounded border border-slate-300 px-3 text-xs uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/[0.04]"
            >
              refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-collapse text-left text-xs">
            <thead className="border-b border-slate-300 bg-slate-100 text-slate-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-white/40">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.14em]">
                  timestamp
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.14em]">
                  user
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.14em]">
                  name
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.14em]">
                  email
                </th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.14em]">
                  details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    loading...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    no matching activity.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="align-top hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-white/60">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-white/60">
                      {formatRole(log.actor.role)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {log.actor.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-white/60">
                      {log.actor.email}
                    </td>
                    <td className="min-w-[300px] px-4 py-3">
                      {formatDetails(log)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
