export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "";

// Report a pageview to GA4
export function pageview(url: string) {
  if (!GA_TRACKING_ID) return;
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (!window.gtag) return;
  // @ts-ignore
  window.gtag("config", GA_TRACKING_ID, { page_path: url });
}

// Generic event helper
export function gaEvent(action: string, params: Record<string, any> = {}) {
  if (!GA_TRACKING_ID) return;
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (!window.gtag) return;
  // @ts-ignore
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
  // @ts-ignore
  if (!window.gtag) return;
  // @ts-ignore
  window.gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
  });
}

export function updateConsent(options: ConsentOptions) {
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (!window.gtag) return;
  // @ts-ignore
  window.gtag("consent", "update", options);
}
