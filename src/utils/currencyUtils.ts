/**
 * Currency utility functions for formatting amounts with the correct currency symbol
 */

export type CurrencyCode = "BDT" | "USD" | "EUR" | "GBP" | "INR" | "SAR" | "AED" | "MYR" | "SGD" | "CAD" | "AUD" | "JPY" | "CNY" | "KRW";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", decimals: 2 },
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  { code: "GBP", symbol: "£", name: "British Pound", decimals: 2 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2 },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", decimals: 2 },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", decimals: 2 },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", decimals: 2 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimals: 2 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", decimals: 2 },
  { code: "KRW", symbol: "₩", name: "South Korean Won", decimals: 0 },
];

const CURRENCY_MAP = new Map(SUPPORTED_CURRENCIES.map(c => [c.code, c]));

/**
 * Get the currency info for a given currency code
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  return CURRENCY_MAP.get(currencyCode as CurrencyCode) ?? {
    code: currencyCode as CurrencyCode,
    symbol: currencyCode,
    name: currencyCode,
    decimals: 2,
  };
}

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return getCurrencyInfo(currencyCode).symbol;
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
  const info = getCurrencyInfo(currencyCode);
  const symbol = info.symbol;
  
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
    maximumFractionDigits: options?.maximumFractionDigits ?? info.decimals,
  });

  return `${symbol}${formatted}`;
}

/**
 * Format currency with full decimal precision (for financial displays)
 */
export function formatCurrencyPrecise(amount: number, currencyCode: string = "BDT"): string {
  const info = getCurrencyInfo(currencyCode);
  return formatCurrency(amount, currencyCode, {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  });
}

/**
 * Convert an amount using exchange rate (display-layer only).
 * originalAmount is stored in base currency, exchangeRate converts to display currency.
 */
export function convertAmount(amount: number, exchangeRate: number): number {
  if (!exchangeRate || exchangeRate <= 0) return amount;
  // Use precise decimal math to avoid floating point issues
  return Math.round(amount * exchangeRate * 100) / 100;
}

/**
 * Format an amount with currency conversion applied
 */
export function formatConvertedCurrency(
  amount: number,
  currencyCode: string,
  exchangeRate: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  const converted = convertAmount(amount, exchangeRate);
  return formatCurrency(converted, currencyCode, options);
}
