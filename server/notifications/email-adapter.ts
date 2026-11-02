export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<{ ok: boolean; providerId?: string; error?: string }>;
}

/**
 * Transactional-email adapter interface. The concrete provider is selected only from secrets
 * (`EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`) — never hard-coded credentials.
 *
 * No email provider secret is configured in this environment, so this ships as a safe,
 * explicit no-op/log adapter. Wire a real provider (e.g. Resend, Postmark, SES) by implementing
 * `EmailAdapter.send` and returning it from `getEmailAdapter()` once `EMAIL_API_KEY` is set.
 */
class LoggingEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage) {
    // Printing the full body (not just to/subject) is deliberate: in local development this
    // is the only way to retrieve a magic-link sign-in URL without a real email provider
    // configured. Treated as a successful "delivery" (ok:true) from the caller's perspective —
    // this adapter's whole purpose is to stand in for a real provider, not to report failure.
    console.warn(
      `[email-adapter] EMAIL_PROVIDER not configured — logging instead of sending.\n` +
        `  to: ${message.to}\n  subject: ${message.subject}\n  body:\n${message.text}\n` +
        "  Configure EMAIL_PROVIDER/EMAIL_API_KEY/EMAIL_FROM to enable real delivery."
    );
    return { ok: true, providerId: "logged" };
  }
}

class ResendEmailAdapter implements EmailAdapter {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: EmailMessage) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });
      if (!response.ok) return { ok: false, error: `resend_http_${response.status}` };
      const payload = (await response.json()) as { id?: string };
      return { ok: true, providerId: payload.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "resend_request_failed" };
    }
  }
}

export function getEmailAdapter(): EmailAdapter {
  const provider = process.env.EMAIL_PROVIDER;
  if (provider === "resend" && process.env.EMAIL_API_KEY && process.env.EMAIL_FROM) {
    return new ResendEmailAdapter(process.env.EMAIL_API_KEY, process.env.EMAIL_FROM);
  }
  return new LoggingEmailAdapter();
}
