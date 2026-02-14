import { useCallback } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import {
  formatCurrency,
  formatCurrencyPrecise,
  convertAmount,
  getCurrencySymbol,
  type CurrencyCode,
} from "@/utils/currencyUtils";

/**
 * Hook that provides company-level currency formatting.
 * All monetary display should use this hook for consistent formatting.
 * 
 * Conversion happens at the display layer only — DB stores original amounts.
 */
export function useCompanyCurrency() {
  const { activeCompany } = useCompany();

  const currencyCode = activeCompany?.currency || "BDT";
  const exchangeRate = activeCompany?.exchange_rate ?? 1;
  const symbol = getCurrencySymbol(currencyCode);

  /** Format amount with conversion + currency symbol. 
   *  Accepts optional second arg as currency string (ignored, for backwards compat) or options object. */
  const fc = useCallback(
    (amount: number, currencyOrOptions?: string | { compact?: boolean }) => {
      const converted = convertAmount(amount, exchangeRate);
      const opts = typeof currencyOrOptions === "object" ? currencyOrOptions : undefined;
      return formatCurrency(converted, currencyCode, opts);
    },
    [currencyCode, exchangeRate]
  );

  /** Format with full decimal precision */
  const fcp = useCallback(
    (amount: number, _currency?: string) => {
      const converted = convertAmount(amount, exchangeRate);
      return formatCurrencyPrecise(converted, currencyCode);
    },
    [currencyCode, exchangeRate]
  );

  /** Convert amount without formatting (for calculations) */
  const convert = useCallback(
    (amount: number) => convertAmount(amount, exchangeRate),
    [exchangeRate]
  );

  return {
    currencyCode: currencyCode as CurrencyCode,
    exchangeRate,
    symbol,
    /** Format with currency symbol (e.g. ৳1,000) */
    fc,
    /** Format precise with decimals (e.g. $1,000.00) */
    fcp,
    /** Convert amount only (no formatting) */
    convert,
  };
}
