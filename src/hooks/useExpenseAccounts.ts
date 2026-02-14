import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ExpenseAccount = Tables<"expense_accounts">;
export type ExpenseAccountInsert = TablesInsert<"expense_accounts">;
export type ExpenseAccountUpdate = TablesUpdate<"expense_accounts">;

export function useExpenseAccounts() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["expense_accounts", activeCompanyId],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expense_accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ExpenseAccount[];
    },
    enabled: !!user,
  });
}

export function useCreateExpenseAccount() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Omit<ExpenseAccountInsert, "user_id" | "company_id">) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("expense_accounts")
        .insert({ ...account, user_id: user.id, company_id: activeCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_accounts"] });
    },
  });
}

export function useUpdateExpenseAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseAccountUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("expense_accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_accounts"] });
    },
  });
}

export function useDeleteExpenseAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_accounts"] });
    },
  });
}

export function useCreateDefaultAccounts() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const defaultAccounts = [
    { name: "Marketing", allocation_percentage: 15, color: "#8B5CF6" },
    { name: "Salary", allocation_percentage: 30, color: "#10B981" },
    { name: "Rent", allocation_percentage: 20, color: "#F59E0B" },
    { name: "Office Supplies", allocation_percentage: 10, color: "#3B82F6" },
    { name: "Tax Reserve", allocation_percentage: 15, color: "#EF4444" },
    { name: "Emergency Fund", allocation_percentage: 10, color: "#6366F1" },
  ];

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { error } = await supabase.from("expense_accounts").insert(
        defaultAccounts.map((acc) => ({ ...acc, user_id: user.id, company_id: activeCompanyId }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_accounts"] });
    },
  });
}
