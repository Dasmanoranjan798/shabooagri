import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import type { CreateContactEnquiryInput, UpdateContactEnquiryInput } from "./contactEnquiry.validation";

export class ContactEnquiryService {
  async submitEnquiry(input: CreateContactEnquiryInput) {
    const enquiry = await prisma.contactEnquiry.create({
      data: {
        name: input.name,
        businessName: input.businessName,
        phone: input.phone,
        email: input.email,
        subject: input.subject,
        message: input.message,
        status: "UNREAD",
      },
    });

    return enquiry;
  }

  async listEnquiries() {
    return prisma.contactEnquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedAdmin: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async updateEnquiry(id: string, input: UpdateContactEnquiryInput) {
    const existing = await prisma.contactEnquiry.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, "Contact enquiry not found");
    }

    const updated = await prisma.contactEnquiry.update({
      where: { id },
      data: input,
    });

    return updated;
  }
}
