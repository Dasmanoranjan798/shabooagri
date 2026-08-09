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

const CURRENCY_MAP: Record<string, { symbol: string; locale: string }> = {
  INR: { symbol: "₹", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "de-DE" },
  GBP: { symbol: "£", locale: "en-GB" },
};

let currentCurrencyCode = "INR";
let currentLogoUrl: string | null = null;
let currentCompanyName = defaultTheme.companyName;

export function setGlobalCurrency(currencyCode?: string | null): void {
  if (currencyCode && typeof currencyCode === "string") {
    currentCurrencyCode = currencyCode.toUpperCase();
  }
}

export function setGlobalCompanyBranding(name?: string | null, logoUrl?: string | null): void {
  if (name) currentCompanyName = name;
  currentLogoUrl = logoUrl ?? null;
}

export function getCompanyLogoUrl(): string | null {
  return currentLogoUrl;
}

export function getCompanyName(): string {
  return currentCompanyName;
}

export function formatCurrency(amount: number, overrideSymbolOrCode?: string): string {
  const code = (overrideSymbolOrCode && CURRENCY_MAP[overrideSymbolOrCode.toUpperCase()])
    ? overrideSymbolOrCode.toUpperCase()
    : currentCurrencyCode;

  const info = CURRENCY_MAP[code] || { symbol: overrideSymbolOrCode || "₹", locale: "en-IN" };

  return `${info.symbol}${Number(amount || 0).toLocaleString(info.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
