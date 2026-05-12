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
import type { AdminUserRecord } from "@/types/platform";
import { BadgeCheck, ShieldAlert, UserCheck, Users } from "lucide-react";

function roleTone(role: string) {
  if (role === "admin") return "danger" as const;
  if (role === "provider") return "info" as const;
  if (role === "guide") return "pending" as const;
  return "neutral" as const;
}

function verificationTone(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "suspended") return "danger" as const;
  return "pending" as const;
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminUsersContent />
    </ProtectedRoute>
  );
}

function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("explorer");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [hasVerifiedBadge, setHasVerifiedBadge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const payload = await apiFetch<{ users: AdminUserRecord[] }>("/api/admin/users");
      setUsers(payload.users);
      setSelectedId((current) => current || payload.users[0]?.id || "");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) || null,
    [users, selectedId]
  );

  useEffect(() => {
    if (!selectedUser) return;
    setRole(selectedUser.role);
    setVerificationStatus(selectedUser.verificationStatus);
    setHasVerifiedBadge(selectedUser.hasVerifiedBadge);
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    const normalized = query.toLowerCase();
    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
        user.verificationStatus,
        user.phone || "",
        user.nationality || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, users]);

  const stats = useMemo(
    () => ({
      total: users.length,
      providers: users.filter((user) => user.role === "provider").length,
      admins: users.filter((user) => user.role === "admin").length,
      verified: users.filter((user) => user.verificationStatus === "verified").length,
    }),
    [users]
  );

  const saveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const payload = await apiFetch<{ user: AdminUserRecord }>("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: selectedUser.id,
          role,
          verificationStatus,
          hasVerifiedBadge,
        }),
      });

      setUsers((current) =>
        current.map((user) => (user.id === payload.user.id ? payload.user : user))
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      activePath="/admin/users"
      title="Users"
      description="Review traveler, provider, guide, and admin accounts from one operational view."
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <AdminStatGrid>
        <AdminCard label="Total users" value={loading ? "-" : stats.total} icon={Users} />
        <AdminCard
          label="Providers"
          value={loading ? "-" : stats.providers}
          icon={UserCheck}
          tone="info"
        />
        <AdminCard
          label="Admins"
          value={loading ? "-" : stats.admins}
          icon={ShieldAlert}
          tone="danger"
        />
        <AdminCard
          label="Verified"
          value={loading ? "-" : stats.verified}
          icon={BadgeCheck}
          tone="success"
        />
      </AdminStatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
          <div className="px-6 pt-5">
            <AdminSectionHeader
              title="User directory"
              description="Search accounts and select one to review access details."
            />
          </div>
          <div className="px-6 py-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, role, status, or country"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white dark:placeholder:text-white/25"
            />
          </div>
          <div className="px-6 pb-6">
            <AdminTable
              columns={[
                {
                  key: "user",
                  header: "User",
                  cell: (user: AdminUserRecord) => (
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(user.id)}
                        className="font-medium text-slate-950 hover:text-[#ff5630] dark:text-white"
                      >
                        {user.name}
                      </button>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/45">
                        {user.email}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  cell: (user: AdminUserRecord) => (
                    <StatusBadge tone={roleTone(user.role)}>{user.role}</StatusBadge>
                  ),
                },
                {
                  key: "status",
                  header: "Verification",
                  cell: (user: AdminUserRecord) => (
                    <StatusBadge tone={verificationTone(user.verificationStatus)}>
                      {user.verificationStatus}
                    </StatusBadge>
                  ),
                },
                {
                  key: "activity",
                  header: "Activity",
                  cell: (user: AdminUserRecord) =>
                    `${user.bookingCount} bookings, ${user.disputeCount} disputes`,
                },
                {
                  key: "actions",
                  header: "Actions",
                  cell: (user: AdminUserRecord) => (
                    <button
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className={cn(actionButtonVariants({ variant: "secondary", size: "sm" }))}
                    >
                      View
                    </button>
                  ),
                },
              ]}
              rows={filteredUsers}
              rowKey={(user) => user.id}
              emptyState="No users match the current search."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010]">
          <AdminSectionHeader
            title="Account controls"
            description="Update access level and verification state."
          />
          <div className="mt-4">
            {!selectedUser ? (
              <AdminEmptyState
                title="No user selected"
                body="Select a user from the directory to manage account controls."
              />
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-white">
                    {selectedUser.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-white/45">
                    {selectedUser.email}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Joined" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
                  <Info label="Email verified" value={selectedUser.emailVerified ? "Yes" : "No"} />
                  <Info label="Provider profiles" value={String(selectedUser.providerCompanyCount)} />
                  <Info label="Nationality" value={selectedUser.nationality || "Not provided"} />
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-white/80">
                      Role
                    </span>
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
                    >
                      <option value="explorer">Explorer</option>
                      <option value="provider">Provider</option>
                      <option value="guide">Guide</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-white/80">
                      Verification status
                    </span>
                    <select
                      value={verificationStatus}
                      onChange={(event) => setVerificationStatus(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0b0b0b] dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-white/80">
                    <input
                      type="checkbox"
                      checked={hasVerifiedBadge}
                      onChange={(event) => setHasVerifiedBadge(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#ff5630]"
                    />
                    Show verified badge
                  </label>

                  <ActionButton variant="primary" onClick={saveUser} disabled={saving}>
                    {saving ? "Saving..." : "Save account changes"}
                  </ActionButton>
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
