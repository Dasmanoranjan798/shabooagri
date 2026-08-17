import { PrismaClient } from "@prisma/client";

// Single PrismaClient instance for the whole process, pointed at
// shabooagri_platform_db (PLATFORM_DATABASE_URL) — a completely separate
// database from the operational backend's PrismaClient/database. Nothing
// in this process ever opens a connection to the operational database.
export const prisma = new PrismaClient();
