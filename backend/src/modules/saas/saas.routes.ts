import { Router } from "express";
import { saasAdminRouter } from "./admin/saasAdmin.routes";
import { saasAuthRouter } from "./auth/saasAuth.routes";
import { saasCustomerRouter } from "./customers/saasCustomer.routes";
import { contactEnquiryRouter } from "./enquiries/contactEnquiry.routes";
import { customerFeedbackRouter } from "./feedback/customerFeedback.routes";
import { saasLeadRouter } from "./leads/saasLead.routes";
import { saasLicenseRouter } from "./licenses/saasLicense.routes";
import { saasPaymentRouter } from "./payments/saasPayment.routes";

export const saasRouter = Router();

saasRouter.use("/auth", saasAuthRouter);
saasRouter.use("/customers", saasCustomerRouter);
saasRouter.use("/leads", saasLeadRouter);
saasRouter.use("/licenses", saasLicenseRouter);
saasRouter.use("/payments", saasPaymentRouter);
saasRouter.use("/enquiries", contactEnquiryRouter);
saasRouter.use("/feedback", customerFeedbackRouter);
saasRouter.use("/admin", saasAdminRouter);
