// §9 Configurable Terminology dictionary & helper.
// Prevents literal hardcoded business terms from scattering through UI components.

export type TermKey = "customer" | "driver" | "machine" | "booking" | "invoice" | "village";

export interface TermDefinition {
  singular: string;
  plural: string;
}

const DEFAULT_TERMS: Record<TermKey, TermDefinition> = {
  customer: { singular: "Customer", plural: "Customers" },
  driver: { singular: "Driver", plural: "Drivers" },
  machine: { singular: "Machine", plural: "Machines" },
  booking: { singular: "Booking", plural: "Bookings" },
  invoice: { singular: "Invoice", plural: "Invoices" },
  village: { singular: "Village", plural: "Villages" },
};

let currentTerms: Record<TermKey, TermDefinition> = { ...DEFAULT_TERMS };

export function getTerm(key: TermKey, plural = false): string {
  const term = currentTerms[key] || DEFAULT_TERMS[key];
  return plural ? term.plural : term.singular;
}

export function setCustomTerms(terms: Partial<Record<TermKey, TermDefinition>>): void {
  currentTerms = { ...currentTerms, ...terms };
}
