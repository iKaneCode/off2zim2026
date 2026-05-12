"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, CheckCircle2, LifeBuoy, ArrowRight } from "lucide-react";
import { getSurfaceHref, resolveSurfaceFromPath } from "@/lib/app-surface";
import { apiFetch } from "@/lib/client-api";

type RequestState = "idle" | "submitting" | "success" | "error";

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const surface = resolveSurfaceFromPath(pathname);
  const signInHref = getSurfaceHref(surface, "/login");

  const canSubmit = useMemo(() => email.trim().length > 0 && state !== "submitting", [email, state]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    setFallbackUrl("");

    try {
      const payload = await apiFetch<{ ok: boolean; delivered: boolean; resetUrl?: string }>(
        "/api/auth/password-reset/request",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );

      setState("success");
      setMessage(
        "If that email belongs to an Off2Zim account, we’ve sent password reset instructions.",
      );
      setFallbackUrl(payload.resetUrl || "");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to start password reset right now.");
    }
  };

  return (
    <div className="theme-page min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <section
          className="relative overflow-hidden rounded-[34px] bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.62)), url('/images/jacaranda.JPG')",
          }}
        >
          <div className="flex h-full min-h-[420px] flex-col justify-between p-6 text-white md:p-8 lg:min-h-[700px] lg:p-10">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/78 backdrop-blur">
                Explorer account recovery
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
                Reset access without losing your trip progress.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/74 md:text-base">
                We’ll send a secure password reset link to the email address tied to your Off2Zim account.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[26px] border border-white/15 bg-black/28 p-5 backdrop-blur-sm">
                <Mail className="h-5 w-5 text-[#ffca74]" />
                <div className="mt-4 text-lg font-semibold">Secure email reset</div>
                <div className="mt-2 text-sm leading-6 text-white/72">
                  Password reset links are single-use and expire automatically.
                </div>
              </div>
              <div className="rounded-[26px] border border-white/15 bg-black/28 p-5 backdrop-blur-sm">
                <LifeBuoy className="h-5 w-5 text-[#9fc7ff]" />
                <div className="mt-4 text-lg font-semibold">Need extra help?</div>
                <div className="mt-2 text-sm leading-6 text-white/72">
                  If you still cannot access your account, our team can help you recover it safely.
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex items-center justify-center">
          <div className="theme-panel w-full max-w-[30rem] rounded-[32px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
            <div className="border-b border-black/10 pb-6 dark:border-white/10">
              <div className="theme-chip inline-flex rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.28em]">
                Password reset
              </div>
              <h2 className="theme-heading mt-4 text-3xl font-semibold">Send reset link</h2>
              <p className="theme-muted mt-3 max-w-sm text-sm leading-6">
                Enter the email address you use for Off2Zim and we’ll send the next steps there.
              </p>
            </div>

            {message ? (
              <div
                className={`mt-5 rounded-[20px] px-4 py-3 ${
                  state === "success"
                    ? "border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                    : "border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      state === "success" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"
                    }`}
                  />
                  <p
                    className={`text-sm ${
                      state === "success" ? "text-emerald-700 dark:text-emerald-200" : "text-rose-600 dark:text-rose-200"
                    }`}
                  >
                    {message}
                  </p>
                </div>
              </div>
            ) : null}

            {fallbackUrl ? (
              <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Email delivery is not fully configured in this environment. Use the generated reset link below.
                </p>
                <a
                  href={fallbackUrl}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5630] transition hover:text-[#e44c28]"
                >
                  Open reset link
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="theme-muted mb-2 block text-sm font-medium">
                  Account email
                </label>
                <div className="relative">
                  <Mail className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="theme-input h-12 w-full rounded-[18px] pl-11 pr-4"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff5630] px-5 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "submitting" ? "Sending reset link..." : "Send reset link"}
              </button>
            </form>

            <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm dark:border-white/10">
              <span className="theme-muted">Remembered your password?</span>{" "}
              <Link href={signInHref} className="font-semibold text-[#ff5630] transition hover:text-[#e44c28]">
                Back to sign in
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
