// Generic GST-inclusive tax split — used for both a plan's annual price
// and the flat extra-machine add-on. Standard 18% GST inclusive: the
// listed price IS what the customer pays; base/gst are backed out of it,
// not added on top.
export interface TaxBreakdown {
  totalAmount: number;
  baseAmount: number;
  gstAmount: number;
  isInterState: boolean;
  cgstAmount: number | null;
  sgstAmount: number | null;
  igstAmount: number | null;
}

const GST_RATE = 0.18;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateTax(totalAmount: number, isInterState = false): TaxBreakdown {
  const baseAmount = round2(totalAmount / (1 + GST_RATE));
  const gstAmount = round2(totalAmount - baseAmount);

  if (isInterState) {
    return {
      totalAmount,
      baseAmount,
      gstAmount,
      isInterState: true,
      cgstAmount: null,
      sgstAmount: null,
      igstAmount: gstAmount,
    };
  }
  const cgstAmount = round2(gstAmount / 2);
  return {
    totalAmount,
    baseAmount,
    gstAmount,
    isInterState: false,
    cgstAmount,
    sgstAmount: round2(gstAmount - cgstAmount),
    igstAmount: null,
  };
}
