import type { NextFunction, Request, Response } from "express";
import { SaasLicenseService } from "./saasLicense.service";
import { issueLicenseSchema, updateLicenseStatusSchema } from "./saasLicense.validation";

const service = new SaasLicenseService();

export class SaasLicenseController {
  async getMyLicense(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const licenses = await service.getMyLicense(saasUserId);
      res.status(200).json({ success: true, data: licenses });
    } catch (err) {
      next(err);
    }
  }

  async listAllLicenses(_req: Request, res: Response, next: NextFunction) {
    try {
      const licenses = await service.listAllLicenses();
      res.status(200).json({ success: true, data: licenses });
    } catch (err) {
      next(err);
    }
  }

  async issueLicense(req: Request, res: Response, next: NextFunction) {
    try {
      const adminSaasUserId = req.saasUser!.id;
      const validated = issueLicenseSchema.parse(req.body);
      const license = await service.issueLicense(adminSaasUserId, validated);
      res.status(201).json({ success: true, data: license });
    } catch (err) {
      next(err);
    }
  }

  async updateLicenseStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const adminSaasUserId = req.saasUser!.id;
      const { id } = req.params;
      const validated = updateLicenseStatusSchema.parse(req.body);
      const updated = await service.updateLicenseStatus(adminSaasUserId, id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
