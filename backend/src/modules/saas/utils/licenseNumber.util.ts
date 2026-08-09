import crypto from "node:crypto";
import { prisma } from "../../../db/prisma";

export async function generateUniqueLicenseNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  let licenseNumber = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    // Generate 6 uppercase alphanumeric characters
    const randomBytes = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    licenseNumber = `SAG-${currentYear}-${randomBytes}`;

    const existing = await prisma.license.findUnique({
      where: { licenseNumber },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique license number after multiple attempts");
  }

  return licenseNumber;
}
