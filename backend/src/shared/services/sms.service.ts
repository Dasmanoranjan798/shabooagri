import { env } from "../../config/env";

/**
 * Normalizes phone numbers to standard 10-digit Indian phone numbers
 * or E.164 formatted international numbers.
 */
function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

/**
 * Send OTP SMS using configured SMS Provider (Fast2SMS, MSG91, Twilio, or Mock)
 */
export async function sendOtpSms(mobile: string, otpCode: string): Promise<boolean> {
  const cleanedMobile = cleanPhoneNumber(mobile);
  const provider = env.SMS_PROVIDER;
  const messageText = `Your ShabooAgri verification code is ${otpCode}. Valid for 10 minutes. Do not share this OTP with anyone.`;

  console.log(`[SmsService] Preparing SMS to ${cleanedMobile} via ${provider.toUpperCase()}`);

  try {
    if (provider === "mock" || !env.SMS_API_KEY) {
      console.log(`[SmsService][MOCK] SMS Payload to +91${cleanedMobile}: "${messageText}"`);
      return true;
    }

    if (provider === "fast2sms") {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": env.SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otpCode,
          numbers: cleanedMobile,
        }),
      });
      const data = (await response.json()) as any;
      console.log(`[SmsService][Fast2SMS] Response:`, data);
      return data?.return === true;
    }

    if (provider === "msg91") {
      const response = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "authkey": env.SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: env.SMS_TEMPLATE_ID,
          mobile: `91${cleanedMobile}`,
          otp: otpCode,
        }),
      });
      const data = (await response.json()) as any;
      console.log(`[SmsService][MSG91] Response:`, data);
      return data?.type === "success";
    }

    if (provider === "twilio") {
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
        console.warn("[SmsService][Twilio] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
        return false;
      }
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const body = new URLSearchParams({
        To: `+91${cleanedMobile}`,
        From: env.TWILIO_FROM_NUMBER,
        Body: messageText,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const data = (await response.json()) as any;
      console.log(`[SmsService][Twilio] Response SID: ${data.sid}`);
      return !!data.sid;
    }

    return true;
  } catch (err: any) {
    console.error(`[SmsService] Failed to send SMS to ${cleanedMobile}:`, err?.message || err);
    return false;
  }
}

/**
 * Send Staff Onboarding Invite SMS
 */
export async function sendStaffInviteSms(mobile: string, inviteLink: string, companyName: string): Promise<boolean> {
  const cleanedMobile = cleanPhoneNumber(mobile);
  const provider = env.SMS_PROVIDER;
  const messageText = `You have been invited to join ${companyName} on ShabooAgri. Click here to activate your account: ${inviteLink}`;

  console.log(`[SmsService] Sending Staff Invite SMS to ${cleanedMobile} via ${provider.toUpperCase()}`);

  if (provider === "mock" || !env.SMS_API_KEY) {
    console.log(`[SmsService][MOCK] Staff Invite to +91${cleanedMobile}: "${messageText}"`);
    return true;
  }

  try {
    if (provider === "fast2sms") {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": env.SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "v3",
          sender_id: env.SMS_SENDER_ID || "TXTIND",
          message: messageText,
          language: "english",
          numbers: cleanedMobile,
        }),
      });
      const data = (await response.json()) as any;
      return data?.return === true;
    }

    if (provider === "twilio" && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER) {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const body = new URLSearchParams({
        To: `+91${cleanedMobile}`,
        From: env.TWILIO_FROM_NUMBER,
        Body: messageText,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const data = (await response.json()) as any;
      return !!data.sid;
    }

    return true;
  } catch (err: any) {
    console.error(`[SmsService] Failed to send Staff Invite SMS to ${cleanedMobile}:`, err?.message || err);
    return false;
  }
}
