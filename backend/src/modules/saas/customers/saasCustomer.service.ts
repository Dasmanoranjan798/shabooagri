import { z } from "zod";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";

export const updateCustomerProfileSchema = z.object({
  businessName: z.string().min(2).optional(),
  contactPerson: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
});

export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;

export class SaasCustomerService {
  async getProfile(saasUserId: string) {
    const profile = await prisma.saaSCustomerProfile.findUnique({
      where: { saasUserId },
    });

    if (!profile) {
      throw new AppError(404, "Customer profile not found");
    }

    return profile;
  }

  async updateProfile(saasUserId: string, input: UpdateCustomerProfileInput) {
    const profile = await prisma.saaSCustomerProfile.findUnique({
      where: { saasUserId },
    });

    if (!profile) {
      throw new AppError(404, "Customer profile not found");
    }

    const updated = await prisma.saaSCustomerProfile.update({
      where: { saasUserId },
      data: input,
    });

    return updated;
  }
}
