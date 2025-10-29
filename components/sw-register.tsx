"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const swUrl = "/sw.js";
    navigator.serviceWorker.register(swUrl).catch(() => {
      // silent fail: do not log to console per lint rules
    });
  }, []);

  return null;
}
