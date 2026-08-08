import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as paymentController from "./payment.controller";

export const invoiceRouter = Router();
export const paymentRouter = Router();

invoiceRouter.use(authMiddleware);
paymentRouter.use(authMiddleware);

// Scoped read routes — company-wide for Owner/Manager, customer-scoped for Farmer
invoiceRouter.get("/", asyncHandler(paymentController.listInvoices));
invoiceRouter.get("/:id", asyncHandler(paymentController.getInvoiceById));
invoiceRouter.get("/:id/receipt", asyncHandler(paymentController.getReceipt));

// Gated payment write route — requires payment.receive permission (seeded on Owner and Manager)
invoiceRouter.post(
  "/:id/payments",
  requirePermission("payment.receive"),
  asyncHandler(paymentController.receivePayment),
);

// Scoped payment history routes
paymentRouter.get("/", asyncHandler(paymentController.listPayments));
paymentRouter.get("/:id", asyncHandler(paymentController.getPaymentById));
