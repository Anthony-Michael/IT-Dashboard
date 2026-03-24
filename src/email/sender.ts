import nodemailer from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

export interface SendEmailResult {
  sent: boolean;
  mode: "smtp" | "log_only";
}

function shouldUseLogOnlyMode(): boolean {
  // Default to non-delivery unless explicitly configured to avoid accidental external sends.
  const forceLogOnly = (process.env.EMAIL_LOG_ONLY || "true").toLowerCase() === "true";
  if (forceLogOnly) return true;

  const isDev = (process.env.NODE_ENV || "development") !== "production";
  const allowSendInDev = (process.env.EMAIL_ALLOW_SEND_IN_DEV || "false").toLowerCase() === "true";
  if (isDev && !allowSendInDev) return true;

  return false;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM || "";
  const smtpHost = process.env.SMTP_HOST || "";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";

  // Missing config falls back to log-only so reply actions never fail just due to SMTP setup.
  const missingSmtpConfig = !from || !smtpHost || !smtpUser || !smtpPass;

  // Log-only still returns success metadata so callers can persist message history consistently.
  if (shouldUseLogOnlyMode() || missingSmtpConfig) {
    console.log("[email] log-only mode");
    console.log({ to: input.to, subject: input.subject, text: input.text });
    return { sent: false, mode: "log_only" };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text
  });

  return { sent: true, mode: "smtp" };
}
