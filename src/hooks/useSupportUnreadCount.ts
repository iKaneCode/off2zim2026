"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

const SUPPORT_MESSAGES_UPDATED_EVENT = "off2zim:support-messages-updated";
const UNREAD_REFRESH_INTERVAL_MS = 4000;

export function notifySupportMessagesUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SUPPORT_MESSAGES_UPDATED_EVENT));
  }
}

export function useSupportUnreadCount(endpoint: string) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    const refreshUnreadCount = async () => {
      try {
        const payload = await apiFetch<{ unreadCount: number }>(endpoint);
        if (active) {
          setUnreadCount(payload.unreadCount);
        }
      } catch {
        // Keep the last known count during short-lived network or auth transitions.
      }
    };

    const handleRefresh = () => {
      void refreshUnreadCount();
    };

    void refreshUnreadCount();
    const interval = window.setInterval(
      refreshUnreadCount,
      UNREAD_REFRESH_INTERVAL_MS,
    );
    window.addEventListener("focus", handleRefresh);
    window.addEventListener(SUPPORT_MESSAGES_UPDATED_EVENT, handleRefresh);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener(SUPPORT_MESSAGES_UPDATED_EVENT, handleRefresh);
    };
  }, [endpoint]);

  return unreadCount;
}
