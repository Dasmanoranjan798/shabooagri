import nodemailer from "nodemailer";
import { env } from "../../config/env";

function supportMailbox(): string | undefined {
  return env.SUPPORT_NOTIFY_EMAIL || env.SMTP_USER;
}

// Same fallback lesson as the operational backend: SMTP is optional at
// boot, never a hard requirement. Without it, the reset flow still works
// end-to-end (token issued, DB row written) — it just can't deliver the
// email, which only matters in a dev/test environment without SMTP creds.
export async function sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<boolean> {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    console.log(`[MailService] SMTP not configured. Skipped sending reset email to ${toEmail}.`);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject: "Reset Your ShabooAgri Platform Password",
      text: `Hello,\n\nA password reset was requested for your ShabooAgri platform account.\n\nPlease use the link below to reset your password:\n${resetLink}\n\nThis reset link is valid for 15 minutes and can only be used once.\n\nIf you did not request this reset, please ignore this email.\n\nRegards,\nShabooAgri Support`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1B7A3E; margin-top: 0;">ShabooAgri Platform Password Reset</h2>
          <p>Hello,</p>
          <p>A password reset was requested for your ShabooAgri platform account associated with <strong>${toEmail}</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #1B7A3E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </p>
          <p style="font-size: 0.88rem; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 0.82rem; word-break: break-all; color: #1B7A3E;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8rem; color: #888;">This link will expire in 15 minutes and can only be used once. If you did not request a password reset, no action is needed.</p>
        </div>
      `,
    });

    return true;
  } catch (err: any) {
    console.error("[MailService] Failed to send email via SMTP:", err.message);
    return false;
  }
}

// Reply-To is set to the visitor's own address on both of these — the
// intent is that whoever reads the support mailbox can just hit reply and
// land in the visitor's inbox, not ShabooAgri's own SMTP_FROM address.
export async function sendFeedbackNotification(feedback: {
  name: string;
  email: string;
  message: string;
}): Promise<boolean> {
  const toMailbox = supportMailbox();
  if (!env.SMTP_HOST || !env.SMTP_USER || !toMailbox) {
    console.log(`[MailService] SMTP not configured. Skipped feedback notification from ${feedback.email}.`);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toMailbox,
      replyTo: feedback.email,
      subject: `New Feedback — ${feedback.name}`,
      text: `New feedback submitted on ShabooAgri.\n\nFrom: ${feedback.name} <${feedback.email}>\n\nMessage:\n${feedback.message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1B7A3E; margin-top: 0;">New Feedback</h2>
          <p><strong>From:</strong> ${feedback.name} (${feedback.email})</p>
          <p style="white-space: pre-wrap; background: #f4fbf6; padding: 12px; border-radius: 6px;">${feedback.message}</p>
        </div>
      `,
    });

    return true;
  } catch (err: any) {
    console.error("[MailService] Failed to send feedback notification via SMTP:", err.message);
    return false;
  }
}

export async function sendSupportRequestNotification(request: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const toMailbox = supportMailbox();
  if (!env.SMTP_HOST || !env.SMTP_USER || !toMailbox) {
    console.log(`[MailService] SMTP not configured. Skipped support request notification from ${request.email}.`);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toMailbox,
      replyTo: request.email,
      subject: `New Support Request — ${request.subject}`,
      text: `New support request submitted on ShabooAgri.\n\nFrom: ${request.name} <${request.email}>\nSubject: ${request.subject}\n\nMessage:\n${request.message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1B7A3E; margin-top: 0;">New Support Request</h2>
          <p><strong>From:</strong> ${request.name} (${request.email})</p>
          <p><strong>Subject:</strong> ${request.subject}</p>
          <p style="white-space: pre-wrap; background: #f4fbf6; padding: 12px; border-radius: 6px;">${request.message}</p>
        </div>
      `,
    });

    return true;
  } catch (err: any) {
    console.error("[MailService] Failed to send support request notification via SMTP:", err.message);
    return false;
  }
}
