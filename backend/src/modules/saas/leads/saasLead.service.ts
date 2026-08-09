import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import type { CreateLeadInput, UpdateLeadInput } from "./saasLead.validation";

export class SaasLeadService {
  async createLead(input: CreateLeadInput, createdBySaasUserId?: string) {
    const lead = await prisma.saaSLead.create({
      data: {
        name: input.name,
        businessName: input.businessName,
        phone: input.phone,
        email: input.email,
        source: input.source || "WEBSITE",
        status: "NEW",
        createdBySaasUserId,
      },
    });

    return lead;
  }

  async listLeads() {
    return prisma.saaSLead.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedAdmin: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async updateLead(leadId: string, input: UpdateLeadInput) {
    const existing = await prisma.saaSLead.findUnique({
      where: { id: leadId },
    });

    if (!existing) {
      throw new AppError(404, "Lead not found");
    }

    const updated = await prisma.saaSLead.update({
      where: { id: leadId },
      data: input,
    });

    return updated;
  }
}
