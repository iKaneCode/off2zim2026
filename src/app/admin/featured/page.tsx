"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ActionButton from "@/components/admin/ActionButton";
import AdminCard from "@/components/admin/AdminCard";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminShell from "@/components/admin/AdminShell";
import AdminStatGrid from "@/components/admin/AdminStatGrid";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/client-api";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Zap,
} from "lucide-react";

type Pathway = "sponsored" | "top_rated" | "editors_choice";

interface FeaturedEntry {
  id: string;
  pathway: Pathway;
  justification: string | null;
  sortOrder: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    category: string;
    location: string;
    status: string;
    company: {
      id: string;
      companyName: string;
      isVerified: boolean;
      isFeaturedEligible: boolean;
    };
  };
}

interface PromotedListing {
  listingId: string;
  title: string;
  companyName: string;
  completedBookings: number;
  avgRating: number;
  score: number;
  featuredEntryId?: string;
}

const pathwayMeta: Record<
  Pathway,
  { label: string; tone: "info" | "success" | "warning" }
> = {
  sponsored: { label: "Sponsored", tone: "info" },
  top_rated: { label: "Top rated", tone: "success" },
  editors_choice: { label: "Editor choice", tone: "warning" },
};

function pathwayTone(pathway: Pathway) {
  return pathwayMeta[pathway].tone;
}

function pathwayLabel(pathway: Pathway) {
  return pathwayMeta[pathway].label;
}

