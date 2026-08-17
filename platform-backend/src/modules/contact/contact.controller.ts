import type { Request, Response } from "express";
import * as contactService from "./contact.service";
import { feedbackSchema, supportRequestSchema } from "./contact.validators";

export async function submitFeedback(req: Request, res: Response) {
  const input = feedbackSchema.parse(req.body);
  const feedback = await contactService.submitFeedback(input, req.platformUser?.id ?? null);
  res.status(201).json({ id: feedback.id, message: "Thank you for your feedback." });
}

export async function submitSupportRequest(req: Request, res: Response) {
  const input = supportRequestSchema.parse(req.body);
  const request = await contactService.submitSupportRequest(input, req.platformUser?.id ?? null);
  res.status(201).json({ id: request.id, message: "Your request has been received. Our team will get back to you soon." });
}
