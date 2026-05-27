"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { actionButtonVariants } from "@/components/admin/ActionButton";
import AdminCard from "@/components/admin/AdminCard";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminShell from "@/components/admin/AdminShell";
import AdminStatGrid from "@/components/admin/AdminStatGrid";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { AdminListingRecord } from "@/types/platform";
import type { ExplorerDestinationSummary } from "@/lib/destination-explorer";
import { listingRequiresDestination } from "@/lib/listing-destination-rules";
import { CalendarDays, Eye, MapPinned, Pencil, ShieldAlert, ShoppingBag } from "lucide-react";

const categoryOptions = [
  "Accommodation",
  "Experience",
  "Shopping Product",
  "Transport",
  "Dining",
];

function listingTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "pending_review") return "pending" as const;
  if (status === "paused") return "warning" as const;
  if (status === "archived") return "neutral" as const;
  return "neutral" as const;
}

export default function AdminListingsPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminListingsContent />
    </ProtectedRoute>
  );
}

function AdminListingsContent() {
  const [listings, setListings] = useState<AdminListingRecord[]>([]);
  const [destinations, setDestinations] = useState<ExplorerDestinationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [showMissingDestinations, setShowMissingDestinations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    const loadListings = async () => {
      try {
        const [payload, destinationPayload] = await Promise.all([
          apiFetch<{ listings: AdminListingRecord[] }>("/api/admin/listings"),
          apiFetch<{ destinations: ExplorerDestinationSummary[] }>("/api/destinations"),
        ]);
        setListings(payload.listings);
        setDestinations(destinationPayload.destinations);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load listings.");
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, []);

  const filteredListings = useMemo(() => {
    const normalized = query.toLowerCase();
    return listings.filter((listing) =>
      [
        listing.title,
        listing.slug,
        listing.category,
        listing.location,
        listing.destinationName || "",
        listing.destinationLocation || "",
        listing.provider.companyName,
        listing.provider.onboardingStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized) &&
      (!showMissingDestinations ||
        (listing.requiresDestination && !listing.hasDestinationAssignment))
    );
  }, [listings, query, showMissingDestinations]);

  const statusCounts = useMemo(
    () => ({
      total: listings.length,
      active: listings.filter((listing) => listing.status === "active").length,
      pending: listings.filter((listing) => listing.status === "pending_review").length,
      flagged: listings.filter((listing) => listing.disputesCount > 0).length,
      missingDestination: listings.filter(
        (listing) => listing.requiresDestination && !listing.hasDestinationAssignment
      ).length,
      missingAvailability: listings.filter(
        (listing) => listing.bookingMode === "instant" && listing.availabilityCount === 0
      ).length,
    }),
    [listings]
  );

  type ListingPatch = Partial<
    Pick<AdminListingRecord, "status" | "visibility" | "category">
  > & {
    metadata?: Record<string, unknown>;
  };

  const updateListing = async (
    listingId: string,
    patch: ListingPatch
  ) => {
    setUpdatingId(listingId);
    try {
      const payload = await apiFetch<{ listing: AdminListingRecord }>(
        `/api/admin/listings/${listingId}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        }
      );
      setListings((current) =>
        current.map((item) => (item.id === payload.listing.id ? payload.listing : item))
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update listing.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <AdminShell
      activePath="/admin/listings"
      title="Listings"
      description="Moderate marketplace inventory, adjust visibility, and keep provider listings in the correct category."
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <AdminStatGrid>
        <AdminCard label="Total listings" value={loading ? "—" : statusCounts.total} icon={ShoppingBag} />
        <AdminCard
          label="Published"
          value={loading ? "—" : statusCounts.active}
          icon={Eye}
          tone="success"
        />
        <AdminCard
          label="Pending review"
          value={loading ? "—" : statusCounts.pending}
          icon={Pencil}
          tone="warning"
        />
        <AdminCard
          label="Flagged"
          value={loading ? "—" : statusCounts.flagged}
          icon={ShieldAlert}
          tone="danger"
        />
        <AdminCard
          label="Missing destination"
          value={loading ? "—" : statusCounts.missingDestination}
          icon={MapPinned}
          tone="warning"
        />
        <AdminCard
          label="Instant without slots"
          value={loading ? "—" : statusCounts.missingAvailability}
          icon={CalendarDays}
          tone="warning"
        />
      </AdminStatGrid>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
        <div className="px-6 pt-5">
          <AdminSectionHeader
            title="Listings moderation"
            description="Search listings and update status, visibility, and category."
          />
        </div>
        <div className="grid gap-3 px-6 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search listing name, provider, category, destination, or location"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white dark:placeholder:text-white/25"
          />
          <label className="inline-flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white/75">
            <input
              type="checkbox"
              checked={showMissingDestinations}
              onChange={(event) => setShowMissingDestinations(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-slate-900"
            />
            Missing destination only
          </label>
        </div>
        <div className="px-6 pb-6">
          <AdminTable
            columns={[
              {
                key: "listing",
                header: "Listing name",
                cell: (listing: AdminListingRecord) => (
                  <div>
                    <div className="font-medium text-slate-950 dark:text-white">
                      {listing.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                      {listing.destinationName || listing.location} • {listing.slug}
                    </div>
                    {listing.requiresDestination && !listing.hasDestinationAssignment ? (
                      <div className="mt-2">
                        <StatusBadge tone="warning">Destination needed</StatusBadge>
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "provider",
                header: "Provider",
                cell: (listing: AdminListingRecord) => listing.provider.companyName,
              },
              {
                key: "category",
                header: "Category",
                cell: (listing: AdminListingRecord) => (
                  <div className="space-y-2">
                    <div>{listing.category}</div>
                    {listing.destinationName ? (
                      <StatusBadge tone="info">{listing.destinationName}</StatusBadge>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (listing: AdminListingRecord) => (
                  <div className="space-y-2">
                    <StatusBadge tone={listingTone(listing.status)}>{listing.status}</StatusBadge>
                    {listing.bookingMode === "instant" && listing.availabilityCount === 0 ? (
                      <StatusBadge tone="warning">No slots</StatusBadge>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "availability",
                header: "Availability",
                cell: (listing: AdminListingRecord) => (
                  <div>
                    <div className="font-medium text-slate-950 dark:text-white">
                      {listing.availabilityCount}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                      {listing.capacity ? `Capacity ${listing.capacity}` : "No default capacity"}
                    </div>
                  </div>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                cell: (listing: AdminListingRecord) => (
                  <div className="grid gap-2 lg:min-w-[280px]">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/marketplace/${listing.slug}`}
                        className={cn(actionButtonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        View
                      </a>
                      <select
                        value={listing.category}
                        disabled={updatingId === listing.id}
                        onChange={(event) =>
                          updateListing(listing.id, { category: event.target.value })
                        }
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
                      >
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {listingRequiresDestination(listing.category) ? (
                        <select
                          value={listing.destinationId ?? ""}
                          disabled={updatingId === listing.id}
                          onChange={(event) => {
                            const destination = destinations.find(
                              (item) => item.id === event.target.value
                            );
                            updateListing(listing.id, {
                              metadata: destination
                                ? {
                                    destinationId: destination.id,
                                    destinationName: destination.name,
                                    destinationLocation: destination.location,
                                  }
                                : {},
                            });
                          }}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
                        >
                          <option value="">Assign destination</option>
                          {destinations.map((destination) => (
                            <option key={destination.id} value={destination.id}>
                              {destination.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={listing.status}
                        disabled={updatingId === listing.id}
                        onChange={(event) =>
                          updateListing(listing.id, {
                            status: event.target.value as AdminListingRecord["status"],
                          })
                        }
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending_review">Pending review</option>
                        <option value="active">Published</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Removed</option>
                      </select>
                      <button
                        type="button"
                        disabled={updatingId === listing.id}
                        onClick={() =>
                          updateListing(listing.id, {
                            visibility: listing.visibility === "public" ? "private" : "public",
                          })
                        }
                        className={cn(actionButtonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        {listing.visibility === "public" ? "Make private" : "Publish"}
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === listing.id}
                        onClick={() => updateListing(listing.id, { status: "archived" })}
                        className={cn(actionButtonVariants({ variant: "danger", size: "sm" }))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ),
              },
            ]}
            rows={filteredListings}
            rowKey={(listing) => listing.id}
            emptyState="No listings match the current search."
          />
        </div>
      </section>
    </AdminShell>
  );
}
