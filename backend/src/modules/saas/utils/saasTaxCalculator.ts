export interface SaasTaxBreakdown {
  totalAmount: number; // 4999.00
  baseAmount: number;  // 4236.44
  gstAmount: number;   // 762.56
  isInterState: boolean;
  cgstAmount: number | null; // 381.28 if intra-state
  sgstAmount: number | null; // 381.28 if intra-state
  igstAmount: number | null; // 762.56 if inter-state
}

export function calculateSaasAnnualTax(isInterState = false): SaasTaxBreakdown {
  const totalAmount = 4999.0;
  const baseAmount = 4236.44;
  const gstAmount = 762.56;

  if (isInterState) {
    return {
      totalAmount,
      baseAmount,
      gstAmount,
      isInterState: true,
      cgstAmount: null,
      sgstAmount: null,
      igstAmount: 762.56,
    };
  }

  return {
    totalAmount,
    baseAmount,
    gstAmount,
    isInterState: false,
    cgstAmount: 381.28,
    sgstAmount: 381.28,
    igstAmount: null,
  };
}
