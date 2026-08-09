import nodemailer from "nodemailer";
import { env } from "../../config/env";

export async function sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<boolean> {
  if (env.SMTP_HOST && env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: toEmail,
        subject: "Reset Your ShabooAgri Password",
        text: `Hello,\n\nA password reset was requested for your ShabooAgri account.\n\nPlease use the link below to reset your password:\n${resetLink}\n\nThis reset link is valid for 15 minutes and can only be used once.\n\nIf you did not request this reset, please ignore this email.\n\nRegards,\nShabooAgri Support`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
            <h2 style="color: #1B7A3E; margin-top: 0;">ShabooAgri Password Reset</h2>
            <p>Hello,</p>
            <p>A password reset was requested for your ShabooAgri account associated with <strong>${toEmail}</strong>.</p>
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
  } else {
    console.log(`[MailService] SMTP not configured. Generated reset link safely for ${toEmail}.`);
    return true;
  }
}
