"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2, MailCheck, XCircle } from "lucide-react";
import { getSurfaceHref, resolveSurfaceFromPath } from "@/lib/app-surface";
import { apiFetch } from "@/lib/client-api";
import type { User } from "@/types/auth";

type VerifyState = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<VerifyState>("verifying");
  const [message, setMessage] = useState("Verifying your email address...");
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const surface = resolveSurfaceFromPath(pathname);
  const signInHref = getSurfaceHref(surface, "/login");
  const resendHref = getSurfaceHref(surface, "/auth/verify-email/request");
  const homeHref = getSurfaceHref(surface, "/");
  const providerProfileHref = getSurfaceHref("provider", "/provider-dashboard");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This verification link is missing a token.");
      return;
    }

    apiFetch<{ ok: boolean; email: string; role: string }>(
      "/api/auth/verify-email/confirm",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
    )
      .then(async (payload) => {
        setState("success");
        setVerifiedRole(payload.role);
        setMessage(`${payload.email} has been verified successfully.`);

        try {
          const session = await apiFetch<{ user: User }>("/api/auth/session");
          localStorage.setItem("off2zim_user", JSON.stringify(session.user));
        } catch {
          // Verification still succeeded; a signed-out user can continue via sign in.
        }
      })
      .catch((error) => {
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify this email right now.",
        );
      });
  }, [token]);

  const primaryHref =
    verifiedRole === "provider" ? providerProfileHref : signInHref;

  return (
    <div className="theme-page flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="theme-panel rounded-[32px] p-8 text-center">
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
              state === "verifying"
                ? "bg-[#13283a]"
                : state === "success"
                  ? "bg-[#0f2a1e]"
                  : "bg-[#2a0f0a]"
            }`}
          >
            {state === "verifying" && (
              <Loader2 className="h-8 w-8 animate-spin text-[#8dc9ff]" />
            )}
            {state === "success" && (
              <MailCheck className="h-8 w-8 text-[#4ade80]" />
            )}
            {state === "error" && (
              <XCircle className="h-8 w-8 text-[#ff8a78]" />
            )}
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff5630]/25 bg-[#2d1714] px-3 py-1.5 text-xs font-medium text-[#ff7352]">
            Off2Zim / Email verification
          </div>

          <h1 className="theme-heading text-2xl font-semibold">
            {state === "verifying"
              ? "Verifying your email"
              : state === "success"
                ? "Email verified"
                : "Verification failed"}
          </h1>

          <p
            className={`mt-3 text-sm leading-6 ${
              state === "success"
                ? "text-[#4ade80]"
                : state === "error"
                  ? "text-[#ff8a78]"
                  : "theme-muted"
            }`}
          >
            {message}
          </p>

          {state !== "verifying" && (
            <div className="mt-8 flex flex-col gap-3">
              <a
                href={primaryHref}
                className="flex w-full items-center justify-center rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff7352]"
              >
                {verifiedRole === "provider"
                  ? "Continue to provider profile"
                  : "Go to sign in"}
              </a>
              {state === "error" ? (
                <Link
                  href={resendHref}
                  className="theme-button-secondary flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                >
                  Request a new verification email
                </Link>
              ) : null}
              <Link
                href={homeHref}
                className="theme-button-secondary flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
              >
                Back to home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="theme-page flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#ff5630]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
