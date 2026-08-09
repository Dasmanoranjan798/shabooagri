import type { NextFunction, Request, Response } from "express";
import { SaasLeadService } from "./saasLead.service";
import { createLeadSchema, updateLeadSchema } from "./saasLead.validation";

const service = new SaasLeadService();

export class SaasLeadController {
  async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createLeadSchema.parse(req.body);
      const createdBySaasUserId = req.saasUser?.id;
      const lead = await service.createLead(validated, createdBySaasUserId);
      res.status(201).json({ success: true, data: lead });
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

  async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateLeadSchema.parse(req.body);
      const updated = await service.updateLead(id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
