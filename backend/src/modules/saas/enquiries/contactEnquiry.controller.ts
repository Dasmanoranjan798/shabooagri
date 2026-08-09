import type { NextFunction, Request, Response } from "express";
import { ContactEnquiryService } from "./contactEnquiry.service";
import { createContactEnquirySchema, updateContactEnquirySchema } from "./contactEnquiry.validation";

const service = new ContactEnquiryService();

export class ContactEnquiryController {
  async submitEnquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createContactEnquirySchema.parse(req.body);
      const enquiry = await service.submitEnquiry(validated);
      res.status(201).json({ success: true, data: enquiry });
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

  async updateEnquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateContactEnquirySchema.parse(req.body);
      const updated = await service.updateEnquiry(id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
