import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export type RevenueSummaryRow = {
  source_id: string | null;
  source_name: string;
  month: string;
  total_amount: number;
  entry_count: number;
};

export type ExpenseSummaryRow = {
  expense_account_id: string | null;
  account_name: string;
  account_color: string;
  month: string;
  total_amount: number;
  entry_count: number;
};

export function useRevenueSummaryRPC(startDate: string | null, endDate: string | null) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["revenue_summary_rpc", activeCompanyId, startDate, endDate],
    queryFn: async () => {
      if (!user || !activeCompanyId || !startDate || !endDate) return [];
      const { data, error } = await supabase.rpc("get_revenue_summary", {
        _company_id: activeCompanyId,
        _start_date: startDate,
        _end_date: endDate,
      });
      if (error) throw error;
      return (data || []) as RevenueSummaryRow[];
    },
    enabled: !!user && !!activeCompanyId && !!startDate && !!endDate,
  });
}

export function useExpenseSummaryRPC(startDate: string | null, endDate: string | null) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["expense_summary_rpc", activeCompanyId, startDate, endDate],
    queryFn: async () => {
      if (!user || !activeCompanyId || !startDate || !endDate) return [];
      const { data, error } = await supabase.rpc("get_expense_summary", {
        _company_id: activeCompanyId,
        _start_date: startDate,
        _end_date: endDate,
      });
      if (error) throw error;
      return (data || []) as ExpenseSummaryRow[];
    },
    enabled: !!user && !!activeCompanyId && !!startDate && !!endDate,
  });
}
