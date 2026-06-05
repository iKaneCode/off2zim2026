"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Mail, User2 } from "lucide-react";
import { type AppSurface, getSurfaceHref } from "@/lib/app-surface";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

interface RegisterFormProps {
  onClose?: () => void;
  redirectTo?: string;
  showSocialButtons?: boolean;
  surface?: AppSurface;
}

const RegisterForm = ({
  onClose,
  redirectTo,
  surface = "public",
}: RegisterFormProps) => {
  const providerSurface = surface === "provider";
  const { register, isLoading, error } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: (providerSurface ? "provider" : "explorer") as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch =
    !formData.confirmPassword || formData.password === formData.confirmPassword;
  const isProvider = formData.role === "provider";
  const loginHref = useMemo(() => {
    const signInHref = getSurfaceHref(surface, "/login");
    return redirectTo
      ? `${signInHref}?redirect=${encodeURIComponent(redirectTo)}`
      : signInHref;
  }, [redirectTo, surface]);

  const splitFullName = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);

    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!passwordsMatch) return;

    const nameParts = splitFullName(formData.fullName);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: isProvider ? "" : nameParts.firstName,
        lastName: isProvider ? "" : nameParts.lastName,
        role: formData.role,
        explorerType: isProvider ? undefined : "foreign",
      });
      onClose?.();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      return;
    }
  };

  const canSubmit =
    !isLoading &&
    passwordsMatch &&
    formData.email.trim().length > 0 &&
    formData.password.length >= 8 &&
    formData.confirmPassword.length > 0 &&
    (isProvider || formData.fullName.trim().length > 0);

  return (
    <div className="theme-panel w-full max-w-[28rem] rounded-[28px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
      <div>
        <div className="theme-chip inline-flex rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.24em]">
          Create account
        </div>
        <h1 className="theme-heading mt-4 text-2xl font-semibold">
          {isProvider ? "Register your business" : "Join Off2Zim"}
        </h1>
        <p className="theme-muted mt-2 text-sm leading-6">
          {isProvider
            ? "Start with your secure login. Company profile and verification come after email confirmation."
            : "Create a traveler account with the essentials. You can complete your profile later."}
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="text-sm text-rose-600 dark:text-rose-200">{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!providerSurface ? (
          <div>
            <div className="theme-muted mb-2 block text-sm font-medium">
              Account type
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "explorer" as UserRole, label: "Traveler", icon: User2 },
                {
                  id: "provider" as UserRole,
                  label: "Service provider",
                  icon: Building2,
                },
              ].map((option) => {
                const Icon = option.icon;
                const selected = formData.role === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        role: option.id,
                      }))
                    }
                    className={`flex h-12 items-center justify-center gap-2 rounded-[16px] border text-sm font-semibold transition ${
                      selected
                        ? "border-[#ff5630] bg-[#ff5630]/10 text-[#b73216] dark:text-[#ffb49f]"
                        : "border-black/10 bg-black/[0.03] text-slate-600 hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!isProvider ? (
          <div>
            <label
              htmlFor="fullName"
              className="theme-muted mb-2 block text-sm font-medium"
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              required={!isProvider}
              className="theme-input h-12 w-full rounded-[16px] px-4"
              placeholder="Your full name"
            />
          </div>
        ) : null}

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
              id="email"
              type="email"
              value={formData.email}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              required
              className="theme-input h-12 w-full rounded-[16px] pl-11 pr-4"
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
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
              minLength={8}
              className="theme-input h-12 w-full rounded-[16px] px-4 pr-12"
              placeholder="At least 8 characters"
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

        <div>
          <label
            htmlFor="confirmPassword"
            className="theme-muted mb-2 block text-sm font-medium"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              required
              className={`theme-input h-12 w-full rounded-[16px] px-4 pr-12 ${
                passwordsMatch ? "" : "border-rose-300 dark:border-rose-500/30"
              }`}
              placeholder="Repeat password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="theme-subtle absolute inset-y-0 right-0 flex items-center pr-4 transition hover:text-black dark:hover:text-white"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {!passwordsMatch ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              Passwords do not match.
            </p>
          ) : null}
        </div>

        <label className="theme-muted flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-black/20 text-[#ff5630] dark:border-white/20"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-[#ff5630]">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-[#ff5630]">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff5630] px-5 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm dark:border-white/10">
        <span className="theme-muted">Already registered?</span>{" "}
        <Link
          href={loginHref}
          className="font-semibold text-[#ff5630] transition hover:text-[#e44c28]"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default RegisterForm;
