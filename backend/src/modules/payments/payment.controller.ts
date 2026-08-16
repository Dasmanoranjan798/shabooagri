import type { Request, Response } from "express";
import { requireUser } from "../../shared/utils/requireUser";
import * as paymentService from "./payment.service";
import {
  createManualInvoiceSchema,
  receivePaymentSchema,
  recordCustomerAdvanceSchema,
  updateInvoiceTaxSchema,
} from "./payment.validators";

export async function listInvoices(req: Request, res: Response) {
  const user = requireUser(req);
  const invoices = await paymentService.listInvoices(user.companyId, user);
  res.json(invoices);
}

export async function createManualInvoice(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createManualInvoiceSchema.parse(req.body);
  const invoice = await paymentService.createManualInvoice(user.companyId, input);
  res.status(201).json(invoice);
}

export async function recordCustomerAdvance(req: Request, res: Response) {
  const user = requireUser(req);
  const input = recordCustomerAdvanceSchema.parse(req.body);
  const advance = await paymentService.recordCustomerAdvance(user.companyId, user, input);
  res.status(201).json(advance);
}

export async function listCustomerAdvances(req: Request, res: Response) {
  const user = requireUser(req);
  const advances = await paymentService.listCustomerAdvances(user.companyId, user);
  res.json(advances);
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

export async function updateInvoiceTax(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateInvoiceTaxSchema.parse(req.body);
  const result = await paymentService.updateInvoiceTax(user.companyId, req.params.id, user, input);
  res.json(result);
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
