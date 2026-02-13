import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

export type ExpenseWithAccount = Expense & {
  expense_accounts: { name: string; color: string } | null;
};

export function useExpenses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_accounts(name, color)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as ExpenseWithAccount[];
    },
    enabled: !!user,
  });
}

export function useCreateExpense() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<ExpenseInsert, "user_id" | "company_id">) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, user_id: user.id, company_id: activeCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export type AccountBalance = {
  id: string;
  name: string;
  color: string;
  allocation_percentage: number;
  expected_monthly_expense: number | null;
  is_active: boolean;
  total_allocated: number;
  total_spent: number;
  balance: number;
};

export function useAccountBalances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["account_balances"],
    queryFn: async () => {
      if (!user) return [];

      const { data: accounts, error: accountsError } = await supabase
        .from("expense_accounts")
        .select("*");
      if (accountsError) throw accountsError;

      const { data: allocations, error: allocationsError } = await supabase
        .from("allocations")
        .select("expense_account_id, amount");
      if (allocationsError) throw allocationsError;

      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("expense_account_id, amount");
      if (expensesError) throw expensesError;

      const { data: transfers, error: transfersError } = await supabase
        .from("khata_transfers")
        .select("from_account_id, to_account_id, amount");
      if (transfersError) throw transfersError;

      const balances: AccountBalance[] = accounts.map((account) => {
        const totalAllocated = allocations
          .filter((a) => a.expense_account_id === account.id)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const totalSpent = expenses
          .filter((e) => e.expense_account_id === account.id)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const transfersIn = (transfers ?? [])
          .filter((t) => t.to_account_id === account.id)
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const transfersOut = (transfers ?? [])
          .filter((t) => t.from_account_id === account.id)
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          id: account.id,
          name: account.name,
          color: account.color,
          allocation_percentage: account.allocation_percentage,
          expected_monthly_expense: account.expected_monthly_expense,
          is_active: account.is_active,
          total_allocated: totalAllocated + transfersIn,
          total_spent: totalSpent + transfersOut,
          balance: totalAllocated + transfersIn - totalSpent - transfersOut,
        };
      });

      return balances;
    },
    enabled: !!user,
  });
}

export function useExpenseSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expense_summary"],
    queryFn: async () => {
      if (!user) return { thisMonth: 0, thisYear: 0, total: 0 };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("expenses")
        .select("amount, date");
      if (error) throw error;

      const thisMonth = data
        .filter((e) => e.date >= startOfMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const thisYear = data
        .filter((e) => e.date >= startOfYear)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const total = data.reduce((sum, e) => sum + Number(e.amount), 0);

      return { thisMonth, thisYear, total };
    },
    enabled: !!user,
  });
}
