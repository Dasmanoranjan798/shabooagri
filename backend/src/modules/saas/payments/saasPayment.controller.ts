import type { NextFunction, Request, Response } from "express";
import { SaasPaymentService } from "./saasPayment.service";
import { recordSaasPaymentSchema } from "./saasPayment.validation";
import { SaasPaymentGatewayService } from "./saasPaymentGateway.service";

const service = new SaasPaymentService();
const gatewayService = new SaasPaymentGatewayService();

export class SaasPaymentController {
  async getMyPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const payments = await service.getMyPayments(saasUserId);
      res.status(200).json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  }

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const result = await gatewayService.createOrder(saasUserId, req.body || {});
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const result = await gatewayService.verifyPayment(saasUserId, req.body || {});
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.header("x-razorpay-signature");
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
      const result = await gatewayService.handleWebhook(rawBody, signature);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async listAllPayments(_req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await service.listAllPayments();
      res.status(200).json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  }

  async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const adminSaasUserId = req.saasUser!.id;
      const validated = recordSaasPaymentSchema.parse(req.body);
      const result = await service.recordPayment(adminSaasUserId, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
