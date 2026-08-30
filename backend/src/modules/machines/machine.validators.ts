import { z } from "zod";

const fuelTypeSchema = z.enum(["DIESEL", "PETROL", "ELECTRIC", "OTHER"]);
const machineStatusSchema = z.enum(["WORKING", "AVAILABLE", "REPAIR", "OFFLINE"]);

export const createMachineSchema = z.object({
  // Client-authoritative offline id (see villages validator); optional + UUID.
  id: z.string().uuid().optional(),
  machineTypeId: z.string().uuid(),
  registrationNumber: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchaseYear: z.coerce.number().int().optional(),
  fuelType: fuelTypeSchema.optional(),
  status: machineStatusSchema.optional(),
  hourMeterReading: z.coerce.number().nonnegative().optional(),
  insuranceNumber: z.string().optional(),
  insuranceExpiryDate: z.coerce.date().optional(),
  assignedDriverId: z.string().uuid().optional(),
  nextServiceDueHours: z.coerce.number().nonnegative().optional(),
  lastServiceDate: z.coerce.date().optional(),
  lastServiceHourMeter: z.coerce.number().nonnegative().optional(),
  photoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const updateMachineSchema = createMachineSchema.partial();

export type CreateMachineInput = z.infer<typeof createMachineSchema>;
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
