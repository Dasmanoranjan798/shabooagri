import { prisma } from "../../db/prisma";
import { sendFeedbackNotification, sendSupportRequestNotification } from "../../shared/services/mail.service";
import type { FeedbackInput, SupportRequestInput } from "./contact.validators";

// The DB write is the source of truth for both the admin dashboard tiles
// and the admin's list views — it must succeed regardless of whether the
// notification email goes out. Email failure (or SMTP being unconfigured
// in dev) is logged inside the mail service and never bubbles up here.
export async function submitFeedback(input: FeedbackInput, platformUserId: string | null) {
  const feedback = await prisma.feedback.create({
    data: { ...input, platformUserId },
  });
  await sendFeedbackNotification(input);
  return feedback;
}

export async function submitSupportRequest(input: SupportRequestInput, platformUserId: string | null) {
  const request = await prisma.supportRequest.create({
    data: { ...input, platformUserId },
  });
  await sendSupportRequestNotification(input);
  return request;
}
