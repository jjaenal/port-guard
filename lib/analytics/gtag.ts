export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "";

declare global {
  interface Window {
    gtag?: (command: string, param1: string, param2?: unknown) => void;
  }
}

// Report a pageview to GA4
export function pageview(url: string) {
  if (!GA_TRACKING_ID) return;
  if (typeof window === "undefined") return;
  if (!window.gtag) return;
  window.gtag("config", GA_TRACKING_ID, { page_path: url });
}

// Generic event helper
export function gaEvent(action: string, params: Record<string, unknown> = {}) {
  if (!GA_TRACKING_ID) return;
  if (typeof window === "undefined") return;
  if (!window.gtag) return;
  window.gtag("event", action, params);
}

// Consent helpers
export type ConsentOptions = {
  ad_storage?: "granted" | "denied";
  analytics_storage?: "granted" | "denied";
  functionality_storage?: "granted" | "denied";
  personalization_storage?: "granted" | "denied";
  security_storage?: "granted" | "denied";
};

export function setDefaultConsent() {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;
  window.gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
  });
}

export function updateConsent(options: ConsentOptions) {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;
  window.gtag("consent", "update", options);
}
