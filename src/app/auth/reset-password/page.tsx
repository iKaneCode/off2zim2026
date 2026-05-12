"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { getSurfaceHref, resolveSurfaceFromPath } from "@/lib/app-surface";
import { apiFetch } from "@/lib/client-api";

type ResetState = "idle" | "submitting" | "success" | "error";

function ResetPasswordForm() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<ResetState>("idle");
  const [message, setMessage] = useState("");
  const surface = resolveSurfaceFromPath(pathname);
  const signInHref = getSurfaceHref(surface, "/login");

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) { setState("error"); setMessage("This password reset link is missing a token."); return; }
    if (password.length < 8) { setState("error"); setMessage("Password must be at least 8 characters."); return; }
    if (!passwordsMatch) { setState("error"); setMessage("Passwords do not match."); return; }
    setState("submitting"); setMessage("");
    try {
      await apiFetch<{ ok: boolean }>("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setState("success");
      setMessage("Your password has been reset. You can now sign in.");
      setPassword(""); setConfirmPassword("");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to reset password right now.");
    }
  };

  return (
    <div className="theme-page min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="theme-panel rounded-[32px] p-8">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2d1714] mb-6">
            <KeyRound className="h-6 w-6 text-[#ff7352]" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5630]/25 bg-[#2d1714] px-3 py-1.5 text-xs font-medium text-[#ff7352] mb-4">
            Off2Zim · Password reset
          </div>

          <h1 className="theme-heading text-3xl font-semibold">Reset your password</h1>
          <p className="theme-muted mt-2 text-sm leading-6">Choose a new password for your Off2Zim account.</p>

          {state === "success" ? (
            <div className="mt-8">
              <div className="flex items-start gap-3 rounded-[18px] border border-[#4ade80]/20 bg-[#0f2a1e] px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#4ade80]" />
                <p className="text-sm text-[#4ade80]">{message}</p>
              </div>
              <Link
                href={signInHref}
                className="mt-5 flex w-full items-center justify-center rounded-full bg-[#ff5630] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-medium theme-subtle mb-1.5 uppercase tracking-wide">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="theme-input h-12 w-full rounded-[16px] px-4 text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium theme-subtle mb-1.5 uppercase tracking-wide">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="theme-input h-12 w-full rounded-[16px] px-4 text-sm"
                  placeholder="Re-enter your new password"
                />
                {confirmPassword.length > 0 && (
                  <p className={`mt-1.5 text-xs ${passwordsMatch ? "text-[#4ade80]" : "text-[#ff8a78]"}`}>
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              {state === "error" && message && (
                <div className="flex items-start gap-2.5 rounded-[14px] border border-[#ff5630]/25 bg-[#2a0f0a] px-4 py-3">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a78]" />
                  <p className="text-sm text-[#ff8a78]">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={state === "submitting"}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-[#ff5630] text-sm font-semibold text-white hover:bg-[#ff7352] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state === "submitting" ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href={signInHref} className="text-[#ff7352] hover:underline font-medium">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="theme-page min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#ff5630]" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