function AddEntryPanel({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [listingId, setListingId] = useState("");
  const [pathway, setPathway] = useState<Pathway>("sponsored");
  const [justification, setJustification] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setListingId("");
    setPathway("sponsored");
    setJustification("");
    setStartDate("");
    setEndDate("");
    setSortOrder(0);
    setError("");
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listingId.trim() || !startDate || !endDate) {
      setError("Listing ID, start date, and end date are required.");
      return;
    }
    if (pathway === "editors_choice" && !justification.trim()) {
      setError("Add a reason for editor choice placements.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/admin/featured", {
        method: "POST",
        body: JSON.stringify({
          listingId: listingId.trim(),
          pathway,
          justification: justification.trim() || undefined,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          sortOrder,
        }),
      });
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
      <div className="px-6 py-5">
        <AdminSectionHeader
          title="Add featured entry"
          description="Pin a listing into sponsored, top rated, or editor choice placements."
          action={
            <ActionButton
              type="button"
              variant={open ? "secondary" : "primary"}
              onClick={() => {
                setOpen((current) => !current);
                if (open) reset();
              }}
            >
              <Plus className="h-4 w-4" />
              {open ? "Close form" : "New entry"}
            </ActionButton>
          }
        />
      </div>

      {open ? (
        <form onSubmit={submit} className="grid gap-4 border-t border-slate-200 px-6 py-6 dark:border-white/10 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
              Listing ID
            </span>
            <input
              value={listingId}
              onChange={(event) => setListingId(event.target.value)}
              placeholder="Paste the listing ID"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white dark:placeholder:text-white/25"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
              Placement type
            </span>
            <select
              value={pathway}
              onChange={(event) => setPathway(event.target.value as Pathway)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
            >
              <option value="sponsored">Sponsored</option>
              <option value="top_rated">Top rated</option>
              <option value="editors_choice">Editor choice</option>
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
              Sort order
            </span>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(event) => setSortOrder(parseInt(event.target.value, 10) || 0)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
              Start date
            </span>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
              End date
            </span>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
            />
          </label>

          {pathway === "editors_choice" ? (
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
                Reason
              </span>
              <textarea
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                rows={3}
                placeholder="Explain why this listing should be highlighted."
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white dark:placeholder:text-white/25"
              />
            </label>
          ) : null}

          {error ? (
            <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="sm:col-span-2 flex flex-wrap justify-end gap-3">
            <ActionButton type="button" variant="secondary" onClick={() => {
              reset();
              setOpen(false);
            }}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Create entry"}
            </ActionButton>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function AutoQualifyPanel({ onDone }: { onDone: () => void }) {
  const [topN, setTopN] = useState(10);
  const [windowDays, setWindowDays] = useState(30);
  const [minBookings, setMinBookings] = useState(3);
  const [minRating, setMinRating] = useState(4);
  const [replace, setReplace] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    promoted: PromotedListing[];
    skipped: number;
    message: string;
  } | null>(null);

  async function run() {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const data = await apiFetch<{
        promoted: PromotedListing[];
        skipped: number;
        message: string;
      }>("/api/admin/featured/auto-qualify", {
        method: "POST",
        body: JSON.stringify({ topN, windowDays, minBookings, minRating, replace }),
      });
      setResult(data);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-qualify failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
      <div className="px-6 py-5">
        <AdminSectionHeader
          title="Auto-qualify top rated listings"
          description="Score eligible listings by rating and booking volume, then promote the highest ranked results."
          action={
            <ActionButton type="button" variant="primary" onClick={run} disabled={running}>
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {running ? "Running..." : "Run auto-qualify"}
            </ActionButton>
          }
        />
      </div>

      <div className="grid gap-4 border-t border-slate-200 px-6 py-6 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
            Top listings
          </span>
          <input
            type="number"
            min={1}
            max={50}
            value={topN}
            onChange={(event) => setTopN(parseInt(event.target.value, 10) || 10)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
            Window (days)
          </span>
          <input
            type="number"
            min={1}
            max={365}
            value={windowDays}
            onChange={(event) => setWindowDays(parseInt(event.target.value, 10) || 30)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
            Min bookings
          </span>
          <input
            type="number"
            min={0}
            value={minBookings}
            onChange={(event) => setMinBookings(parseInt(event.target.value, 10) || 0)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
            Min rating
          </span>
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={minRating}
            onChange={(event) => setMinRating(parseFloat(event.target.value) || 4)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
          />
        </label>

        <label className="sm:col-span-2 xl:col-span-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
          <input
            type="checkbox"
            checked={replace}
            onChange={(event) => setReplace(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-slate-900"
          />
          Deactivate existing top rated entries before promoting new ones
        </label>
      </div>

      {error ? (
        <div className="border-t border-slate-200 px-6 py-4 text-sm text-rose-700 dark:border-white/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="border-t border-slate-200 px-6 py-6 dark:border-white/10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StatusBadge tone="success">{result.message}</StatusBadge>
            <span className="text-sm text-slate-500 dark:text-white/45">
              Promoted {result.promoted.length} listing{result.promoted.length === 1 ? "" : "s"}.
              Skipped {result.skipped}.
            </span>
          </div>
          <AdminTable
            rows={result.promoted}
            rowKey={(row) => row.listingId}
            columns={[
              {
                key: "listing",
                header: "Listing",
                cell: (row: PromotedListing) => (
                  <div>
                    <div className="font-medium text-slate-950 dark:text-white">{row.title}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                      {row.companyName}
                    </div>
                  </div>
                ),
              },
              {
                key: "bookings",
                header: "Bookings",
                cell: (row: PromotedListing) => row.completedBookings,
              },
              {
                key: "rating",
                header: "Avg rating",
                cell: (row: PromotedListing) => row.avgRating.toFixed(2),
              },
              {
                key: "score",
                header: "Score",
                cell: (row: PromotedListing) => row.score.toFixed(1),
              },
            ]}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function AdminFeaturedPage() {
  const [entries, setEntries] = useState<FeaturedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [togglingId, setTogglingId] = useState("");

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await apiFetch<{ entries: FeaturedEntry[] }>(
        `/api/admin/featured?active=${showAll ? "false" : "true"}`
      );
      setEntries(data.entries);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load featured entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  async function toggleActive(entry: FeaturedEntry) {
    setTogglingId(entry.id);
    try {
      await apiFetch(`/api/admin/featured/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !entry.isActive }),
      });
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update entry.");
    } finally {
      setTogglingId("");
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Remove this featured entry?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/featured/${id}`, { method: "DELETE" });
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete entry.");
    } finally {
      setDeletingId("");
    }
  }

  const stats = useMemo(
    () => ({
      total: entries.length,
      active: entries.filter((entry) => entry.isActive).length,
      sponsored: entries.filter((entry) => entry.pathway === "sponsored").length,
      expiringSoon: entries.filter((entry) => {
        const end = new Date(entry.endDate).getTime();
        const now = Date.now();
        const sevenDays = 1000 * 60 * 60 * 24 * 7;
        return entry.isActive && end - now <= sevenDays && end >= now;
      }).length,
    }),
    [entries]
  );

  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminShell
        activePath="/admin/featured"
        title="Featured placements"
        description="Manage sponsored placements, top rated slots, and editor choice entries."
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <AdminStatGrid>
          <AdminCard label="Total placements" value={loading ? "—" : stats.total} icon={Star} />
          <AdminCard
            label="Active now"
            value={loading ? "—" : stats.active}
            icon={CheckCircle2}
            tone="success"
          />
          <AdminCard
            label="Sponsored entries"
            value={loading ? "—" : stats.sponsored}
            icon={Sparkles}
            tone="info"
          />
          <AdminCard
            label="Expiring in 7 days"
            value={loading ? "—" : stats.expiringSoon}
            icon={AlertTriangle}
            tone="warning"
          />
        </AdminStatGrid>

        <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
          <div className="px-6 py-5">
            <AdminSectionHeader
              title="Placement queue"
              description="Review all featured entries, activation windows, and pathway assignments."
              action={
                <label className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
                  <input
                    type="checkbox"
                    checked={showAll}
                    onChange={(event) => setShowAll(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                  />
                  Show inactive and expired
                </label>
              }
            />
          </div>
          <div className="px-6 pb-6">
            <AdminTable
              rows={entries}
              rowKey={(row) => row.id}
              emptyState={
                loading ? (
                  "Loading featured entries..."
                ) : (
                  <AdminEmptyState
                    title="No featured entries"
                    body="Create a placement or run auto-qualify to populate this queue."
                  />
                )
              }
              columns={[
                {
                  key: "listing",
                  header: "Listing",
                  cell: (entry: FeaturedEntry) => (
                    <div>
                      <div className="font-medium text-slate-950 dark:text-white">
                        {entry.listing.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                        {entry.listing.company.companyName} · {entry.listing.location}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "pathway",
                  header: "Pathway",
                  cell: (entry: FeaturedEntry) => (
                    <StatusBadge tone={pathwayTone(entry.pathway)}>
                      {pathwayLabel(entry.pathway)}
                    </StatusBadge>
                  ),
                },
                {
                  key: "window",
                  header: "Active window",
                  cell: (entry: FeaturedEntry) => (
                    <div className="text-sm">
                      <div>{new Date(entry.startDate).toLocaleDateString()}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                        to {new Date(entry.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "sort",
                  header: "Priority",
                  cell: (entry: FeaturedEntry) => entry.sortOrder,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (entry: FeaturedEntry) => (
                    <div className="space-y-2">
                      <StatusBadge tone={entry.isActive ? "success" : "neutral"}>
                        {entry.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                      {entry.justification ? (
                        <div className="max-w-xs text-xs text-slate-500 dark:text-white/45">
                          {entry.justification}
                        </div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  cell: (entry: FeaturedEntry) => (
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={togglingId === entry.id}
                        onClick={() => toggleActive(entry)}
                      >
                        {togglingId === entry.id
                          ? "Updating..."
                          : entry.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </ActionButton>
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={deletingId === entry.id}
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === entry.id ? "Removing..." : "Remove"}
                      </ActionButton>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <AddEntryPanel onCreated={loadEntries} />
          <AutoQualifyPanel onDone={loadEntries} />
        </div>
      </AdminShell>
    </ProtectedRoute>
  );
}
