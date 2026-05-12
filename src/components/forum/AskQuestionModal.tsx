"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";

interface ForumQuestion {
  id: string;
  title: string;
  body: string;
  tags: string[];
  destinationId: string | null;
  viewCount: number;
  isPinned: boolean;
  answerCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
    isGuide: boolean;
  };
}

interface AskQuestionModalProps {
  onClose: () => void;
  onPosted: (question: ForumQuestion) => void;
  destinationId?: string | null;
  destinationName?: string | null;
}

const TAG_SUGGESTIONS = [
  "accommodation",
  "activities",
  "transport",
  "food",
  "budget",
  "victoria-falls",
  "harare",
  "safari",
  "hiking",
  "culture",
];

export default function AskQuestionModal({
  onClose,
  onPosted,
  destinationId,
  destinationName,
}: AskQuestionModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
    if (normalized && !tags.includes(normalized) && tags.length < 5) {
      setTags((prev) => [...prev, normalized]);
    }
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = await apiFetch<{ question: ForumQuestion }>("/api/forum/questions", {
        method: "POST",
        body: JSON.stringify({ title, body, tags, destinationId: destinationId || undefined }),
      });
      onPosted(payload.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post question.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="theme-panel w-full max-w-xl rounded-[32px] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="theme-heading text-xl font-semibold">Ask the community</h2>
            {destinationName ? (
              <p className="theme-muted mt-1 text-sm">This question will be linked to {destinationName}.</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/50 hover:bg-white/8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="theme-muted mb-1.5 block text-sm">Question title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="theme-input h-12 w-full rounded-2xl px-4 text-sm"
              placeholder="What's the best way to get from Harare to Victoria Falls?"
            />
          </div>
          <div>
            <label className="theme-muted mb-1.5 block text-sm">Details</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="theme-input w-full rounded-2xl px-4 py-3 text-sm resize-none"
              placeholder="Add any context that will help locals give you the best answer..."
            />
          </div>
          <div>
            <label className="theme-muted mb-1.5 block text-sm">Tags (optional, max 5)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs text-white/65"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="text-white/40 hover:text-white/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                    e.preventDefault();
                    addTag(tagInput.trim());
                  }
                }}
                className="theme-input h-10 flex-1 rounded-2xl px-4 text-sm"
                placeholder="Add a tag and press Enter"
                disabled={tags.length >= 5}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TAG_SUGGESTIONS.filter((s) => !tags.includes(s)).slice(0, 6).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  disabled={tags.length >= 5}
                  className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/45 hover:bg-white/8 disabled:opacity-30"
                >
                  +{s}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl bg-[#2d1714] px-4 py-3 text-sm text-[#ff8a78]">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#ff5630] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post question"}
          </button>
        </form>
      </div>
    </div>
  );
}
