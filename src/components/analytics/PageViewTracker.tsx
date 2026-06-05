"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  inferAnalyticsSurface,
  trackAnalyticsEvent,
} from "@/lib/analytics-client";

export function PageViewTracker() {
  const pathname = usePathname();
  const lastPageKey = useRef("");

  useEffect(() => {
    const pageKey = `${pathname}${window.location.search}`;
    if (lastPageKey.current === pageKey) {
      return;
    }

    lastPageKey.current = pageKey;
    void trackAnalyticsEvent({
      eventType: "page_view",
      appSurface: inferAnalyticsSurface(pathname),
      metadata: {
        path: pathname,
        query: window.location.search || null,
        referrer: document.referrer || null,
      },
    }).catch(() => {
      // Analytics must never interrupt the user's workflow.
    });
  }, [pathname]);

  return null;
}
