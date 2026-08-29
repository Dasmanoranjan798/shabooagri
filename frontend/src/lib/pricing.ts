// Client-side mirror of backend/src/shared/pricing/pricing-calculator.ts —
// kept identical on purpose so the Live Job screen's running price display
// always agrees with the amount the backend will actually invoice. If one
// side changes, change the other.

export type PricingUnit = "hour" | "minute" | "acre" | null;

export interface CalculateAmountInput {
  unit: PricingUnit;
  rate: number;
  quantity: number | null;
  // §8.2 minimum billable floor: final = max(metered, minimumCharge). Null/0 = none.
  minimumCharge?: number | null;
}

export function calculateAmount({ unit, rate, quantity, minimumCharge }: CalculateAmountInput): number {
  const base = computeBase(unit, rate, quantity);
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
