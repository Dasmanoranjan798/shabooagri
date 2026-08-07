import { PrismaClient } from "@prisma/client";

// Single PrismaClient instance for the whole process. Every module's
// *.repository.ts imports it from here — no module creates its own client.
export const prisma = new PrismaClient();
