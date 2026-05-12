"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MailCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { getSurfaceHref, resolveSurfaceFromPath } from "@/lib/app-surface";
import { apiFetch } from "@/lib/client-api";

type RequestState = "idle" | "submitting" | "success" | "error";

export default function RequestVerificationPage() {
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
      const payload = await apiFetch<{ ok: boolean; delivered: boolean; verificationUrl?: string }>(
        "/api/auth/verify-email/request",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );

      setState("success");
      setMessage(
        "If that address belongs to an unverified Off2Zim account, we’ve sent a fresh verification email.",
      );
      setFallbackUrl(payload.verificationUrl || "");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to send verification right now.");
    }
  };

  return (
    <div className="theme-page min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <section
          className="relative overflow-hidden rounded-[34px] bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.16), rgba(0,0,0,0.6)), url('/images/victoria-falls.jpg')",
          }}
        >
          <div className="flex h-full min-h-[420px] flex-col justify-between p-6 text-white md:p-8 lg:min-h-[700px] lg:p-10">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/78 backdrop-blur">
                Email verification
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
                Confirm your email and keep your account ready to use.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/74 md:text-base">
                We’ll send a fresh verification link so you can confirm your Off2Zim account and continue with confidence.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/15 bg-black/28 p-5 backdrop-blur-sm">
              <MailCheck className="h-5 w-5 text-[#ffca74]" />
              <div className="mt-4 text-lg font-semibold">One quick confirmation</div>
              <div className="mt-2 text-sm leading-6 text-white/72">
                Verification helps protect bookings, account recovery, and the next steps you take on the platform.
              </div>
            </div>
          </div>
        </section>

        <aside className="flex items-center justify-center">
          <div className="theme-panel w-full max-w-[30rem] rounded-[32px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
            <div className="border-b border-black/10 pb-6 dark:border-white/10">
              <div className="theme-chip inline-flex rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.28em]">
                Resend verification
              </div>
              <h2 className="theme-heading mt-4 text-3xl font-semibold">Send new email</h2>
              <p className="theme-muted mt-3 max-w-sm text-sm leading-6">
                Enter the email address on your Off2Zim account and we’ll send a fresh verification link.
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
                  Email delivery is not fully configured in this environment. Use the generated verification link below.
                </p>
                <a
                  href={fallbackUrl}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5630] transition hover:text-[#e44c28]"
                >
                  Open verification link
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="theme-muted mb-2 block text-sm font-medium">
                  Account email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="theme-input h-12 w-full rounded-[18px] px-4"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff5630] px-5 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "submitting" ? "Sending verification..." : "Send verification email"}
              </button>
            </form>

            <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm dark:border-white/10">
              <span className="theme-muted">Already confirmed your email?</span>{" "}
              <Link href={signInHref} className="font-semibold text-[#ff5630] transition hover:text-[#e44c28]">
                Go to sign in
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
