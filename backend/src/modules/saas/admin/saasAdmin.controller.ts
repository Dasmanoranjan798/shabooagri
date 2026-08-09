import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { SaasAdminService } from "./saasAdmin.service";

const service = new SaasAdminService();

const extendLicenseSchema = z.object({
  licenseId: z.string().uuid(),
  extensionDays: z.number().int().positive().default(30),
  reason: z.string().min(3),
});

export class SaasAdminController {
  async getDashboardMetrics(_req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await service.getDashboardMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }

  async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const customers = await service.listCustomers(search);
      res.status(200).json({ success: true, data: customers });
    } catch (err) {
      next(err);
    }
  }

  async listLicenses(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const licenses = await service.listLicenses(status);
      res.status(200).json({ success: true, data: licenses });
    } catch (err) {
      next(err);
    }
  }

  async extendLicense(req: Request, res: Response, next: NextFunction) {
    try {
      const adminSaasUserId = req.saasUser!.id;
      const { licenseId, extensionDays, reason } = extendLicenseSchema.parse(req.body);
      const result = await service.extendLicense(adminSaasUserId, licenseId, extensionDays, reason);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const payments = await service.listPayments(status);
      res.status(200).json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  }

  async listLeads(_req: Request, res: Response, next: NextFunction) {
    try {
      const leads = await service.listLeads();
      res.status(200).json({ success: true, data: leads });
    } catch (err) {
      next(err);
    }
  }

  async updateLeadStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, followUpNotes } = req.body;
      const adminId = req.saasUser!.id;
      const updated = await service.updateLeadStatus(id, status, followUpNotes, adminId);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async listEnquiries(_req: Request, res: Response, next: NextFunction) {
    try {
      const enquiries = await service.listEnquiries();
      res.status(200).json({ success: true, data: enquiries });
    } catch (err) {
      next(err);
    }
  }

  async updateEnquiryStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, responseNotes } = req.body;
      const adminId = req.saasUser!.id;
      const updated = await service.updateEnquiryStatus(id, status, responseNotes, adminId);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async listFeedback(_req: Request, res: Response, next: NextFunction) {
    try {
      const feedback = await service.listFeedback();
      res.status(200).json({ success: true, data: feedback });
    } catch (err) {
      next(err);
    }
  }

  async updateFeedbackStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      const updated = await service.updateFeedbackStatus(id, status, adminNotes);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
