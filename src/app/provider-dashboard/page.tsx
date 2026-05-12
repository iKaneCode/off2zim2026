import React from "react";
import ProviderDashboard from "./ProviderDashboard";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const metadata = {
  title: "Service Provider Dashboard | Off2Zim",
  description:
    "Manage your business profile, listings, and orders on Off2Zim. Track performance and grow your Zimbabwe tourism business.",
};

export default function ProviderDashboardPage() {
  return (
    <ProtectedRoute requiredRole="provider" surface="provider">
      <ProviderDashboard />
    </ProtectedRoute>
  );
}
