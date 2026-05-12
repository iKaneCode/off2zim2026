"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";
import toast from "react-hot-toast";
import {
  AuthContextType,
  AuthState,
  LoginCredentials,
  RegisterData,
  User,
  UserProfile,
  UserRole,
} from "@/types/auth";
import { apiFetch } from "@/lib/client-api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "LOGIN_ERROR"; payload: string }
  | { type: "LOGOUT" }
  | { type: "UPDATE_PROFILE"; payload: Partial<User> }
  | { type: "SET_LOADING"; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, isLoading: true, error: null };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "LOGIN_ERROR":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case "UPDATE_PROFILE":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

type AuthPayload = {
  token: string;
  user: User;
};

const EMPTY_PROVIDER_DOCUMENTS: Array<{
  type: string;
  file: File | null;
  fileUrl?: string | null;
  status: "pending" | "uploaded" | "verified" | "rejected";
}> = [];

function persistAuth(payload: AuthPayload) {
  localStorage.setItem("off2zim_user", JSON.stringify(payload.user));
  localStorage.setItem("off2zim_token", payload.token);
}

function persistUser(user: User) {
  localStorage.setItem("off2zim_user", JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem("off2zim_user");
  localStorage.removeItem("off2zim_token");
}

function mapProfileToProviderPayload(profile: UserProfile) {
  const businessDocuments = profile.businessDocuments || EMPTY_PROVIDER_DOCUMENTS;

  return {
    companyName: profile.companyName || "",
    tradingName: profile.tradingName || "",
    businessRegistrationNumber: profile.businessRegistrationNumber || "",
    mainContactPerson: profile.mainContactPerson || "",
    businessPhone: profile.businessPhone || "",
    businessEmail: profile.businessEmail || "",
    physicalAddress: profile.physicalAddress || "",
    headquartersCity: profile.location || "",
    businessCategory: profile.businessCategory || "",
    businessDescription: profile.businessDescription || "",
    establishedYear: profile.establishedYear ? Number(profile.establishedYear) : null,
    numberOfEmployees: profile.numberOfEmployees || "",
    operatingHours: profile.operatingHours || "",
    websiteUrl: profile.websiteUrl || "",
    socialMediaLinks: profile.socialMediaLinks || {},
    servicesOffered: profile.servicesOffered || [],
    serviceAreas: profile.serviceAreas || [],
    documents: businessDocuments
      .filter((document) => document.file || document.type || document.fileUrl)
      .map((document) => ({
        type: document.type,
        fileName: document.file?.name || `${document.type}.pdf`,
        fileUrl: document.fileUrl || null,
        status: document.status,
      })),
  };
}

function buildRegisterProfilePayload(data: RegisterData) {
  return {
    full_name: `${data.firstName} ${data.lastName}`.trim(),
    phone: data.phone || null,
    user_type: "individual",
    title: data.title || null,
    gender: data.gender || null,
    id_type: data.idType || null,
    identity_number: data.identityNumber || null,
    date_of_birth: data.dateOfBirth || null,
    nationality: data.nationality || null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const hydrateSession = async () => {
      const token = localStorage.getItem("off2zim_token");
      const storedUser = localStorage.getItem("off2zim_user");

      if (!token) {
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      if (storedUser) {
        try {
          dispatch({ type: "LOGIN_SUCCESS", payload: JSON.parse(storedUser) });
        } catch {
          clearAuth();
        }
      }

      try {
        const payload = await apiFetch<{ user: User }>("/api/auth/session");
        persistUser(payload.user);
        dispatch({ type: "LOGIN_SUCCESS", payload: payload.user });
      } catch (error) {
        clearAuth();
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    hydrateSession();
  }, []);

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const detail =
        event instanceof CustomEvent ? event.detail as { path?: string } : {};

      clearAuth();
      if (detail?.path && typeof window !== "undefined") {
        sessionStorage.setItem("off2zim_post_logout_redirect", detail.path);
      }
      sessionStorage.setItem("off2zim_auth_notice", "session-expired");
      dispatch({ type: "LOGOUT" });
      toast.error("Your session expired. Sign in again to continue.");
    };

    window.addEventListener("off2zim:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("off2zim:session-expired", handleSessionExpired);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: "LOGIN_START" });

    try {
      const payload = await apiFetch<AuthPayload>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      persistAuth(payload);
      dispatch({ type: "LOGIN_SUCCESS", payload: payload.user });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed. Please try again.";
      dispatch({ type: "LOGIN_ERROR", payload: message });
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    dispatch({ type: "LOGIN_START" });

    try {
      const registerPayload = {
        email: data.email,
        password: data.password,
        firstName: data.firstName || (data.role === "provider" ? "Business" : "Off2Zim"),
        lastName: data.lastName || (data.role === "provider" ? "User" : "Explorer"),
        role: data.role,
        explorerType: data.role === "explorer" ? data.explorerType || "foreign" : undefined,
        companyName:
          data.role === "provider"
            ? data.companyName || data.tradingName || "Off2Zim Business"
            : undefined,
        tradingName:
          data.role === "provider"
            ? data.tradingName || data.companyName || "Off2Zim Business"
            : undefined,
        businessRegistrationNumber:
          data.role === "provider"
            ? data.businessRegistrationNumber || "PENDING"
            : undefined,
        mainContactPerson:
          data.role === "provider"
            ? `${data.firstName} ${data.lastName}`.trim() || "Business User"
            : undefined,
        businessPhone:
          data.role === "provider"
            ? data.businessPhone || data.phone || "+263000000000"
            : undefined,
        businessEmail:
          data.role === "provider" ? data.businessEmail || data.email : undefined,
        physicalAddress:
          data.role === "provider"
            ? data.physicalAddress || "Pending address"
            : undefined,
      };

      const payload = await apiFetch<AuthPayload>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(registerPayload),
      });

      let nextUser = payload.user;

      if (data.role === "explorer") {
        await apiFetch<{ profile: unknown }>("/api/profile", {
          method: "PATCH",
          body: JSON.stringify(buildRegisterProfilePayload(data)),
        });

        const refreshed = await apiFetch<{ user: User }>("/api/auth/session");
        nextUser = refreshed.user;
      }

      persistAuth({ token: payload.token, user: nextUser });
      dispatch({ type: "LOGIN_SUCCESS", payload: nextUser });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";
      dispatch({ type: "LOGIN_ERROR", payload: message });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiFetch<{ ok: boolean }>("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // If the session is already gone we can still clear client state safely.
    } finally {
      clearAuth();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("off2zim_auth_notice");
        sessionStorage.removeItem("off2zim_post_logout_redirect");
      }
      dispatch({ type: "LOGOUT" });
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user) {
      return;
    }

    const nextProfile = { ...state.user.profile, ...updates };
    const nextUser = { ...state.user, profile: nextProfile };

    try {
      if (state.user.role === "provider") {
        await apiFetch<{ company: unknown }>("/api/provider/company", {
          method: "PATCH",
          body: JSON.stringify(mapProfileToProviderPayload(nextProfile)),
        });
      }

      persistUser(nextUser);
      dispatch({
        type: "UPDATE_PROFILE",
        payload: { profile: nextProfile },
      });
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  };

  const hasRole = (role: UserRole | UserRole[]) => {
    if (!state.user) return false;
    return Array.isArray(role)
      ? role.includes(state.user.role)
      : state.user.role === role;
  };

  const isVerified = () => state.user?.isVerified || false;

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    hasRole,
    isVerified,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
