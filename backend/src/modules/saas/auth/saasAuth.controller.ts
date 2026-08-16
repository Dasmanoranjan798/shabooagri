import type { NextFunction, Request, Response } from "express";
import { SaasAuthService } from "./saasAuth.service";
import {
  saasChangePasswordSchema,
  saasForgotPasswordSchema,
  saasLoginSchema,
  saasRegisterSchema,
  saasResetPasswordSchema,
  saasVerifyResetTokenSchema,
} from "./saasAuth.validation";
import { SaasSsoService } from "./saasSso.service";

const saasAuthService = new SaasAuthService();
const ssoService = new SaasSsoService();

export class SaasAuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = saasRegisterSchema.parse(req.body);
      const result = await saasAuthService.register(validatedInput);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = saasLoginSchema.parse(req.body);
      const result = await saasAuthService.login(validatedInput);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const user = await saasAuthService.getMe(saasUserId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const validatedInput = saasChangePasswordSchema.parse(req.body);
      const result = await saasAuthService.changePassword(saasUserId, validatedInput);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = saasForgotPasswordSchema.parse(req.body);
      const result = await saasAuthService.requestPasswordReset(validatedInput);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async verifyResetToken(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = saasVerifyResetTokenSchema.parse(req.body);
      const result = await saasAuthService.verifyPasswordResetToken(validatedInput);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = saasResetPasswordSchema.parse(req.body);
      const result = await saasAuthService.confirmPasswordReset(validatedInput);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createSsoToken(req: Request, res: Response, next: NextFunction) {
    try {
      const saasUserId = req.saasUser!.id;
      const result = await ssoService.createSsoLaunchToken(saasUserId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async exchangeSsoToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body || req.query;
      const result = await ssoService.exchangeSsoToken(token as string);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
