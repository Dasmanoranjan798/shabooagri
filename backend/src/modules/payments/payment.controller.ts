import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as paymentService from "./payment.service";
import { receivePaymentSchema } from "./payment.validators";

export async function listInvoices(req: Request, res: Response) {
  const user = requireUser(req);
  const invoices = await paymentService.listInvoices(user.companyId, user);
  res.json(invoices);
}

export async function getInvoiceById(req: Request, res: Response) {
  const user = requireUser(req);
  const invoice = await paymentService.getInvoiceById(user.companyId, req.params.id, user);
  res.json(invoice);
}

export async function receivePayment(req: Request, res: Response) {
  const user = requireUser(req);
  const input = receivePaymentSchema.parse(req.body);
  const result = await paymentService.receivePayment(user.companyId, req.params.id, user, input);
  res.status(201).json(result);
}

export async function listPayments(req: Request, res: Response) {
  const user = requireUser(req);
  const invoiceId = typeof req.query.invoiceId === "string" ? req.query.invoiceId : undefined;
  const payments = await paymentService.listPayments(user.companyId, user, invoiceId);
  res.json(payments);
}

export async function getPaymentById(req: Request, res: Response) {
  const user = requireUser(req);
  const payment = await paymentService.getPaymentById(user.companyId, req.params.id, user);
  res.json(payment);
}

export async function getReceipt(req: Request, res: Response) {
  const user = requireUser(req);
  const receipt = await paymentService.getReceipt(user.companyId, req.params.id, user);
  res.json(receipt);
}
