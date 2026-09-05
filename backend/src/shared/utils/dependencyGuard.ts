import { AppError } from "../errors/AppError";

// Shared assertion functions for the dependency-locked deletion rules:
// a record with real history elsewhere in the system can never be
// hard-deleted, only cancelled/cancelled/deactivated. Deliberately a leaf
// module with no imports of its own module services — each caller already
// owns the query needed to produce its count (bookingService counts
// bookings, paymentService counts payments, ...); this file only owns the
// one, reused shape of the resulting error. Importing services here
// instead would risk a cycle (e.g. job.service -> dependencyGuard ->
// job.service for the booking-linked-job check).

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// Rule 4: Machines, Drivers, Villages, Customers, and Employees cannot be
// hard-deleted while any Booking (past or present) references them.
export function assertNoBookingReferences(entityLabel: string, bookingCount: number): void {
  if (bookingCount > 0) {
    throw new AppError(
      409,
      `Cannot delete this ${entityLabel} — ${pluralize(bookingCount, "booking")} reference it.`,
      { bookingCount },
    );
  }
}

// Rule 3, delete path: jobs.booking_id is a required, unique,
// ON DELETE RESTRICT foreign key — cancelling a Job never removes its row
// (only marks it CANCELLED, keeping the record for history), so a
// Booking can never be hard-deleted once ANY Job exists for it, cancelled
// or not. There is no direct booking-cancel action anymore — a Booking's
// status only moves to CANCELLED as a side effect of cancelling its Job
// (job.service.ts's cancel()) — so that's the real fix, not delete.
export function assertBookingDeletable(hasAnyLinkedJob: boolean): void {
  if (hasAnyLinkedJob) {
    throw new AppError(
      409,
      "Cannot delete this booking — a job exists for it and is kept for history. Cancel the job instead of deleting the booking.",
    );
  }
}

// Rule 2: a Job cannot be cancelled while a non-cancelled Payment is linked
// to it (via its booking's invoice).
export function assertNoNonCancelledPayments(paymentCount: number): void {
  if (paymentCount > 0) {
    throw new AppError(
      409,
      `Cannot cancel this job — ${pluralize(paymentCount, "payment")} linked to it. Cancel the payment(s) first.`,
      { paymentCount },
    );
  }
}
