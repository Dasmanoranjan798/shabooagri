export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "WORKING"
  | "COMPLETED"
  | "CANCELLED";

export interface BookingAttachment {
  id: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  companyId: string;
  bookingNumber: string;
  customerId: string;
  villageId: string;
  location: string | null;
  machineId: string | null;
  driverId: string | null;
  managerId: string;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedHours: number | null;
  estimatedAcres: number | null;
  // Pricing is assigned on the Live Job screen right before Start, not at
  // booking time — null on every freshly created booking.
  pricingMethodId: string | null;
  rate: number | null;
  // Optional minimum billable floor (§8.2): final = max(metered, minimumCharge).
  minimumCharge: number | null;
  estimatedAmount: number | null;
  status: BookingStatus;
  workDescription: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    village: { id: string; name: string };
  };
  village: { id: string; name: string };
  machine: {
    id: string;
    registrationNumber: string;
    brand: string | null;
    model: string | null;
  } | null;
  driver: {
    id: string;
    employee: { name: string; phone?: string | null };
  } | null;
  manager: { id: string; fullName: string };
  pricingMethod: { id: string; key: string; label: string; unit: string | null } | null;
  attachments?: BookingAttachment[];
}

export interface CustomerOption {
  id: string;
  name: string;
  villageId: string;
  village?: { id: string; name: string };
  phone?: string | null;
}

export interface VillageOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface MachineOption {
  id: string;
  registrationNumber: string;
  brand: string | null;
  model: string | null;
  status: string;
}

export interface DriverOption {
  id: string;
  employee: { id: string; name: string };
}

export interface PricingMethodOption {
  id: string;
  key: string;
  label: string;
  unit: string | null;
}

export interface CreateBookingPayload {
  customerId: string;
  villageId: string;
  location?: string;
  machineId?: string;
  driverId?: string;
  managerId?: string;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedHours?: number;
  estimatedAcres?: number;
  workDescription: string;
  notes?: string;
}

// Deliberately excludes pricingMethodId/rate — assigned via the dedicated
// assignBookingPricing call below (the Live Job screen's pre-Start step),
// not a general booking-edit field.
export interface UpdateBookingPayload {
  customerId?: string;
  villageId?: string;
  location?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedHours?: number;
  estimatedAcres?: number;
  workDescription?: string;
  notes?: string;
}

export interface AssignPricingPayload {
  pricingMethodId: string;
  rate: number;
  // Optional minimum billable floor (§8.2). Null/omitted clears any prior floor.
  minimumCharge?: number | null;
}
