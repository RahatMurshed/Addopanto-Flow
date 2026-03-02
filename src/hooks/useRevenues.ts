import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Revenue = Tables<"revenues">;
export type RevenueInsert = TablesInsert<"revenues">;
export type RevenueUpdate = TablesUpdate<"revenues">;

export type RevenueWithSource = Revenue & {
  revenue_sources: { name: string } | null;
};

const PAGE_SIZE = 100;

async function fetchAllRevenuePages(activeCompanyId: string): Promise<RevenueWithSource[]> {
  const allData: RevenueWithSource[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("revenues")
      .select("*, revenue_sources(name)")
      .eq("company_id", activeCompanyId)
      .order("date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    allData.push(...(data as RevenueWithSource[]));
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}

export function useRevenues() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["revenues", activeCompanyId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      return fetchAllRevenuePages(activeCompanyId);
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useCreateRevenue() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (revenue: Omit<RevenueInsert, "user_id" | "company_id">) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");

      const { data: revenueData, error: revenueError } = await supabase
        .from("revenues")
        .insert({ ...revenue, user_id: user.id, company_id: activeCompanyId })
        .select()
        .single();
      if (revenueError) throw revenueError;

      const { data: accounts, error: accountsError } = await supabase
        .from("expense_accounts")
        .select("id, allocation_percentage")
        .eq("is_active", true)
        .eq("company_id", activeCompanyId);
      if (accountsError) throw accountsError;

      if (accounts && accounts.length > 0) {
        const allocations = accounts
          .filter((acc) => acc.allocation_percentage > 0)
          .map((acc) => ({
            user_id: user.id,
            company_id: activeCompanyId,
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-totals"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary_rpc"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
    },
  });
}

export function useUpdateRevenue() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: RevenueUpdate & { id: string }) => {
      const { data: oldRevenue, error: fetchError } = await supabase
        .from("revenues")
        .select("amount")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("revenues")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (updates.amount !== undefined && updates.amount !== oldRevenue.amount) {
        const { data: existingAllocations } = await supabase
          .from("allocations")
          .select("id, amount")
          .eq("revenue_id", id);

        if (existingAllocations && existingAllocations.length > 0) {
          await supabase.from("allocations").delete().eq("revenue_id", id);

          const { data: accounts } = await supabase
            .from("expense_accounts")
            .select("id, allocation_percentage")
            .eq("is_active", true)
            .eq("company_id", activeCompanyId!);

          if (accounts && accounts.length > 0) {
            const newAllocations = accounts
              .filter((acc) => acc.allocation_percentage > 0)
              .map((acc) => ({
                user_id: user!.id,
                company_id: activeCompanyId!,
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-totals"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary_rpc"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
    },
  });
}

export function useDeleteRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Issue 1.5: Revert linked student payment to unpaid before deleting revenue
      const { data: revenue } = await supabase
        .from("revenues")
        .select("student_payment_id")
        .eq("id", id)
        .single();

      if (revenue?.student_payment_id) {
        await supabase
          .from("student_payments")
          .update({ status: "unpaid" } as any)
          .eq("id", revenue.student_payment_id);
      }

      const { error } = await supabase.from("revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-totals"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary_rpc"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
    },
  });
}

export function useRevenueSummary() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["revenue_summary", activeCompanyId],
    queryFn: async () => {
      if (!user) return { thisMonth: 0, thisYear: 0, total: 0 };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

      if (!activeCompanyId) return { thisMonth: 0, thisYear: 0, total: 0 };

      // Use paginated fetch to avoid 1000-row limit
      const data = await fetchAllRevenuePages(activeCompanyId);

      const thisMonth = data
        .filter((r) => r.date >= startOfMonth)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const thisYear = data
        .filter((r) => r.date >= startOfYear)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const total = data.reduce((sum, r) => sum + Number(r.amount), 0);

      return { thisMonth, thisYear, total };
    },
    enabled: !!user && !!activeCompanyId,
  });
}
