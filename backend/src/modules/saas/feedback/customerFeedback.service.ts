import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import type { CreateFeedbackInput, UpdateFeedbackInput } from "./customerFeedback.validation";

export class CustomerFeedbackService {
  async submitFeedback(saasUserId: string, input: CreateFeedbackInput) {
    const feedback = await prisma.customerFeedback.create({
      data: {
        saasUserId,
        companyId: input.companyId,
        category: input.category,
        rating: input.rating,
        comment: input.comment,
        status: "SUBMITTED",
      },
    });

    return feedback;
  }

  async getMyFeedback(saasUserId: string) {
    return prisma.customerFeedback.findMany({
      where: { saasUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAllFeedback() {
    return prisma.customerFeedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        saasUser: {
          select: { id: true, email: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateFeedback(id: string, input: UpdateFeedbackInput) {
    const existing = await prisma.customerFeedback.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, "Feedback record not found");
    }

    const updated = await prisma.customerFeedback.update({
      where: { id },
      data: input,
    });

    return updated;
  }
}
