// §10 White-Label Theme Configuration.
// Centralizes branding tokens so company themes can be swapped without component edits.

export interface ThemeConfig {
  companyName: string;
  brandSubtext: string;
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
  currencySymbol: string;
}

export const defaultTheme: ThemeConfig = {
  companyName: "ShabooAgri",
  brandSubtext: "A Shaboo Product",
  primaryColor: "#1B7A3E",
  primaryDarkColor: "#13582C",
  accentColor: "#2ECC71",
  currencySymbol: "₹",
};

export function formatCurrency(amount: number, symbol = defaultTheme.currencySymbol): string {
  return `${symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
