import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_accounts(name, color)")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as ExpenseWithAccount[];
    },
    enabled: !!user,
  });
}

export function useCreateExpense() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<ExpenseInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["account_balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    },
  });
}

export function useUpdateExpense() {
  const { user } = useAuth();
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
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["account_balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    },
  });
}

export function useDeleteExpense() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["account_balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
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
    queryKey: ["account_balances", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from("expense_accounts")
        .select("*")
        .eq("user_id", user.id);
      if (accountsError) throw accountsError;

      // Get all allocations
      const { data: allocations, error: allocationsError } = await supabase
        .from("allocations")
        .select("expense_account_id, amount")
        .eq("user_id", user.id);
      if (allocationsError) throw allocationsError;

      // Get all expenses
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("expense_account_id, amount")
        .eq("user_id", user.id);
      if (expensesError) throw expensesError;

      // Get all khata transfers
      const { data: transfers, error: transfersError } = await supabase
        .from("khata_transfers")
        .select("from_account_id, to_account_id, amount")
        .eq("user_id", user.id);
      if (transfersError) throw transfersError;

      // Calculate balances per account
      const balances: AccountBalance[] = accounts.map((account) => {
        const totalAllocated = allocations
          .filter((a) => a.expense_account_id === account.id)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const totalSpent = expenses
          .filter((e) => e.expense_account_id === account.id)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        // Add incoming transfers to allocated, outgoing transfers to spent
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
    queryKey: ["expense_summary", user?.id],
    queryFn: async () => {
      if (!user) return { thisMonth: 0, thisYear: 0, total: 0 };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("expenses")
        .select("amount, date")
        .eq("user_id", user.id);
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
