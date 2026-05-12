"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { type AppSurface, getSurfaceHref } from "@/lib/app-surface";
import { useAuth } from "@/contexts/AuthContext";

interface LoginFormProps {
  onClose?: () => void;
  redirectTo?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  helpHref?: string;
  helpLabel?: string;
  signupHref?: string;
  signupLabel?: string;
  showSocialButtons?: boolean;
  compactHeader?: boolean;
  surface?: AppSurface;
}

const LoginForm = ({
  onClose,
  redirectTo,
  eyebrow = "Sign in",
  title = "Welcome back",
  body = "Access your planner, bookings, saved places, and account details.",
  helpHref = "/auth/forgot-password",
  helpLabel = "Forgot password?",
  signupHref = "/register",
  signupLabel = "Create account",
  showSocialButtons = true,
  compactHeader = false,
  surface = "public",
}: LoginFormProps) => {
  const { login, isLoading, error } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const baseSignupHref = signupHref.startsWith("/")
    ? getSurfaceHref(surface, signupHref)
    : signupHref;
  const baseHelpHref =
    helpHref === "/contact" || helpHref.startsWith("mailto:") || !helpHref.startsWith("/")
      ? helpHref
      : getSurfaceHref(surface, helpHref);
  const signupDestination = redirectTo
    ? `${baseSignupHref}?redirect=${encodeURIComponent(redirectTo)}`
    : baseSignupHref;
  const helpDestination =
    helpHref === "/contact" || helpHref.startsWith("mailto:")
      ? baseHelpHref
      : redirectTo
        ? `${baseHelpHref}?redirect=${encodeURIComponent(redirectTo)}`
        : baseHelpHref;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email: formData.email, password: formData.password });
      onClose?.();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="theme-panel w-full max-w-[28rem] rounded-[32px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
      <div className="border-b border-black/10 pb-6 dark:border-white/10">
        {!compactHeader ? (
          <>
            <div className="theme-chip inline-flex rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.28em]">
              {eyebrow}
            </div>
            <h2 className="theme-heading mt-4 text-3xl font-semibold">
              {title}
            </h2>
            <p className="theme-muted mt-3 max-w-sm text-sm leading-6">
              {body}
            </p>
          </>
        ) : (
          <>
            <h2 className="theme-heading text-3xl font-semibold">{title}</h2>
            {body ? (
              <p className="theme-muted mt-2 text-sm leading-6">{body}</p>
            ) : null}
          </>
        )}
      </div>

      {error ? (
        <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="text-sm text-rose-600 dark:text-rose-200">{error}</p>
        </div>
      ) : null}

      {showSocialButtons ? (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="theme-button-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-medium"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="theme-button-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-medium"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/10 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="theme-panel rounded-full px-3 py-1 text-xs font-medium text-slate-500 dark:text-white/45">
                Or continue with email
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="theme-muted mb-2 block text-sm font-medium"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="theme-input h-12 w-full rounded-[18px] pl-11 pr-4"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="theme-muted mb-2 block text-sm font-medium"
          >
            Password
          </label>
          <div className="relative">
            <KeyRound className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="theme-input h-12 w-full rounded-[18px] pl-11 pr-12"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="theme-subtle absolute inset-y-0 right-0 flex items-center pr-4 transition hover:text-black dark:hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="theme-muted inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-black/20 text-[#ff5630] dark:border-white/20"
            />
            Keep me signed in
          </label>
          <Link
            href={helpDestination}
            className="font-medium text-[#ff5630] transition hover:text-[#e44c28]"
          >
            {helpLabel || "Need help?"}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff5630] px-5 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {signupHref ? (
        <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm dark:border-white/10">
          <span className="theme-muted">New to Off2Zim?</span>{" "}
          <Link
            href={signupDestination}
            className="font-semibold text-[#ff5630] transition hover:text-[#e44c28]"
          >
            {signupLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default LoginForm;
