import { prisma } from "../../../db/prisma";
import { AppError } from "../../../shared/errors/AppError";
import { calculateSaasAnnualTax } from "../utils/saasTaxCalculator";
import type { RecordSaasPaymentInput } from "./saasPayment.validation";

export class SaasPaymentService {
  async getMyPayments(saasUserId: string) {
    return prisma.saaSPayment.findMany({
      where: { saasUserId },
      orderBy: { createdAt: "desc" },
      include: {
        license: {
          select: { id: true, licenseNumber: true, status: true, startDate: true, expiryDate: true },
        },
      },
    });
  }

  async listAllPayments() {
    return prisma.saaSPayment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        saasUser: {
          select: { id: true, email: true, phone: true },
        },
        license: {
          select: { id: true, licenseNumber: true, status: true },
        },
      },
    });
  }

  async recordPayment(adminSaasUserId: string, input: RecordSaasPaymentInput) {
    const userExists = await prisma.saasUser.findUnique({
      where: { id: input.saasUserId },
    });

    if (!userExists) {
      throw new AppError(404, "Target SaaS User not found");
    }

    const tax = calculateSaasAnnualTax(input.isInterState);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.saaSPayment.create({
        data: {
          saasUserId: input.saasUserId,
          licenseId: input.licenseId,
          gatewayOrderId: input.gatewayOrderId,
          gatewayPaymentId: input.gatewayPaymentId,
          gatewaySignature: input.gatewaySignature,
          paymentReference: input.paymentReference,
          baseAmount: tax.baseAmount,
          gstAmount: tax.gstAmount,
          totalAmount: tax.totalAmount,
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          currency: "INR",
          status: input.status,
          paymentMethod: input.paymentMethod,
          gatewayPayload: input.gatewayPayload,
          notes: input.notes,
        },
      });

      let updatedLicense = null;
      if (input.status === "SUCCESS") {
        // If a licenseId is provided, update it; otherwise update the user's latest license
        const targetLicenseId =
          input.licenseId ||
          (
            await tx.license.findFirst({
              where: { saasUserId: input.saasUserId },
              orderBy: { createdAt: "desc" },
            })
          )?.id;

        if (targetLicenseId) {
          const startDate = new Date();
          const expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

          updatedLicense = await tx.license.update({
            where: { id: targetLicenseId },
            data: {
              paymentId: payment.id,
              status: "LICENSE_ACTIVE",
              startDate,
              expiryDate,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          saasUserId: adminSaasUserId,
          entityType: "SaaSPayment",
          entityId: payment.id,
          action: "SAAS_PAYMENT_RECORDED",
          changes: {
            saasUserId: input.saasUserId,
            totalAmount: tax.totalAmount,
            status: input.status,
            paymentReference: input.paymentReference,
          },
        },
      });

      return { payment, license: updatedLicense };
    });

    return result;
  }
}
