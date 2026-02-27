import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Investment, Loan, FundedExpense } from "@/types/stakeholders";

/** Investments with remaining_unallocated > 0 for funding expenses */
export function useFundableInvestments() {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["fundable-investments", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*, stakeholders(name)")
        .eq("company_id", activeCompanyId!)
        .eq("receipt_status", "received")
        .eq("status", "active")
        .gt("remaining_unallocated", 0)
        .order("investment_date", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        stakeholder_name: d.stakeholders?.name || "Unknown",
      })) as (Investment & { stakeholder_name: string })[];
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}

/** Loans with remaining_unallocated > 0 for funding expenses */
export function useFundableLoans() {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["fundable-loans", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("*, stakeholders(name)")
        .eq("company_id", activeCompanyId!)
        .eq("disbursement_status", "disbursed")
        .in("status", ["active", "overdue", "restructured"])
        .gt("remaining_unallocated", 0)
        .order("loan_date", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        stakeholder_name: d.stakeholders?.name || "Unknown",
      })) as (Loan & { stakeholder_name: string })[];
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}

/** Expenses funded by a specific investment or loan */
export function useFundedExpenses(fundType?: "investment" | "loan", fundId?: string) {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["funded-expenses", activeCompanyId, fundType, fundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_accounts(name, color)")
        .eq("company_id", activeCompanyId!)
        .eq("funded_by_type", fundType!)
        .eq("funded_by_id", fundId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as unknown as FundedExpense[];
    },
    enabled: !!user && !!activeCompanyId && isCipher && !!fundType && !!fundId,
  });
}

/** Fund utilization summary across all investments and loans */
export function useFundUtilizationSummary() {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["fund-utilization-summary", activeCompanyId],
    queryFn: async () => {
      const [investmentsRes, loansRes] = await Promise.all([
        supabase
          .from("investments")
          .select("id, investment_amount, received_amount, allocated_to_expenses, remaining_unallocated, receipt_status, stakeholder_id, stakeholders(name)")
          .eq("company_id", activeCompanyId!)
          .eq("status", "active")
          .eq("receipt_status", "received"),
        supabase
          .from("loans")
          .select("id, loan_amount, net_disbursed_amount, allocated_to_expenses, remaining_unallocated, disbursement_status, stakeholder_id, stakeholders(name), stated_purpose, purpose_compliant")
          .eq("company_id", activeCompanyId!)
          .in("status", ["active", "overdue", "restructured"])
          .eq("disbursement_status", "disbursed"),
      ]);

      if (investmentsRes.error) throw investmentsRes.error;
      if (loansRes.error) throw loansRes.error;

      const investments = (investmentsRes.data || []) as any[];
      const loans = (loansRes.data || []) as any[];

      const totalInvReceived = investments.reduce((s, i) => s + (Number(i.received_amount) || Number(i.investment_amount)), 0);
      const totalInvAllocated = investments.reduce((s, i) => s + (Number(i.allocated_to_expenses) || 0), 0);
      const totalLoanReceived = loans.reduce((s, l) => s + (Number(l.net_disbursed_amount) || Number(l.loan_amount)), 0);
      const totalLoanAllocated = loans.reduce((s, l) => s + (Number(l.allocated_to_expenses) || 0), 0);

      return {
        totalReceived: totalInvReceived + totalLoanReceived,
        totalAllocated: totalInvAllocated + totalLoanAllocated,
        totalUnallocated: (totalInvReceived + totalLoanReceived) - (totalInvAllocated + totalLoanAllocated),
        investmentFunds: { received: totalInvReceived, allocated: totalInvAllocated, remaining: totalInvReceived - totalInvAllocated },
        loanFunds: { received: totalLoanReceived, allocated: totalLoanAllocated, remaining: totalLoanReceived - totalLoanAllocated },
        individualFunds: [
          ...investments.map((i: any) => ({
            id: i.id,
            type: "investment" as const,
            name: i.stakeholders?.name || "Unknown",
            received: Number(i.received_amount) || Number(i.investment_amount),
            spent: Number(i.allocated_to_expenses) || 0,
            remaining: Number(i.remaining_unallocated) || 0,
          })),
          ...loans.map((l: any) => ({
            id: l.id,
            type: "loan" as const,
            name: l.stakeholders?.name || "Unknown",
            received: Number(l.net_disbursed_amount) || Number(l.loan_amount),
            spent: Number(l.allocated_to_expenses) || 0,
            remaining: Number(l.remaining_unallocated) || 0,
          })),
        ],
      };
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}
