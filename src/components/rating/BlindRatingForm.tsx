"use client";

import { useEffect, useState } from "react";
import { Lock, Star, CheckCircle2, Eye, EyeOff, Clock, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/client-api";

interface RatingData {
  bookingId: string;
  status: string;
  revealed: boolean;
  revealAt: string | null;
  explorerRated: { submitted: boolean; rating: number | null; note: string | null };
  providerRated: { submitted: boolean; rating: number | null; note: string | null };
}

interface BlindRatingFormProps {
  bookingId: string;
  /** "explorer" = the logged-in user is the explorer rating the provider
   *  "provider" = the logged-in user is the provider rating the explorer */
  perspective: "explorer" | "provider";
  targetName: string;
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition disabled:cursor-default"
        >
          <Star
            className={`h-7 w-7 transition ${
              star <= (hovered || value)
                ? "fill-[#fbbf24] text-[#fbbf24]"
                : "text-white/20"
            }`}
          />
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="ml-2 self-center text-sm text-white/50">
          {STAR_LABELS[hovered || value]}
        </span>
      )}
    </div>
  );
}

export default function BlindRatingForm({
  bookingId,
  perspective,
  targetName,
}: BlindRatingFormProps) {
  const [data, setData] = useState<RatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function loadRatings() {
    setLoading(true);
    try {
      const d = await apiFetch<RatingData>(`/api/bookings/${bookingId}/ratings`);
      setData(d);
    } catch {
      // Non-critical if ratings endpoint not yet available
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setError("");
    setSubmitting(true);
    try {
      const endpoint =
        perspective === "explorer"
          ? `/api/bookings/${bookingId}/rate-provider`
          : `/api/bookings/${bookingId}/rate-explorer`;

      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ rating, note: note.trim() || undefined }),
      });
      setSubmitted(true);
      await loadRatings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit rating.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="theme-panel animate-pulse rounded-[20px] p-6 h-36" />
    );
  }

  const myRating = perspective === "explorer" ? data?.explorerRated : data?.providerRated;
  const theirRating = perspective === "explorer" ? data?.providerRated : data?.explorerRated;
  const alreadySubmitted = myRating?.submitted ?? false;
  const revealed = data?.revealed ?? false;

  // ── After reveal: show both sides ──────────────────────────────────────────
  if (revealed && alreadySubmitted) {
    return (
      <div className="theme-panel rounded-[20px] p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#4ade80]" />
          <h3 className="text-sm font-semibold text-white/80">Ratings revealed</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* My rating */}
          <div className="rounded-[14px] border border-white/8 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs text-white/35">
              {perspective === "explorer" ? "Your rating of the provider" : "Your rating of the explorer"}
            </p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${s <= (myRating?.rating ?? 0) ? "fill-[#fbbf24] text-[#fbbf24]" : "text-white/15"}`}
                />
              ))}
            </div>
            {myRating?.note && (
              <p className="mt-2 text-sm text-white/55 italic">
                &quot;{myRating.note}&quot;
              </p>
            )}
          </div>

          {/* Their rating */}
          <div className="rounded-[14px] border border-white/8 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs text-white/35">
              {perspective === "explorer"
                ? `${targetName}'s rating of you`
                : `Explorer's rating of ${targetName}`}
            </p>
            {theirRating?.submitted && theirRating.rating ? (
              <>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-5 w-5 ${s <= theirRating.rating! ? "fill-[#fbbf24] text-[#fbbf24]" : "text-white/15"}`}
                    />
                  ))}
                </div>
                {theirRating.note && (
                  <p className="mt-2 text-sm text-white/55 italic">
                    &quot;{theirRating.note}&quot;
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-white/30">No rating submitted.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Already submitted, waiting for reveal ──────────────────────────────────
  if (alreadySubmitted || submitted) {
    const revealDate = data?.revealAt
      ? new Date(data.revealAt).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric",
        })
      : null;

    return (
      <div className="theme-panel rounded-[20px] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#4ade80]/10 p-3">
            <Lock className="h-5 w-5 text-[#4ade80]" />
          </div>
          <div>
            <p className="font-semibold text-white/80">Rating submitted</p>
            <p className="mt-1 text-sm text-white/45">
              {theirRating?.submitted
                ? "The other party has also rated. Ratings will be revealed shortly."
                : "Waiting for the other party to submit their rating."}
              {revealDate && !theirRating?.submitted && (
                <span className="mt-1 flex items-center gap-1.5 text-white/30">
                  <Clock className="h-3.5 w-3.5" />
                  Auto-reveal on {revealDate}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Not yet submitted — show form ──────────────────────────────────────────
  return (
    <div className="theme-panel rounded-[20px] p-6">
      {/* Blind system explanation */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
        <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
        <p className="text-xs text-white/40">
          <span className="font-medium text-white/60">Blind rating — </span>
          your rating is hidden until{" "}
          {perspective === "explorer" ? targetName : "the explorer"} also submits, or 7 days pass.
          This prevents retaliatory reviews.
        </p>
      </div>

      <h3 className="mb-4 text-sm font-semibold text-white/80">
        Rate {targetName}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-xs text-white/45">Overall rating</label>
          <StarPicker value={rating} onChange={setRating} disabled={submitting} />
        </div>

        <div>
          <label className="mb-2 block text-xs text-white/45">
            Note{" "}
            <span className="text-white/25">(optional, max 500 chars)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={submitting}
            className="theme-input w-full rounded-xl px-4 py-3 text-sm resize-none disabled:opacity-50"
            placeholder={
              perspective === "explorer"
                ? "How was the service quality, communication, value?"
                : "How was the explorer's punctuality, communication, respect?"
            }
          />
          <p className="mt-1 text-right text-xs text-white/25">{note.length}/500</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-[#ff5630]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5630] py-3 text-sm font-semibold text-white transition hover:bg-[#ff4520] disabled:opacity-50"
        >
          {submitting ? (
            "Submitting…"
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Submit rating
            </>
          )}
        </button>
      </form>
    </div>
  );
}
