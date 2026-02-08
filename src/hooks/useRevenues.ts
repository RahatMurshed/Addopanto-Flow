import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Revenue = Tables<"revenues">;
export type RevenueInsert = TablesInsert<"revenues">;
export type RevenueUpdate = TablesUpdate<"revenues">;

export type RevenueWithSource = Revenue & {
  revenue_sources: { name: string } | null;
};

export function useRevenues() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenues"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenues")
        .select("*, revenue_sources(name)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as RevenueWithSource[];
    },
    enabled: !!user,
  });
}

export function useCreateRevenue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (revenue: Omit<RevenueInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");

      // Insert revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from("revenues")
        .insert({ ...revenue, user_id: user.id })
        .select()
        .single();
      if (revenueError) throw revenueError;

      // Get active expense accounts (global - all accounts)
      const { data: accounts, error: accountsError } = await supabase
        .from("expense_accounts")
        .select("id, allocation_percentage")
        .eq("is_active", true);
      if (accountsError) throw accountsError;

      // Create allocations for each active account
      if (accounts && accounts.length > 0) {
        const allocations = accounts
          .filter((acc) => acc.allocation_percentage > 0)
          .map((acc) => ({
            user_id: user.id,
            revenue_id: revenueData.id,
            expense_account_id: acc.id,
            amount: (revenueData.amount * acc.allocation_percentage) / 100,
          }));

        if (allocations.length > 0) {
          const { error: allocError } = await supabase.from("allocations").insert(allocations);
          if (allocError) throw allocError;
        }
      }

      return revenueData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}

export function useUpdateRevenue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: RevenueUpdate & { id: string }) => {
      // Get old revenue amount
      const { data: oldRevenue, error: fetchError } = await supabase
        .from("revenues")
        .select("amount")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      // Update revenue
      const { data, error } = await supabase
        .from("revenues")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // If amount changed, update allocations proportionally
      if (updates.amount !== undefined && updates.amount !== oldRevenue.amount) {
        const ratio = updates.amount / oldRevenue.amount;

        // Get existing allocations for this revenue
        const { data: existingAllocations } = await supabase
          .from("allocations")
          .select("id, amount")
          .eq("revenue_id", id);

        if (existingAllocations && existingAllocations.length > 0) {
          // Delete old allocations and recreate with new amounts
          await supabase.from("allocations").delete().eq("revenue_id", id);

          // Get active accounts and recalculate (global - all accounts)
          const { data: accounts } = await supabase
            .from("expense_accounts")
            .select("id, allocation_percentage")
            .eq("is_active", true);

          if (accounts && accounts.length > 0) {
            const newAllocations = accounts
              .filter((acc) => acc.allocation_percentage > 0)
              .map((acc) => ({
                user_id: user!.id,
                revenue_id: id,
                expense_account_id: acc.id,
                amount: (updates.amount! * acc.allocation_percentage) / 100,
              }));

            if (newAllocations.length > 0) {
              await supabase.from("allocations").insert(newAllocations);
            }
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}

export function useDeleteRevenue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Allocations will be deleted automatically via CASCADE
      const { error } = await supabase.from("revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}

export function useRevenueSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue_summary"],
    queryFn: async () => {
      if (!user) return { thisMonth: 0, thisYear: 0, total: 0 };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("revenues")
        .select("amount, date");
      if (error) throw error;

      const thisMonth = data
        .filter((r) => r.date >= startOfMonth)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const thisYear = data
        .filter((r) => r.date >= startOfYear)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const total = data.reduce((sum, r) => sum + Number(r.amount), 0);

      return { thisMonth, thisYear, total };
    },
    enabled: !!user,
  });
}
