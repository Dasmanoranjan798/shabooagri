import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import {
  getMachineServiceWarning,
  getMachineInsuranceWarning,
  getDriverLicenseWarning,
} from "./operationalWarnings";

export interface NotificationItem {
  id: string;
  category: "service" | "insurance" | "license" | "invoice" | "booking";
  title: string;
  subtitle: string;
  isOverdue: boolean;
  path: string;
}

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [machines, drivers, invoices, bookings, company] = await Promise.all([
        api.listMachines().catch(() => []),
        api.listDrivers().catch(() => []),
        api.listInvoices().catch(() => []),
        api.listBookings().catch(() => []),
        api.getCompanyProfile().catch(() => null),
      ]);

      const result: NotificationItem[] = [];

      machines.forEach((m) => {
        const service = getMachineServiceWarning(m, company);
        if (service.hasWarning) {
          result.push({
            id: `service-${m.id}`,
            category: "service",
            title: `${m.registrationNumber} — ${service.message}`,
            subtitle: "Equipment service",
            isOverdue: service.isOverdue,
            path: "/machines",
          });
        }

        const insurance = getMachineInsuranceWarning(m, company);
        if (insurance.hasWarning) {
          result.push({
            id: `insurance-${m.id}`,
            category: "insurance",
            title: `${m.registrationNumber} — ${insurance.message}`,
            subtitle: "Insurance / documents",
            isOverdue: insurance.isOverdue,
            path: "/machines",
          });
        }
      });

      drivers.forEach((d) => {
        const license = getDriverLicenseWarning(d, company);
        if (license.hasWarning) {
          result.push({
            id: `license-${d.id}`,
            category: "license",
            title: `${d.employee?.name || "Driver"} — ${license.message}`,
            subtitle: "Driver license",
            isOverdue: license.isOverdue,
            path: "/drivers",
          });
        }
      });

      const now = Date.now();
      invoices.forEach((inv) => {
        if (inv.status === "PAID" || !inv.dueDate) return;
        const dueMs = new Date(inv.dueDate).getTime();
        if (dueMs >= now) return;
        const daysOverdue = Math.ceil((now - dueMs) / (1000 * 60 * 60 * 24));
        result.push({
          id: `invoice-${inv.id}`,
          category: "invoice",
          title: `Invoice ${inv.invoiceNumber} — Overdue by ${daysOverdue}d`,
          subtitle: inv.customer?.name || "Payment overdue",
          isOverdue: true,
          path: "/payments",
        });
      });

      bookings.forEach((b) => {
        if (b.status !== "PENDING") return;
        result.push({
          id: `booking-${b.id}`,
          category: "booking",
          title: `Booking ${b.bookingNumber} — Awaiting acceptance`,
          subtitle: b.customer?.name || "New booking",
          isOverdue: false,
          path: "/bookings",
        });
      });

      // Overdue items first, then the rest.
      result.sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue));
      setItems(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, isLoading, reload: load };
}
