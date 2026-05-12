"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Globe2, Mail, Phone, User2 } from "lucide-react";
import { type AppSurface, getSurfaceHref } from "@/lib/app-surface";
import { useAuth } from "@/contexts/AuthContext";
import { ExplorerType, UserRole } from "@/types/auth";

interface RegisterFormProps {
  onClose?: () => void;
  redirectTo?: string;
  showSocialButtons?: boolean;
  surface?: AppSurface;
}

const RegisterForm = ({
  onClose,
  redirectTo,
  showSocialButtons = true,
  surface = "public",
}: RegisterFormProps) => {
  const { register, isLoading, error } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "explorer" as UserRole,
    explorerType: "foreign" as ExplorerType,
    title: "",
    gender: "",
    idType: "",
    identityNumber: "",
    dateOfBirth: "",
    nationality: "",
    phone: "",
    companyName: "",
    tradingName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch =
    !formData.confirmPassword || formData.password === formData.confirmPassword;
  const loginHref = useMemo(
    () => {
      const signInHref = getSurfaceHref(surface, "/login");
      return redirectTo
        ? `${signInHref}?redirect=${encodeURIComponent(redirectTo)}`
        : signInHref;
    },
    [redirectTo, surface],
  );

  const splitFullName = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);

    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) return;

    const nameParts = splitFullName(formData.fullName);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.role === "explorer" ? nameParts.firstName : "",
        lastName: formData.role === "explorer" ? nameParts.lastName : "",
        role: formData.role,
        explorerType:
          formData.role === "explorer" ? formData.explorerType : undefined,
        title: formData.role === "explorer" ? formData.title : undefined,
        gender: formData.role === "explorer" ? formData.gender : undefined,
        idType: formData.role === "explorer" ? formData.idType : undefined,
        identityNumber:
          formData.role === "explorer" ? formData.identityNumber : undefined,
        dateOfBirth:
          formData.role === "explorer" ? formData.dateOfBirth : undefined,
        nationality:
          formData.role === "explorer" ? formData.nationality : undefined,
        phone: formData.phone,
        companyName:
          formData.role === "provider" ? formData.companyName : undefined,
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isProvider = formData.role === "provider";
  const explorerProfileComplete =
    !!formData.title &&
    !!formData.fullName.trim() &&
    !!formData.gender &&
    !!formData.idType &&
    !!formData.identityNumber &&
    !!formData.dateOfBirth &&
    !!formData.nationality &&
    !!formData.phone;

  return (
    <div className="theme-panel w-full max-w-[32rem] rounded-[32px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
      <div className="border-b border-black/10 pb-6 dark:border-white/10">
        <div className="theme-chip inline-flex rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.28em]">
          Create account
        </div>
        <h2 className="theme-heading mt-4 text-3xl font-semibold">
          Join Off2Zim
        </h2>
        <p className="theme-muted mt-3 max-w-md text-sm leading-6">
          Set up your traveler or provider account and get started on Off2Zim.
        </p>
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
          <div className="theme-muted mb-2 block text-sm font-medium">
            Account type
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, role: "explorer" }))
              }
              className={`rounded-[20px] border px-4 py-4 text-left transition ${
                formData.role === "explorer"
                  ? "border-[#ff5630] bg-[#ff5630]/8"
                  : "border-black/10 bg-black/[0.03] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ffede7] text-[#ff5630] dark:bg-[#2a1614]">
                  <Globe2 className="h-4 w-4" />
                </span>
                <div>
                  <div className="theme-heading font-semibold">Explorer</div>
                  <div className="theme-muted mt-1 text-xs">Plan trips, save places, and manage bookings</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, role: "provider" }))
              }
              className={`rounded-[20px] border px-4 py-4 text-left transition ${
                formData.role === "provider"
                  ? "border-[#ff5630] bg-[#ff5630]/8"
                  : "border-black/10 bg-black/[0.03] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ffede7] text-[#ff5630] dark:bg-[#2a1614]">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <div className="theme-heading font-semibold">Service provider</div>
                  <div className="theme-muted mt-1 text-xs">List and manage services on Off2Zim</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {formData.role === "explorer" ? (
          <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="theme-heading text-lg font-semibold">
              Personal details
            </div>
            <p className="theme-muted mt-2 text-sm leading-6">
              This helps us personalise your account and match your bookings to the right traveler.
            </p>

            <div className="mt-5 grid gap-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="theme-muted mb-2 block text-sm font-medium"
                >
                  Full name
                </label>
                <div className="relative">
                  <User2 className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required={!isProvider}
                    className="theme-input h-12 w-full rounded-[18px] pl-11 pr-4"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="title"
                    className="theme-muted mb-2 block text-sm font-medium"
                  >
                    Title
                  </label>
                  <select
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required={!isProvider}
                    className="theme-input h-12 w-full rounded-[18px] px-4"
                  >
                    <option value="">Select title</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                    <option value="Prof">Prof</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="gender"
                    className="theme-muted mb-2 block text-sm font-medium"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required={!isProvider}
                    className="theme-input h-12 w-full rounded-[18px] px-4"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="idType"
                    className="theme-muted mb-2 block text-sm font-medium"
                  >
                    ID type
                  </label>
                  <select
                    id="idType"
                    name="idType"
                    value={formData.idType}
                    onChange={handleChange}
                    required={!isProvider}
                    className="theme-input h-12 w-full rounded-[18px] px-4"
                  >
                    <option value="">Select ID type</option>
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="identityNumber"
                    className="theme-muted mb-2 block text-sm font-medium"
                  >
                    Identity number
                  </label>
                  <input
                    type="text"
                    id="identityNumber"
                    name="identityNumber"
                    value={formData.identityNumber}
                    onChange={handleChange}
                    required={!isProvider}
                    className="theme-input h-12 w-full rounded-[18px] px-4"
                    placeholder="Enter ID number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="theme-muted mb-2 block text-sm font-medium"
                  >
                    Date of birth
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required={!isProvider}
                    className="theme-input h-12 w-full rounded-[18px] px-4"
                  />
                </div>
                <div>
                  <label
                    htmlFor="nationality"
                    className="theme-muted mb-2 block text-sm font-medium"
                  >
                    Nationality
                  </label>
                  <input
                    type="text"
                    id="nationality"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    required={!isProvider}
                    className="theme-input h-12 w-full rounded-[18px] px-4"
                    placeholder="Nationality"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="phone"
                    className="theme-muted mb-2 block text-sm font-medium"
                  >
                    Cell phone
                  </label>
                  <div className="relative">
                    <Phone className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required={!isProvider}
                      className="theme-input h-12 w-full rounded-[18px] pl-11 pr-4"
                      placeholder="+263..."
                    />
                  </div>
                </div>
                <div>
                  <div className="theme-muted mb-2 text-sm font-medium">
                    Where are you based?
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, explorerType: "foreign" }))
                      }
                      className={`rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                        formData.explorerType === "foreign"
                          ? "border-[#ff5630] bg-[#ff5630]/8 font-medium"
                          : "border-black/10 bg-black/[0.03] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="theme-heading font-semibold">Visiting</div>
                      <div className="theme-muted mt-0.5 text-xs">Traveling to Zimbabwe</div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, explorerType: "local" }))
                      }
                      className={`rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                        formData.explorerType === "local"
                          ? "border-[#ff5630] bg-[#ff5630]/8 font-medium"
                          : "border-black/10 bg-black/[0.03] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="theme-heading font-semibold">Local</div>
                      <div className="theme-muted mt-0.5 text-xs">Zimbabwe resident</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
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

        {isProvider ? (
          <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="theme-heading text-lg font-semibold">
              Business details
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label
                  htmlFor="companyName"
                  className="theme-muted mb-2 block text-sm font-medium"
                >
                  Business name
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="theme-input h-12 w-full rounded-[18px] px-4"
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="theme-muted mb-2 block text-sm font-medium"
                >
                  Contact phone
                </label>
                <div className="relative">
                  <Phone className="theme-subtle absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    type="tel"
                    id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required={isProvider}
                  className="theme-input h-12 w-full rounded-[18px] pl-11 pr-4"
                  placeholder="+263..."
                />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="password"
              className="theme-muted mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="theme-input h-12 w-full rounded-[18px] px-4 pr-12"
                placeholder="Create a password"
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
            <p className="theme-muted mt-2 text-xs">
              Use at least 8 characters.
            </p>
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
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={`theme-input h-12 w-full rounded-[18px] px-4 pr-12 ${
                  passwordsMatch ? "" : "border-rose-300 dark:border-rose-500/30"
                }`}
                placeholder="Confirm your password"
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
        </div>

        <label className="theme-muted flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            id="terms"
            required
            className="mt-1 h-4 w-4 rounded border-black/20 text-[#ff5630] dark:border-white/20"
          />
          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              className="font-medium text-[#ff5630] transition hover:text-[#e44c28]"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-[#ff5630] transition hover:text-[#e44c28]"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={
            isLoading ||
            !passwordsMatch ||
            (isProvider && !formData.companyName.trim()) ||
            (!isProvider && !explorerProfileComplete)
          }
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff5630] px-5 text-sm font-semibold text-white transition hover:bg-[#ff6f4d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm dark:border-white/10">
        <span className="theme-muted">Already have an account?</span>{" "}
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
