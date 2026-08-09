import type { CompanyProfile } from "../types/settings";

export interface WarningStatus {
  hasWarning: boolean;
  isOverdue: boolean;
  message: string;
  daysRemaining?: number;
  hoursRemaining?: number;
}

export function getMachineServiceWarning(
  machine: {
    hourMeterReading?: number | string | null;
    nextServiceDueHours?: number | string | null;
  },
  company?: CompanyProfile | null
): WarningStatus {
  const thresholdHours = company?.serviceAlertHours ?? 50;
  if (!machine.nextServiceDueHours) {
    return { hasWarning: false, isOverdue: false, message: "" };
  }

  const currentMeter = Number(machine.hourMeterReading ?? 0);
  const dueMeter = Number(machine.nextServiceDueHours);
  const hoursRemaining = Math.round((dueMeter - currentMeter) * 100) / 100;

  if (hoursRemaining < 0) {
    return {
      hasWarning: true,
      isOverdue: true,
      message: `Service Overdue by ${Math.abs(hoursRemaining)}h`,
      hoursRemaining,
    };
  }

  if (hoursRemaining <= thresholdHours) {
    return {
      hasWarning: true,
      isOverdue: false,
      message: `Service Due in ${hoursRemaining}h`,
      hoursRemaining,
    };
  }

  return { hasWarning: false, isOverdue: false, message: "", hoursRemaining };
}

export function getMachineInsuranceWarning(
  machine: {
    insuranceExpiryDate?: string | null;
  },
  company?: CompanyProfile | null
): WarningStatus {
  const thresholdDays = company?.insuranceAlertDays ?? 30;
  if (!machine.insuranceExpiryDate) {
    return { hasWarning: false, isOverdue: false, message: "" };
  }

  const expiryDate = new Date(machine.insuranceExpiryDate);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      hasWarning: true,
      isOverdue: true,
      message: `Insurance Expired (${Math.abs(daysRemaining)}d ago)`,
      daysRemaining,
    };
  }

  if (daysRemaining <= thresholdDays) {
    return {
      hasWarning: true,
      isOverdue: false,
      message: `Insurance Expires in ${daysRemaining}d`,
      daysRemaining,
    };
  }

  return { hasWarning: false, isOverdue: false, message: "", daysRemaining };
}

export function getDriverLicenseWarning(
  driver: {
    licenseExpiryDate?: string | null;
  },
  company?: CompanyProfile | null
): WarningStatus {
  const thresholdDays = company?.licenseAlertDays ?? 30;
  if (!driver.licenseExpiryDate) {
    return { hasWarning: false, isOverdue: false, message: "" };
  }

  const expiryDate = new Date(driver.licenseExpiryDate);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      hasWarning: true,
      isOverdue: true,
      message: `License Expired (${Math.abs(daysRemaining)}d ago)`,
      daysRemaining,
    };
  }

  if (daysRemaining <= thresholdDays) {
    return {
      hasWarning: true,
      isOverdue: false,
      message: `License Expires in ${daysRemaining}d`,
      daysRemaining,
    };
  }

  return { hasWarning: false, isOverdue: false, message: "", daysRemaining };
}
