"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppServiceStrip from "@/components/ui/AppServiceStrip";
import { MessageCircle, Pin, Search } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { useAuth } from "@/contexts/AuthContext";
import AskQuestionModal from "@/components/forum/AskQuestionModal";
import {
  getDestinationById,
  type ExplorerDestinationSummary,
} from "@/lib/destination-explorer";

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

export default function AskALocalPage() {
  const searchParams = useSearchParams();
  const destinationId = searchParams?.get("destination");
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<ExplorerDestinationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAsk, setShowAsk] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchQuestions = async (q?: string, cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    if (destinationId) params.set("destinationId", destinationId);

    const payload = await apiFetch<{ questions: ForumQuestion[]; nextCursor: string | null }>(
      `/api/forum/questions?${params}`
    );
    return payload;
  };

  useEffect(() => {
    apiFetch<{ destinations: ExplorerDestinationSummary[] }>("/api/destinations")
      .then((payload) => {
        setSelectedDestination(getDestinationById(payload.destinations, destinationId));
      })
      .catch(() => {});
  }, [destinationId]);

  useEffect(() => {
    setLoading(true);
    fetchQuestions()
      .then((payload) => {
        setQuestions(payload.questions);
        setNextCursor(payload.nextCursor);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load questions."))
      .finally(() => setLoading(false));
  }, [destinationId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchQuestions(searchQuery)
      .then((payload) => {
        setQuestions(payload.questions);
        setNextCursor(payload.nextCursor);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to search."))
      .finally(() => setLoading(false));
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    fetchQuestions(searchQuery || undefined, nextCursor)
      .then((payload) => {
        setQuestions((prev) => [...prev, ...payload.questions]);
        setNextCursor(payload.nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const onQuestionPosted = (question: ForumQuestion) => {
    setQuestions((prev) => [question, ...prev]);
    setShowAsk(false);
  };

  return (
    <div className="theme-page min-h-screen">
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <AppServiceStrip
          activeLabel="Ask a Local"
          destinationId={selectedDestination?.id ?? destinationId}
          destinationName={selectedDestination?.name}
        />
      </section>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#8dc9ff]/25 bg-[#13283a] px-3 py-1.5 text-xs font-medium text-[#8dc9ff]">
              <MessageCircle className="h-4 w-4" />
              {selectedDestination ? `${selectedDestination.name} local guidance` : "Ask a Local"}
            </div>
            <h1 className="theme-heading mt-3 text-3xl font-semibold">
              {selectedDestination ? `Ask about ${selectedDestination.name}` : "Travel questions"}
            </h1>
            <p className="theme-muted mt-2 text-sm leading-6">
              {selectedDestination
                ? `Ask questions, get local tips, and read guide answers for ${selectedDestination.name}.`
                : "Ask anything about traveling in Zimbabwe and get answers from local guides and fellow travelers."}
            </p>
          </div>
          {user ? (
            <button
              onClick={() => setShowAsk(true)}
              className="shrink-0 rounded-lg bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Ask a question
            </button>
          ) : (
            <Link
              href="/login?redirect=/ask-a-local"
              className="shrink-0 rounded-lg bg-[#ff5630] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Traveler login to ask
            </Link>
          )}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedDestination
                  ? `Search questions about ${selectedDestination.name}...`
                  : "Search questions..."
              }
              className="theme-input h-11 w-full rounded-xl pl-11 pr-4 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/70 hover:bg-white/[0.09]"
          >
            Search
          </button>
        </form>

        {error ? (
          <div className="mb-4 rounded-2xl border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-sm text-[#ff5630]">
            {error}
          </div>
        ) : null}

        {/* Questions */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-[24px] border border-white/[0.07] bg-white/[0.04] p-5">
                  <div className="h-4 w-2/3 rounded-xl bg-white/[0.08]" />
                  <div className="mt-2 h-3.5 w-full rounded-xl bg-white/[0.05]" />
                  <div className="mt-2 h-3.5 w-4/5 rounded-xl bg-white/[0.05]" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-5 w-12 rounded-full bg-white/[0.06]" />
                    <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="theme-panel rounded-xl p-6 text-center space-y-3">
              <p className="theme-heading font-semibold">
                {searchQuery ? "No matching questions" : "No questions yet"}
              </p>
              <p className="theme-muted text-sm max-w-xs mx-auto leading-6">
                {searchQuery
                  ? `Nothing matched "${searchQuery}". Try different keywords or ask a new question.`
                  : "Be the first to ask. Local guides and fellow travelers are ready to help."}
              </p>
            </div>
          ) : (
            questions.map((q) => (
              <Link
                key={q.id}
                href={`/ask-a-local/${q.id}`}
                className="theme-panel block rounded-xl p-4 transition hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {q.isPinned ? (
                    <Pin className="mt-1 h-3.5 w-3.5 shrink-0 text-[#ffca74]" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="theme-heading font-semibold leading-6">{q.title}</div>
                    <p className="theme-muted mt-1 text-sm line-clamp-2 leading-6">{q.body}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                            q.author.isGuide
                              ? "bg-[#0f2a1e] text-[#4ade80]"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {q.author.name.charAt(0)}
                        </span>
                        <span>{q.author.name}</span>
                        {q.author.isGuide ? (
                          <span className="rounded-full bg-[#0f2a1e] px-1.5 py-0.5 text-[10px] text-[#4ade80]">
                            Guide
                          </span>
                        ) : null}
                      </span>
                      <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {q.answerCount} answer{q.answerCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {q.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {q.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-white/55">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {nextCursor ? (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-6 w-full rounded-full border border-white/10 py-3 text-sm text-white/60 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more questions"}
          </button>
        ) : null}
      </div>

      {showAsk ? (
        <AskQuestionModal
          onClose={() => setShowAsk(false)}
          onPosted={onQuestionPosted}
          destinationId={selectedDestination?.id ?? destinationId}
          destinationName={selectedDestination?.name}
        />
      ) : null}
    </div>
  );
}
