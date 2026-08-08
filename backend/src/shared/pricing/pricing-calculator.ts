// §8.2: the entire pricing configuration is data (pricing_methods.unit), not
// application logic. This is the ONLY place (unit, rate, quantity) turns into
// an amount — Booking's estimated-amount display and, later, Invoice's final
// amount both call this rather than each reimplementing the multiplication.

export type PricingUnit = "hour" | "minute" | "acre" | null;

export interface CalculateAmountInput {
  // pricing_methods.unit for the method being applied. null covers the
  // flat-rate methods (per_job, minimum_charge, custom) where rate IS the
  // amount, independent of any worked quantity.
  unit: PricingUnit;
  rate: number;
  // Required whenever unit is not null (hours/minutes/acres worked or
  // estimated). Ignored for flat-rate methods.
  quantity: number | null;
}

export function calculateAmount({ unit, rate, quantity }: CalculateAmountInput): number {
  if (unit === null) {
    return round2(rate);
  }
  if (quantity === null) {
    throw new Error(`A quantity is required to price a "${unit}" pricing method`);
  }
  return round2(rate * quantity);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
