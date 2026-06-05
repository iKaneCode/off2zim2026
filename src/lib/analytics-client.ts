"use client";

import { getStoredToken } from "@/lib/client-api";

export type AnalyticsSurface =
  | "tourist_app"
  | "provider_web"
  | "provider_android"
  | "admin_web"
  | "public_web";

type AnalyticsEventInput = {
  eventType: string;
  appSurface?: AnalyticsSurface;
  metadata?: Record<string, unknown>;
};

const SESSION_STORAGE_KEY = "off2zim_analytics_session";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAnalyticsSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export function inferAnalyticsSurface(pathname: string): AnalyticsSurface {
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/admin-app/admin")
  ) {
    return "admin_web";
  }

  if (
    pathname.startsWith("/provider-dashboard") ||
    pathname.startsWith("/sp/provider-dashboard")
  ) {
    return "provider_web";
  }

  return "public_web";
}

export async function trackAnalyticsEvent({
  eventType,
  appSurface,
  metadata,
}: AnalyticsEventInput) {
  if (typeof window === "undefined") {
    return;
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  await fetch("/api/analytics/events", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers,
    body: JSON.stringify({
      sessionId: getAnalyticsSessionId(),
      eventType,
      appSurface: appSurface || inferAnalyticsSurface(window.location.pathname),
      device: navigator.userAgent.slice(0, 120),
      platform: navigator.platform || "web",
      metadata: metadata || {},
    }),
  });
}
