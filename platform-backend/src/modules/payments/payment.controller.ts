import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { requirePlatformUser } from "../../shared/utils/requirePlatformUser";
import * as paymentService from "./payment.service";
import { createOrderSchema, verifyPaymentSchema } from "./payment.validators";

export async function createOrder(req: Request, res: Response) {
  const user = requirePlatformUser(req);
  const input = createOrderSchema.parse(req.body);
  const result = await paymentService.createOrder(user.id, input);
  res.status(201).json(result);
}

export async function verifyPayment(req: Request, res: Response) {
  const user = requirePlatformUser(req);
  const input = verifyPaymentSchema.parse(req.body);
  const result = await paymentService.verifyPayment(user.id, input);
  res.status(200).json(result);
}
