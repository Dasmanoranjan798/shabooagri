import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../logger";

export async function sendPasswordResetEmail(toEmail: string, resetLink: string, token?: string): Promise<boolean> {
  // Copy/paste fallback: if the App Link doesn't open the app (iOS, desktop, or
  // an uninstalled/unverified device), the user opens ShabooAgri → "Reset
  // password" and pastes this code. Flutter's reset screen already accepts it.
  const tokenTextBlock = token
    ? `\n\nIf the link doesn't open the ShabooAgri app, open the app, choose "Reset Password", and paste this code:\n${token}\n`
    : "";
  const tokenHtmlBlock = token
    ? `<p style="font-size: 0.88rem; color: #666; margin-top: 20px;">If the button doesn't open the ShabooAgri app, open the app, choose <strong>Reset Password</strong>, and paste this code:</p>
       <p style="font-family: monospace; font-size: 0.9rem; word-break: break-all; background:#f4fbf6; padding:10px; border-radius:6px; color:#1B7A3E;">${token}</p>`
    : "";
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
        text: `Hello,\n\nA password reset was requested for your ShabooAgri account.\n\nPlease use the link below to reset your password:\n${resetLink}${tokenTextBlock}\n\nThis reset link is valid for 15 minutes and can only be used once.\n\nIf you did not request this reset, please ignore this email.\n\nRegards,\nShabooAgri Support`,
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
            ${tokenHtmlBlock}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #888;">This link will expire in 15 minutes and can only be used once. If you did not request a password reset, no action is needed.</p>
          </div>
        `,
      });

      return true;
    } catch (err: any) {
      logger.error("mail.reset.failed", { err });
      return false;
    }
  } else {
    logger.warn("mail.reset.smtp_not_configured");
    return true;
  }
}

export async function sendStaffInviteEmail(
  toEmail: string,
  inviteLink: string,
  companyName: string,
  roleName: string,
  inviterName: string,
  token?: string,
): Promise<boolean> {
  // Copy/paste fallback into the app's "Accept invite" screen when the App Link
  // doesn't open the app directly.
  const tokenTextBlock = token
    ? `\n\nIf the link doesn't open the ShabooAgri app, open the app, choose "Accept Invite", and paste this code:\n${token}\n`
    : "";
  const tokenHtmlBlock = token
    ? `<p style="font-size: 0.88rem; color: #666; margin-top: 20px;">If the button doesn't open the ShabooAgri app, open the app, choose <strong>Accept Invite</strong>, and paste this code:</p>
       <p style="font-family: monospace; font-size: 0.9rem; word-break: break-all; background:#f4fbf6; padding:10px; border-radius:6px; color:#1B7A3E;">${token}</p>`
    : "";
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
        subject: `You've been invited to join ${companyName} on ShabooAgri`,
        text: `Hello,\n\n${inviterName} has invited you to join ${companyName} on ShabooAgri as a ${roleName}.\n\nUse the link below to set your password and get started:\n${inviteLink}${tokenTextBlock}\n\nThis invite link is valid for 7 days and can only be used once.\n\nIf you were not expecting this invite, you can safely ignore this email.\n\nRegards,\nShabooAgri`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
            <h2 style="color: #1B7A3E; margin-top: 0;">You're invited to join ${companyName}</h2>
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on ShabooAgri as a <strong>${roleName}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteLink}" style="background-color: #1B7A3E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invite</a>
            </p>
            <p style="font-size: 0.88rem; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 0.82rem; word-break: break-all; color: #1B7A3E;">${inviteLink}</p>
            ${tokenHtmlBlock}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #888;">This invite link will expire in 7 days and can only be used once. If you were not expecting this invite, no action is needed.</p>
          </div>
        `,
      });

      return true;
    } catch (err: any) {
      logger.error("mail.invite.failed", { err });
      return false;
    }
  } else {
    logger.warn("mail.invite.smtp_not_configured");
    return true;
  }
}

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
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
        subject: `Your ShabooAgri Verification Code: ${otpCode}`,
        text: `Hello,\n\nYour ShabooAgri verification code is: ${otpCode}\n\nThis code is valid for 5 minutes.\n\nRegards,\nShabooAgri`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1B7A3E; margin-top: 0;">Verification Code</h2>
            <p>Hello,</p>
            <p>Your ShabooAgri verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1B7A3E; margin: 20px 0; padding: 12px; background-color: #f4fbf6; display: inline-block; border-radius: 6px;">
              ${otpCode}
            </div>
            <p style="font-size: 0.88rem; color: #666;">This code is valid for 5 minutes. Do not share this code with anyone.</p>
          </div>
        `,
      });

      return true;
    } catch (err: any) {
      logger.error("mail.otp.failed", { err });
      return false;
    }
  } else {
    logger.warn("mail.otp.smtp_not_configured");
    return true;
  }
}
