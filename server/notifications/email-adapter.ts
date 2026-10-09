import { env } from "cloudflare:workers";

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
    console.warn(
      `[email-adapter] EMAIL_PROVIDER not configured — message to ${message.to} ("${message.subject}") was not sent. ` +
        "Configure EMAIL_PROVIDER/EMAIL_API_KEY/EMAIL_FROM secrets to enable delivery."
    );
    return { ok: false, error: "email_provider_not_configured" };
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
  const provider = env.EMAIL_PROVIDER;
  if (provider === "resend" && env.EMAIL_API_KEY && env.EMAIL_FROM) {
    return new ResendEmailAdapter(env.EMAIL_API_KEY, env.EMAIL_FROM);
  }
  return new LoggingEmailAdapter();
}
