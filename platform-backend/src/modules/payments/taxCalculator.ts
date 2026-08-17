// Single-plan annual subscription pricing (§ "pricing — single plan for
// now, no tiers"). Figures carried forward from the prior version of this
// system (₹4999/year, GST-inclusive) as a placeholder — this is a real
// business/pricing decision, not an engineering one, and should be
// confirmed or changed before this goes live with real payments.
export interface TaxBreakdown {
  totalAmount: number;
  baseAmount: number;
  gstAmount: number;
  isInterState: boolean;
  cgstAmount: number | null;
  sgstAmount: number | null;
  igstAmount: number | null;
}

const TOTAL_AMOUNT = 4999.0;
const BASE_AMOUNT = 4236.44;
const GST_AMOUNT = 762.56;

export function calculateAnnualTax(isInterState = false): TaxBreakdown {
  if (isInterState) {
    return {
      totalAmount: TOTAL_AMOUNT,
      baseAmount: BASE_AMOUNT,
      gstAmount: GST_AMOUNT,
      isInterState: true,
      cgstAmount: null,
      sgstAmount: null,
      igstAmount: GST_AMOUNT,
    };
  }
  return {
    totalAmount: TOTAL_AMOUNT,
    baseAmount: BASE_AMOUNT,
    gstAmount: GST_AMOUNT,
    isInterState: false,
    cgstAmount: GST_AMOUNT / 2,
    sgstAmount: GST_AMOUNT / 2,
    igstAmount: null,
  };
}
