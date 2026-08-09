import type { NextFunction, Request, Response } from "express";
import { CustomerFeedbackService } from "./customerFeedback.service";
import { createFeedbackSchema, updateFeedbackSchema } from "./customerFeedback.validation";

const service = new CustomerFeedbackService();

export class CustomerFeedbackController {
  async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const validated = createFeedbackSchema.parse(req.body);
      const feedback = await service.submitFeedback(saasUserId, validated);
      res.status(201).json({ success: true, data: feedback });
    } catch (err) {
      next(err);
    }
  }

  async getMyFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const feedback = await service.getMyFeedback(saasUserId);
      res.status(200).json({ success: true, data: feedback });
    } catch (err) {
      next(err);
    }
  }

  async listAllFeedback(_req: Request, res: Response, next: NextFunction) {
    try {
      const feedback = await service.listAllFeedback();
      res.status(200).json({ success: true, data: feedback });
    } catch (err) {
      next(err);
    }
  }

  async updateFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateFeedbackSchema.parse(req.body);
      const updated = await service.updateFeedback(id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
