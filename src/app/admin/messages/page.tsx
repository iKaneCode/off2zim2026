"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminShell from "@/components/admin/AdminShell";
import SupportMessagesWorkspace from "@/components/messages/SupportMessagesWorkspace";

export default function AdminMessagesPage() {
  return (
    <ProtectedRoute requiredRole="admin" surface="admin">
      <AdminShell
        activePath="/admin/messages"
        title="Messages"
        description="Start and manage conversations with service providers and platform users."
      >
        <SupportMessagesWorkspace
          mode="admin"
          className="lg:h-[calc(100dvh-190px)]"
        />
      </AdminShell>
    </ProtectedRoute>
  );
}
