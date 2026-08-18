// Client-side mirror of backend/src/shared/pricing/pricing-calculator.ts —
// kept identical on purpose so the Live Job screen's running price display
// always agrees with the amount the backend will actually invoice. If one
// side changes, change the other.

export type PricingUnit = "hour" | "minute" | "acre" | null;

export interface CalculateAmountInput {
  unit: PricingUnit;
  rate: number;
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
