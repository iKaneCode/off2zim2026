import React from "react";
import ProviderDashboard from "../ProviderDashboard";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const metadata = {
  title: "Service Provider Dashboard | Off2Zim",
  description:
    "Manage your service provider profile, readiness, listings, calendars, revenue, and premium tier requests on Off2Zim.",
};

export default async function ProviderDashboardByIdPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;

  return (
    <ProtectedRoute requiredRole="provider" surface="provider">
      <ProviderDashboard routeProviderId={providerId} />
    </ProtectedRoute>
  );
}
