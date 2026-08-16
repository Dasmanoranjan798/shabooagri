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

// Manual invoice creation — for cases the completed-job pipeline doesn't
// cover (custom charges, backlog entries). Same permission as receiving a
// payment since both are financial write actions on this page.
invoiceRouter.post(
  "/",
  requirePermission("payment.receive"),
  asyncHandler(paymentController.createManualInvoice),
);

invoiceRouter.get("/:id", asyncHandler(paymentController.getInvoiceById));
invoiceRouter.get("/:id/receipt", asyncHandler(paymentController.getReceipt));

// Gated payment write route — requires payment.receive permission (seeded on Owner and Manager)
invoiceRouter.post(
  "/:id/payments",
  requirePermission("payment.receive"),
  asyncHandler(paymentController.receivePayment),
);

invoiceRouter.patch(
  "/:id/tax",
  requirePermission("payment.receive"),
  asyncHandler(paymentController.updateInvoiceTax),
);

// Scoped payment history routes
paymentRouter.get("/", asyncHandler(paymentController.listPayments));

// Customer advances (money received with no invoice yet) — registered
// before the "/:id" route below so "/advances" doesn't get swallowed as an id.
paymentRouter.get("/advances", asyncHandler(paymentController.listCustomerAdvances));
paymentRouter.post(
  "/advances",
  requirePermission("payment.receive"),
  asyncHandler(paymentController.recordCustomerAdvance),
);

paymentRouter.get("/:id", asyncHandler(paymentController.getPaymentById));
