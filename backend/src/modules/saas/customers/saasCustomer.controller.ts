import type { NextFunction, Request, Response } from "express";
import { SaasCustomerService, updateCustomerProfileSchema } from "./saasCustomer.service";

const service = new SaasCustomerService();

export class SaasCustomerController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const profile = await service.getProfile(saasUserId);
      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const validatedInput = updateCustomerProfileSchema.parse(req.body);
      const profile = await service.updateProfile(saasUserId, validatedInput);
      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
}
