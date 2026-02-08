/**
 * Currency utility functions for formatting amounts with the correct currency symbol
 */

export type CurrencyCode = "BDT" | "USD" | "EUR" | "GBP";

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode as CurrencyCode] || currencyCode;
}

/**
 * Format an amount with the currency symbol
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "BDT",
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  const symbol = getCurrencySymbol(currencyCode);
  
  if (options?.compact) {
    if (amount >= 1000000) {
      return `${symbol}${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(0)}K`;
    }
    return `${symbol}${amount}`;
  }

  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });

  return `${symbol}${formatted}`;
}

/**
 * Format currency with 2 decimal places (for financial displays)
 */
export function formatCurrencyPrecise(amount: number, currencyCode: string = "BDT"): string {
  return formatCurrency(amount, currencyCode, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
