/**
 * Notification service for sending alert emails via Resend.
 *
 * Server-side only. Uses RESEND_API_KEY and RESEND_FROM_EMAIL env vars.
 */

export interface EmailParams {
  to: string[];
  subject: string;
  html: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "alerts@portguard.app";
  return { apiKey, from };
}

/**
 * Sends an email using Resend REST API.
 * Returns success status and email id on success.
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  const { apiKey, from } = getResendConfig();

  if (!apiKey) {
    return { success: false, error: "Resend API key not configured" };
  }

  const body = {
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json()) as unknown;
    const message = typeof data === "object" && data && "error" in (data as Record<string, unknown>)
      ? String((data as Record<string, unknown>).error)
      : `HTTP ${response.status}`;
    return { success: false, error: message };
  }

  const data = (await response.json()) as { id?: string };
  return { success: true, id: data.id };
}

/**
 * Helper to compose a basic HTML email for an alert.
 */
export function buildAlertEmailHtml(title: string, message: string): string {
  return `<!doctype html><html><body><h2>${title}</h2><p>${message}</p></body></html>`;
}