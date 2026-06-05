"use client";

import { useEffect, useRef } from "react";

export function useSoftRefresh(
  refresh: () => void | Promise<void>,
  options: { enabled?: boolean; intervalMs?: number } = {},
) {
  const refreshRef = useRef(refresh);
  const enabled = options.enabled ?? true;
  const intervalMs = options.intervalMs ?? 5000;

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      void refreshRef.current();
    };
    const interval = window.setInterval(run, intervalMs);
    window.addEventListener("focus", run);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", run);
    };
  }, [enabled, intervalMs]);
}
