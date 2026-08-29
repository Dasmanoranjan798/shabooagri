// §8.2: the entire pricing configuration is data (pricing_methods.unit), not
// application logic. This is the ONLY place (unit, rate, quantity) turns into
// an amount — Booking's estimated-amount display and, later, Invoice's final
// amount both call this rather than each reimplementing the multiplication.

export type PricingUnit = "hour" | "minute" | "acre" | null;

export interface CalculateAmountInput {
  // pricing_methods.unit for the method being applied. null covers the
  // flat-rate methods (per_job, custom) where rate IS the amount, independent
  // of any worked quantity.
  unit: PricingUnit;
  rate: number;
  // Required whenever unit is not null (hours/minutes/acres worked or
  // estimated). Ignored for flat-rate methods.
  quantity: number | null;
  // §8.2 "Minimum Charge": optional minimum billable floor. When set (> 0) the
  // returned amount is never below it — final = max(metered amount, minimumCharge).
  // Null/undefined/0 means no floor. This is the ONE place the floor is applied
  // so Booking estimate and Invoice never disagree.
  minimumCharge?: number | null;
}

export function calculateAmount({ unit, rate, quantity, minimumCharge }: CalculateAmountInput): number {
  const base = computeBase(unit, rate, quantity);
  // Apply the floor only when a positive minimum is provided; max() with a
  // zero/absent floor is a no-op, so a normal (non-minimum) booking is unchanged.
  const floor = minimumCharge != null && minimumCharge > 0 ? minimumCharge : 0;
  return round2(Math.max(base, floor));
}

function computeBase(unit: PricingUnit, rate: number, quantity: number | null): number {
  if (unit === null) {
    return rate;
  }
  if (quantity === null) {
    throw new Error(`A quantity is required to price a "${unit}" pricing method`);
  }
  return rate * quantity;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
