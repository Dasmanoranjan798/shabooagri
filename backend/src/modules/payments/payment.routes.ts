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
invoiceRouter.post("/filter", asyncHandler(paymentController.filterInvoices));

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

// Cancel, not delete (§ dependency-locked deletion, Rule 1 & 5) — Owner-only.
invoiceRouter.post(
  "/:id/cancel",
  requirePermission("payment.cancel"),
  asyncHandler(paymentController.cancelInvoice),
);

// Scoped payment history routes
paymentRouter.get("/", asyncHandler(paymentController.listPayments));

// NOTE: there is no customer-advance endpoint. Advance/credit is created only
// as the leftover of an overpayment in recordPaymentTx (never as a standalone
// entry), and the resulting available credit is surfaced on the customer
// itself (customer.service.listWithFinance → creditBalance), so the old
// read-only GET /advances had no remaining consumer and was removed.
paymentRouter.get("/:id", asyncHandler(paymentController.getPaymentById));

// Cancel, not delete (§ dependency-locked deletion, Rule 1 & 5) — Owner-only.
paymentRouter.post(
  "/:id/cancel",
  requirePermission("payment.cancel"),
  asyncHandler(paymentController.cancelPayment),
);
