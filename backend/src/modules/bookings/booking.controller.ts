import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { requireUser } from "../../shared/utils/requireUser";
import * as bookingService from "./booking.service";
import {
  assignDriverSchema,
  assignMachineSchema,
  assignPricingSchema,
  createBookingSchema,
  updateBookingSchema,
} from "./booking.validators";

export async function list(req: Request, res: Response) {
  const user = requireUser(req);
  const bookings = await bookingService.list(user.companyId, user);
  res.status(200).json(bookings);
}

export async function getById(req: Request, res: Response) {
  const user = requireUser(req);
  const booking = await bookingService.getById(user.companyId, req.params.id, user);
  res.status(200).json(booking);
}

export async function create(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createBookingSchema.parse(req.body);
  const booking = await bookingService.create(user.companyId, user.id, input);
  res.status(201).json(booking);
}

export async function updateDetails(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateBookingSchema.parse(req.body);
  const booking = await bookingService.updateDetails(user.companyId, req.params.id, input);
  res.status(200).json(booking);
}

export async function assignMachine(req: Request, res: Response) {
  const user = requireUser(req);
  const { machineId } = assignMachineSchema.parse(req.body);
  const booking = await bookingService.assignMachine(user.companyId, req.params.id, machineId);
  res.status(200).json(booking);
}

export async function assignDriver(req: Request, res: Response) {
  const user = requireUser(req);
  const { driverId } = assignDriverSchema.parse(req.body);
  const booking = await bookingService.assignDriver(user.companyId, req.params.id, driverId);
  res.status(200).json(booking);
}

export async function assignPricing(req: Request, res: Response) {
  const user = requireUser(req);
  const { pricingMethodId, rate } = assignPricingSchema.parse(req.body);
  const booking = await bookingService.assignPricing(user.companyId, req.params.id, pricingMethodId, rate);
  res.status(200).json(booking);
}

export async function remove(req: Request, res: Response) {
  const user = requireUser(req);
  await bookingService.remove(user.companyId, req.params.id);
  res.status(204).send();
}

export async function listAttachments(req: Request, res: Response) {
  const user = requireUser(req);
  const attachments = await bookingService.listAttachments(user.companyId, req.params.id, user);
  res.status(200).json(attachments);
}

export async function addAttachment(req: Request, res: Response) {
  const user = requireUser(req);
  if (!req.file) {
    throw new AppError(400, "No file uploaded (expected multipart field \"file\")");
  }
  const fileUrl = `/uploads/booking-attachments/${user.companyId}/${req.params.id}/${req.file.filename}`;
  const attachment = await bookingService.addAttachment(user.companyId, req.params.id, user.id, fileUrl);
  res.status(201).json(attachment);
}
