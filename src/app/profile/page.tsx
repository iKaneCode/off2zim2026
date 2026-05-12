"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ExplorerScoreBadge from "@/components/ui/ExplorerScoreBadge";
import { apiFetch } from "@/lib/client-api";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  Save,
  Trash2,
  User,
} from "lucide-react";

interface MobileProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  nationality: string | null;
  avatar_url: string | null;
  user_type: string;
  gender: string | null;
  date_of_birth: string | null;
  rating: number;
}

// ─── Avatar upload ─────────────────────────────────────────────────────────────

function AvatarUpload({
  avatarUrl,
  name,
  onUploaded,
}: {
  avatarUrl: string | null;
  name: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiFetch<{ url: string }>("/api/uploads/avatar", {
        method: "POST",
        body: formData,
      });
      onUploaded(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 transition hover:border-white/25 disabled:opacity-60"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#1a1f2e] text-2xl font-bold text-white/60">
            {initials || <User className="h-8 w-8" />}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-[#ff5630]">{error}</p>}
      <p className="text-xs text-white/30">Click to change photo · max 5 MB</p>
    </div>
  );
}

// ─── Delete account confirmation ───────────────────────────────────────────────

function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (confirm !== "DELETE") {
      setError('Type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await apiFetch("/api/profile", { method: "DELETE" });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete account.");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-[#ff5630]/20 bg-[#2d1714]/50 p-6">
      <h3 className="font-semibold text-[#ff5630]">Danger zone</h3>
      <p className="mt-1 text-sm text-white/45">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 flex items-center gap-2 rounded-full border border-[#ff5630]/30 px-4 py-2 text-sm font-medium text-[#ff5630] transition hover:bg-[#ff5630]/10"
        >
          <Trash2 className="h-4 w-4" />
          Delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-white/50">
            Type <span className="font-mono font-bold text-white/80">DELETE</span> to confirm:
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 font-mono text-sm text-white"
          />
          {error && <p className="text-sm text-[#ff5630]">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setOpen(false); setConfirm(""); setError(""); }}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/50 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-full bg-[#ff5630] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [explorerScore, setExplorerScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const profileChecks = [
    { label: "Full name", done: !!fullName.trim() },
    { label: "Phone", done: !!phone.trim() },
    { label: "Nationality", done: !!nationality.trim() },
    { label: "Gender", done: !!gender.trim() },
    { label: "Date of birth", done: !!dob.trim() },
    { label: "Profile photo", done: !!avatarUrl },
  ];
  const completedChecks = profileChecks.filter((item) => item.done).length;
  const completionPercent = Math.round((completedChecks / profileChecks.length) * 100);

  useEffect(() => {
    Promise.all([
      apiFetch<{ profile: MobileProfile }>("/api/profile"),
      apiFetch<{ profile: { explorerScore: string | null } }>("/api/profile"),
    ])
      .then(([data]) => {
        const p = data.profile;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setNationality(p.nationality ?? "");
        setGender(p.gender ?? "");
        setDob(p.date_of_birth ?? "");
        setAvatarUrl(p.avatar_url);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load profile.")
      )
      .finally(() => setLoading(false));

    // Also fetch raw score for the badge
    apiFetch<{ user: { explorerScore: string | null } }>("/api/profile/score")
      .then((d) => setExplorerScore(d.user.explorerScore))
      .catch(() => {/* non-critical */});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const data = await apiFetch<{ profile: MobileProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          nationality: nationality || null,
          gender: gender || null,
          date_of_birth: dob || null,
          avatar_url: avatarUrl,
        }),
      });
      setProfile(data.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="theme-page">
          <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[24px] bg-white/[0.04] h-32" />
            ))}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="theme-page">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="theme-heading text-2xl font-bold">My profile</h1>
            <p className="theme-muted mt-1 text-sm">
              Manage your personal information and account settings.
            </p>
          </div>

          <div className="mb-6 rounded-[24px] border border-white/10 bg-[#111111] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Account readiness</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Keep your explorer account complete so trip planning, booking follow-up, and account recovery stay smooth.
                </p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-3 text-left md:text-right">
                <div className="text-3xl font-semibold text-white">{completionPercent}%</div>
                <div className="mt-1 text-xs text-white/35">Profile complete</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">Email verification</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      user?.isVerified ? "bg-[#0f2a1e] text-[#4ade80]" : "bg-[#2d1714] text-[#ffb09c]"
                    }`}
                  >
                    {user?.isVerified ? "Verified" : "Action needed"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {user?.isVerified
                    ? "Your email is confirmed and ready for secure recovery."
                    : "Verify your email to improve security and make account recovery easier."}
                </p>
                {!user?.isVerified ? (
                  <Link
                    href="/auth/verify-email/request"
                    className="mt-4 inline-flex items-center rounded-full border border-[#ff5630]/25 px-4 py-2 text-sm font-medium text-[#ff7352] transition hover:bg-[#ff5630]/10"
                  >
                    Send verification email
                  </Link>
                ) : null}
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">Profile details</span>
                  <span className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-white/70">
                    {completedChecks}/{profileChecks.length} complete
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profileChecks.map((item) => (
                    <span
                      key={item.label}
                      className={`rounded-full px-3 py-1 text-xs ${
                        item.done ? "bg-[#0f2a1e] text-[#4ade80]" : "bg-white/[0.06] text-white/45"
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-[20px] border border-[#ff5630]/30 bg-[#2d1714] px-4 py-3 text-sm text-[#ffb09c]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Avatar + score */}
            <div className="rounded-[24px] border border-white/10 bg-[#111111] p-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <AvatarUpload
                  avatarUrl={avatarUrl}
                  name={fullName || profile?.email || "?"}
                  onUploaded={(url) => setAvatarUrl(url)}
                />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-semibold text-white">
                    {fullName || profile?.email}
                  </h2>
                  <p className="mt-1 text-sm text-white/40">{profile?.email}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
                    <ExplorerScoreBadge
                      explorerScore={explorerScore}
                      showBreakdown={false}
                    />
                    <span className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/50">
                      {profile?.user_type === "business" ? "Provider" : "Explorer"}
                    </span>
                  </div>
                  {explorerScore && (
                    <div className="mt-3">
                      <ExplorerScoreBadge
                        explorerScore={explorerScore}
                        showBreakdown={true}
                        className="text-left"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit form */}
            <form
              onSubmit={handleSave}
              className="rounded-[24px] border border-white/10 bg-[#111111] p-6 space-y-5"
            >
              <h3 className="font-semibold text-white">Personal information</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full name */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs text-white/40">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Full name
                    </span>
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25"
                  />
                </div>

                {/* Email (read-only) */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs text-white/40">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </span>
                  </label>
                  <input
                    value={profile?.email ?? ""}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm text-white/40"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        user?.isVerified ? "bg-[#0f2a1e] text-[#4ade80]" : "bg-[#2d1714] text-[#ffb09c]"
                      }`}
                    >
                      {user?.isVerified ? "Email verified" : "Email not verified"}
                    </span>
                    {!user?.isVerified ? (
                      <Link
                        href="/auth/verify-email/request"
                        className="text-xs font-medium text-[#ff7352] transition hover:underline"
                      >
                        Resend verification
                      </Link>
                    ) : null}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </span>
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+263 7X XXX XXXX"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25"
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      Nationality
                    </span>
                  </label>
                  <input
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="e.g. Zimbabwean"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date of birth */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">Date of birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saved ? (
                  <span className="flex items-center gap-1.5 text-sm text-[#4ade80]">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff4520] disabled:opacity-50"
                >
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Delete account */}
            <DeleteAccountSection />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
